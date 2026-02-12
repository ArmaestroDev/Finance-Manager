import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { getBalances, type Account } from "../services/enableBanking";

// --- Types (Re-used/Adapted from accounts.tsx) ---
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
const CACHED_ACCOUNTS_KEY = "cached_unified_accounts"; // NEW: Cache the processed list

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
}

const AccountsContext = createContext<AccountsContextType | undefined>(
  undefined,
);

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<UnifiedAccount[]>([]);
  const [cashBalance, setCashBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load initial data from cache/storage
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      // Load Cash
      const storedCash = await AsyncStorage.getItem(CASH_KEY);
      if (storedCash) setCashBalance(parseFloat(storedCash));

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
      const [sessionsData, manualData, metadataData] = await Promise.all([
        AsyncStorage.getItem(SESSIONS_KEY),
        AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY),
        AsyncStorage.getItem(ACCOUNT_METADATA_KEY),
      ]);

      const metadata = metadataData ? JSON.parse(metadataData) : {};
      const manualAccounts: ManualAccount[] = manualData
        ? JSON.parse(manualData)
        : [];
      const sessions: StoredSession[] = sessionsData
        ? JSON.parse(sessionsData)
        : [];

      const newUnifiedAccounts: UnifiedAccount[] = [];

      // 2. Process Connected Accounts
      // We first create the structure, then fetch balances
      const connectedAccountsParams: UnifiedAccount[] = [];

      for (const session of sessions) {
        for (const account of session.accounts) {
          // Check if we already have a cached balance for this account to avoid flickering?
          // For now, we'll re-fetch.
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
              const mainBalance =
                balanceData.balances.find(
                  (b) => b.balance_type === "CLAV" || b.balance_type === "XPCD",
                ) || balanceData.balances[0];

              return {
                ...item,
                balance: parseFloat(mainBalance.balance_amount.amount),
                currency: mainBalance.balance_amount.currency,
                loading: false,
              };
            } catch (err: any) {
              console.error(`Failed to fetch balance for ${item.id}:`, err);

              // Fallback to existing account data if available
              const existingAccount = accounts.find((a) => a.id === item.id);
              if (existingAccount) {
                return {
                  ...item,
                  balance: existingAccount.balance,
                  currency: existingAccount.currency,
                  loading: false,
                  // We can optionally set error, but if we have valid data, maybe just log it?
                  // Let's set error but keep the balance, so UI can decide (or just show stale data)
                  // Actually, if we show error, the UI might hide the balance. Let's suppress error if we have data.
                  error: undefined,
                };
              }

              return {
                ...item,
                loading: false,
                error: err.message || "Failed",
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
    setCashBalance(amount);
    await AsyncStorage.setItem(CASH_KEY, amount.toString());
  };

  const addManualAccount = async (account: ManualAccount) => {
    try {
      const stored = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
      const current = stored ? JSON.parse(stored) : [];
      const updated = [...current, account];
      await AsyncStorage.setItem(MANUAL_ACCOUNTS_KEY, JSON.stringify(updated));

      // Refresh to update the global list
      await refreshAccounts(false);
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

        // Also remove transactions for this account (optional but good practice)
        await AsyncStorage.removeItem(`manual_transactions_${id}`);

        await refreshAccounts(false);
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

      setAccounts(newAccounts);
      await AsyncStorage.setItem(
        CACHED_ACCOUNTS_KEY,
        JSON.stringify(newAccounts),
      );
    } catch (e) {
      console.error("Failed to update account:", e);
    }
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
