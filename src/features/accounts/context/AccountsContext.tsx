import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { getBalances, pickLatestBalance, type Account } from "../../../services/enableBanking";
import { roundCents } from "../../../shared/utils/number";

export type AccountCategory = "Giro" | "Savings" | "Stock";

export interface ManualAccount {
  id: string;
  name: string;
  balance: number;
  category: AccountCategory;
  currency: string;
  bankName?: string;
}

export interface StoredSession {
  sessionId: string;
  bankName: string;
  bankCountry: string;
  accounts: Account[];
  connectedAt: string;
}

export interface UnifiedAccount {
  id: string;
  type: "connected" | "manual";
  name: string;
  category: AccountCategory;
  balance: number;
  currency: string;
  bankName: string;
  account?: Account; // Only for connected
  loading?: boolean;
  error?: string;
  iban?: string;
}

// Keys
const SESSIONS_KEY = "enablebanking_sessions";
const CASH_KEY = "user_cash_balance";
const MANUAL_ACCOUNTS_KEY = "manual_accounts";
const ACCOUNT_METADATA_KEY = "account_metadata";
const CACHED_ACCOUNTS_KEY = "cached_unified_accounts"; // processed list, for instant render

export const CASH_ACCOUNT_ID = "cash_at_hand";
/** Name the cash account is created with (shown localized, see accountDisplayName). */
export const DEFAULT_CASH_ACCOUNT_NAME = "Cash at Hand";

interface AccountsContextType {
  accounts: UnifiedAccount[];
  cashBalance: number;
  isLoading: boolean;
  isRefreshing: boolean;
  refreshAccounts: (showRefreshIndicator?: boolean) => Promise<void>;
  updateCashBalance: (amount: number) => Promise<void>;
  addManualAccount: (account: ManualAccount) => Promise<void>;
  deleteManualAccount: (id: string) => Promise<void>;
  updateAccount: (account: UnifiedAccount) => Promise<void>;
  /**
   * Add `diff` to a manual account's balance (rounded to cents). Reads the
   * stored balance as the source of truth so back-to-back calls compose.
   */
  adjustManualBalance: (accountId: string, diff: number) => Promise<void>;
  /** Connected Enable Banking sessions (owned here, persisted under SESSIONS_KEY). */
  sessions: StoredSession[];
  /** Add or replace a session and refresh the account list. */
  saveSession: (session: StoredSession) => Promise<void>;
  /** Remove a session and drop its accounts from the list. */
  removeSession: (sessionId: string) => Promise<void>;
}

const AccountsContext = createContext<AccountsContextType | undefined>(
  undefined,
);

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<UnifiedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  // Mirrors `sessions` so back-to-back session mutations compose.
  const sessionsRef = useRef<StoredSession[]>([]);

  const cashBalance = useMemo(
    () => accounts.find((a) => a.id === CASH_ACCOUNT_ID)?.balance ?? 0,
    [accounts],
  );

  // Load initial data from cache/storage
  useEffect(() => {
    loadInitialData();
    // Mount-only bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      // Migration: convert old cashBalance to a real manual account
      const storedCash = await AsyncStorage.getItem(CASH_KEY);
      const manualData = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
      let manualAccounts: ManualAccount[] = manualData ? JSON.parse(manualData) : [];
      if (!manualAccounts.some((a) => a.id === CASH_ACCOUNT_ID)) {
        const cashBal = storedCash ? parseFloat(storedCash) : 0;
        manualAccounts.push({
          id: CASH_ACCOUNT_ID,
          name: DEFAULT_CASH_ACCOUNT_NAME,
          balance: cashBal,
          category: "Giro",
          currency: "EUR",
        });
        await AsyncStorage.setItem(MANUAL_ACCOUNTS_KEY, JSON.stringify(manualAccounts));
        await AsyncStorage.removeItem(CASH_KEY);
      }

      // Load cached accounts if available for instant render
      const cached = await AsyncStorage.getItem(CACHED_ACCOUNTS_KEY);
      if (cached) {
        setAccounts(JSON.parse(cached));
      }

      // Then trigger a fresh calculation/fetch
      await refreshAccounts(false);
    } catch (e) {
      console.error("Failed to load initial account data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAccounts = async (showRefreshIndicator = true) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      // 1. Fetch Metadata & Sessions & Manual Accounts
      const [sessionsData, manualData, metadataData, cachedData] = await Promise.all([
        AsyncStorage.getItem(SESSIONS_KEY),
        AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY),
        AsyncStorage.getItem(ACCOUNT_METADATA_KEY),
        AsyncStorage.getItem(CACHED_ACCOUNTS_KEY),
      ]);
      // Last known balances, read from storage rather than the `accounts`
      // state: on the initial load that closure is still [] (the cached list
      // was set in the same tick), so a failed balance fetch (offline /
      // backend down) used to wipe connected balances to 0.
      let previousAccounts: UnifiedAccount[] = [];
      try {
        previousAccounts = cachedData ? JSON.parse(cachedData) : [];
      } catch {
        previousAccounts = [];
      }

      const metadata = metadataData ? JSON.parse(metadataData) : {};
      const manualAccounts: ManualAccount[] = manualData
        ? JSON.parse(manualData)
        : [];
      const storedSessions: StoredSession[] = sessionsData
        ? JSON.parse(sessionsData)
        : [];
      sessionsRef.current = storedSessions;
      setSessions(storedSessions);

      const newUnifiedAccounts: UnifiedAccount[] = [];

      // 2. Process Connected Accounts
      // We first create the structure, then fetch balances
      const connectedAccountsParams: UnifiedAccount[] = [];

      for (const session of storedSessions) {
        for (const account of session.accounts) {
          connectedAccountsParams.push({
            id: account.uid,
            type: "connected",
            name: account.name || account.product || "Account",
            category: metadata[account.uid]?.category || "Giro",
            balance: 0, // Will be updated
            currency: account.currency || "EUR",
            bankName: session.bankName,
            account,
            loading: true,
            iban: account.account_id?.iban,
          });
        }
      }

      // 3. Process Manual Accounts
      for (const account of manualAccounts) {
        newUnifiedAccounts.push({
          id: account.id,
          type: "manual",
          name: account.name,
          category: account.category,
          balance: account.balance,
          currency: account.currency,
          bankName: account.bankName || "Manual Account",
          loading: false,
        });
      }

      // 4. Fetch Balances for Connected Accounts in Parallel
      const updatedConnectedAccounts = await Promise.all(
        connectedAccountsParams.map(async (item) => {
          if (item.account) {
            try {
              const balanceData = await getBalances(item.account.uid);
              const mainBalance = pickLatestBalance(balanceData.balances);
              if (!mainBalance) {
                return { ...item, loading: false };
              }

              return {
                ...item,
                balance: parseFloat(mainBalance.balance_amount.amount),
                currency: mainBalance.balance_amount.currency,
                loading: false,
              };
            } catch (err) {
              console.error(`Failed to fetch balance for ${item.id}:`, err);

              // Fall back to the last known balance. No error flag in that
              // case: the UI hides the balance of errored accounts, and a
              // stale balance is more useful than none.
              const existingAccount = previousAccounts.find((a) => a.id === item.id);
              if (existingAccount) {
                return {
                  ...item,
                  balance: existingAccount.balance,
                  currency: existingAccount.currency,
                  loading: false,
                  error: undefined,
                };
              }

              return {
                ...item,
                loading: false,
                error: err instanceof Error && err.message ? err.message : "Failed",
              };
            }
          }
          return item;
        }),
      );

      // Combine
      const finalAccounts = [
        ...updatedConnectedAccounts,
        ...newUnifiedAccounts,
      ];
      setAccounts(finalAccounts);

      // Cache result
      await AsyncStorage.setItem(
        CACHED_ACCOUNTS_KEY,
        JSON.stringify(finalAccounts),
      );
    } catch (e) {
      console.error("Failed to refresh accounts:", e);
    } finally {
      if (showRefreshIndicator) setIsRefreshing(false);
    }
  };

  const updateCashBalance = async (amount: number) => {
    setAccounts((prev) => {
      const next = prev.map((a) =>
        a.id === CASH_ACCOUNT_ID ? { ...a, balance: amount } : a,
      );
      AsyncStorage.setItem(CACHED_ACCOUNTS_KEY, JSON.stringify(next)).catch(
        console.error,
      );
      return next;
    });
    try {
      const manualData = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
      if (manualData) {
        const manuals: ManualAccount[] = JSON.parse(manualData);
        const updated = manuals.map((a) =>
          a.id === CASH_ACCOUNT_ID ? { ...a, balance: amount } : a,
        );
        await AsyncStorage.setItem(
          MANUAL_ACCOUNTS_KEY,
          JSON.stringify(updated),
        );
      }
    } catch (e) {
      console.error("Failed to update cash account balance:", e);
    }
  };

  const addManualAccount = async (account: ManualAccount) => {
    try {
      const stored = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
      const current = stored ? JSON.parse(stored) : [];
      const updated = [...current, account];
      await AsyncStorage.setItem(MANUAL_ACCOUNTS_KEY, JSON.stringify(updated));

      // Update the local state instead of doing a full network refresh
      const unifiedAccount: UnifiedAccount = {
        id: account.id,
        type: "manual",
        name: account.name,
        category: account.category,
        balance: account.balance,
        currency: account.currency,
        bankName: account.bankName || "Manual Account",
        loading: false,
      };

      setAccounts((prev) => {
        const newAccounts = [...prev, unifiedAccount];
        AsyncStorage.setItem(CACHED_ACCOUNTS_KEY, JSON.stringify(newAccounts)).catch(console.error);
        return newAccounts;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteManualAccount = async (id: string) => {
    try {
      const stored = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
      if (stored) {
        const current: ManualAccount[] = JSON.parse(stored);
        const updated = current.filter((acc) => acc.id !== id);
        await AsyncStorage.setItem(
          MANUAL_ACCOUNTS_KEY,
          JSON.stringify(updated),
        );

        // The account's transactions, categories, links and statements live
        // in other contexts; useAccountTransactions().handleDeleteAccount
        // purges them before calling this.
        // Update the local state instead of doing a full network refresh
        setAccounts((prev) => {
          const newAccounts = prev.filter((acc) => acc.id !== id);
          AsyncStorage.setItem(CACHED_ACCOUNTS_KEY, JSON.stringify(newAccounts)).catch(console.error);
          return newAccounts;
        });
      }
    } catch (e) {
      console.error("Failed to delete manual account:", e);
    }
  };

  const updateAccount = async (updatedAccount: UnifiedAccount) => {
    try {
      const stored = await AsyncStorage.getItem(CACHED_ACCOUNTS_KEY);
      let currentAccounts: UnifiedAccount[] = stored
        ? JSON.parse(stored)
        : accounts;

      const newAccounts = currentAccounts.map((acc) =>
        acc.id === updatedAccount.id ? updatedAccount : acc,
      );

      setAccounts((prev) =>
        prev.map((acc) => (acc.id === updatedAccount.id ? updatedAccount : acc)),
      );
      await AsyncStorage.setItem(
        CACHED_ACCOUNTS_KEY,
        JSON.stringify(newAccounts),
      );

      // Persist user-editable fields to their source of truth as well —
      // refreshAccounts() rebuilds the list from manual_accounts /
      // account_metadata, so cache-only changes were lost on the next refresh.
      if (updatedAccount.type === "manual") {
        const manualData = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
        if (manualData) {
          const manuals: ManualAccount[] = JSON.parse(manualData);
          const nextManuals = manuals.map((a) =>
            a.id === updatedAccount.id
              ? {
                  ...a,
                  name: updatedAccount.name,
                  category: updatedAccount.category,
                  balance: updatedAccount.balance,
                  currency: updatedAccount.currency || a.currency,
                }
              : a,
          );
          await AsyncStorage.setItem(MANUAL_ACCOUNTS_KEY, JSON.stringify(nextManuals));
        }
      } else if (updatedAccount.category) {
        const metaData = await AsyncStorage.getItem(ACCOUNT_METADATA_KEY);
        const meta = metaData ? JSON.parse(metaData) : {};
        if (meta[updatedAccount.id]?.category !== updatedAccount.category) {
          meta[updatedAccount.id] = {
            ...meta[updatedAccount.id],
            category: updatedAccount.category,
          };
          await AsyncStorage.setItem(ACCOUNT_METADATA_KEY, JSON.stringify(meta));
        }
      }
    } catch (e) {
      console.error("Failed to update account:", e);
    }
  };

  const adjustManualBalance = async (accountId: string, diff: number) => {
    try {
      const manualData = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
      if (!manualData) return;
      const manuals: ManualAccount[] = JSON.parse(manualData);
      let nextBalance: number | null = null;
      const updated = manuals.map((a) => {
        if (a.id !== accountId) return a;
        nextBalance = roundCents((Number(a.balance) || 0) + diff);
        return { ...a, balance: nextBalance };
      });
      if (nextBalance === null) return;
      const balance: number = nextBalance;
      await AsyncStorage.setItem(MANUAL_ACCOUNTS_KEY, JSON.stringify(updated));
      setAccounts((prev) => {
        const next = prev.map((a) => (a.id === accountId ? { ...a, balance } : a));
        AsyncStorage.setItem(CACHED_ACCOUNTS_KEY, JSON.stringify(next)).catch(console.error);
        return next;
      });
    } catch (e) {
      console.error("Failed to adjust account balance:", e);
    }
  };

  const persistSessions = useCallback(async (next: StoredSession[]) => {
    sessionsRef.current = next;
    setSessions(next);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
  }, []);

  const saveSession = async (session: StoredSession) => {
    // Read storage, not state: on a cold start the auth code can arrive
    // before the initial load finished, and a stale [] would overwrite every
    // previously connected bank.
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    const existing: StoredSession[] = raw ? JSON.parse(raw) : sessionsRef.current;
    await persistSessions([
      ...existing.filter((s) => s.sessionId !== session.sessionId),
      session,
    ]);
    // Not awaited: balances load in the background.
    void refreshAccounts(false);
  };

  const removeSession = async (sessionId: string) => {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    const existing: StoredSession[] = raw ? JSON.parse(raw) : sessionsRef.current;
    await persistSessions(existing.filter((s) => s.sessionId !== sessionId));
    void refreshAccounts(false);
  };

  return (
    <AccountsContext.Provider
      value={{
        accounts,
        cashBalance,
        isLoading,
        isRefreshing,
        refreshAccounts,
        updateCashBalance,
        addManualAccount,
        deleteManualAccount,
        updateAccount,
        adjustManualBalance,
        sessions,
        saveSession,
        removeSession,
      }}
    >
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccounts() {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error("useAccounts must be used within an AccountsProvider");
  }
  return context;
}
