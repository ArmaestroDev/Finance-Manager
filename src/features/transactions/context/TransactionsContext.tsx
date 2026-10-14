import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { getTransactions, getBalances, pickLatestBalance, type Transaction } from "../../../services/enableBanking";
import { FMFonts, FMType } from "../../../constants/theme";
import { useSettings } from "../../../shared/context/SettingsContext";
import { toApiDate, todayApiDate } from "../../../shared/utils/date";
import { parseLocaleNumber, roundCents } from "../../../shared/utils/number";
import { showAlert } from "../../../shared/utils/alert";
import { getStableTxId } from "../utils/transactions";
import { matchDuplicates, mergeApiIntoCache } from "../utils/dedupe";
import {
  COVERAGE_SLACK_DAYS,
  addDaysApi,
  bankWindowStart,
  isRangeRejection,
  planApiRange,
} from "../utils/bankWindow";
import type { LocatedTx } from "../utils/links";
import { useCategories } from "./CategoriesContext";
import { useDateFilter } from "../../../shared/context/DateFilterContext";
import { useAccounts, type UnifiedAccount } from "../../accounts/context/AccountsContext";

const MANUAL_TRANSACTIONS_PREFIX = "manual_transactions_";
const CONNECTED_TRANSACTIONS_PREFIX = "connected_transactions_";
// Enable Banking pagination guard: at most this many follow-up pages per load.
const MAX_CONTINUATION_PAGES = 5;

/** A user-entered transaction (always has an id and a booking date). */
type ManualTransaction = Transaction & { transaction_id: string; booking_date: string };

/** Ids that changed in storage, for contexts that reference transactions by id. */
export interface TxIdChange {
  /** old id → new id (a statement row replaced by the bank's version). */
  remap?: Record<string, string>;
  /** Ids that no longer exist. */
  removed?: string[];
}

/** Part of the selected range that no source covers for a connected account. */
export interface CoverageGap {
  accountId: string;
  /** First day (`YYYY-MM-DD`) with data for this account. */
  availableFrom: string;
}

export interface ImportResult {
  importedTxIds: string[];
  skippedCount: number;
}

interface TransactionsContextType {
  /** Transactions inside the active date range, per account, newest first. */
  transactionsByAccount: Record<string, Transaction[]>;
  /** Every stored transaction (any date) per account, newest first. */
  storedByAccount: Record<string, Transaction[]>;
  /** Every stored transaction with its account, for cross-account lookups (links). */
  allStoredTransactions: LocatedTx[];
  /** Look a transaction up by stable id across all accounts and dates. */
  findTransaction: (txId: string) => LocatedTx | undefined;
  /**
   * Connected accounts whose data starts after the selected "from" date
   * (older than the bank API serves and no statement imported for it).
   */
  coverageGaps: CoverageGap[];
  /** Subscribe to id changes (remaps, removals). Returns an unsubscribe function. */
  subscribeTxIdChanges: (listener: (change: TxIdChange) => void) => () => void;
  isLoading: boolean;
  refreshTransactions: () => Promise<void>;
  addManualTransaction: (accountId: string, txTitle: string, txAmount: string) => Promise<string | void>;
  updateManualTransaction: (accountId: string, editingTx: Transaction, editTitle: string, editAmount: string) => Promise<void>;
  deleteManualTransaction: (accountId: string, editingTx: Transaction) => Promise<void>;
  /** Delete a manual transaction by id (looked up in storage, so it works outside the current date range). */
  deleteManualTransactionById: (accountId: string, txId: string) => Promise<void>;
  /**
   * Persist statement/CSV rows for an account. Throws on storage failure so
   * callers (import queue, CSV import) can report it instead of "0 imported".
   */
  importBankStatement: (
    accountId: string,
    newTxs: Transaction[],
    isManual: boolean,
    statementId?: string,
  ) => Promise<ImportResult>;
  deleteStatementTransactions: (
    accountId: string,
    statementId: string,
    txIds: string[],
    isManual: boolean,
  ) => Promise<number>;
  /**
   * Remove every stored transaction of an account (used when the account is
   * deleted). Returns the stable ids of the removed transactions so other
   * contexts can drop their references (categories, links).
   */
  purgeAccountTransactions: (accountId: string, isManual: boolean) => Promise<string[]>;
  /**
   * Every transaction in the on-device cache across all accounts, ignoring
   * the active date filter. Used for long-range analysis (e.g. recurring
   * spend detection) that needs more history than the current view.
   */
  getAllCachedTransactions: () => Promise<Transaction[]>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

const txDate = (t: Transaction) => t.booking_date || t.value_date || "";

/** Keep transactions inside [from, to] (API dates, either may be empty), newest first. */
const filterAndSort = (txs: Transaction[], apiFrom: string, apiTo: string): Transaction[] =>
  txs
    .filter((t) => {
      const date = txDate(t);
      return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
    })
    .sort((a, b) => txDate(b).localeCompare(txDate(a)));

const flattenPage = (
  page: Transaction[] | { booked: Transaction[]; pending?: Transaction[] },
): Transaction[] => (Array.isArray(page) ? page : [...(page.booked || []), ...(page.pending || [])]);

const storageKeyFor = (accountId: string, isManual: boolean) =>
  `${isManual ? MANUAL_TRANSACTIONS_PREFIX : CONNECTED_TRANSACTIONS_PREFIX}${accountId}`;

async function readStored<T = Transaction>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { accounts, updateAccount, adjustManualBalance } = useAccounts();
  const { filterDateFrom, filterDateTo, refreshSignal } = useDateFilter();
  const { i18n } = useSettings();
  const { remapTransactionIds, bulkAssignCategories } = useCategories();

  // Full per-account history; the date-filtered view is derived below.
  const [storedByAccount, setStoredByAccount] = useState<Record<string, Transaction[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  // Connected accounts whose bank rejected a range older than its window
  // (in-memory: re-probed once per app session).
  const [limitedAccounts, setLimitedAccounts] = useState<Record<string, true>>({});
  const limitedRef = useRef<Record<string, true>>({});

  const listeners = useRef(new Set<(change: TxIdChange) => void>());
  const subscribeTxIdChanges = useCallback((listener: (change: TxIdChange) => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);
  // Categories live above this provider and are updated directly; links (and
  // anything else below) subscribe.
  const emitIdChange = async (change: TxIdChange) => {
    const hasRemap = change.remap && Object.keys(change.remap).length > 0;
    const hasRemoved = change.removed && change.removed.length > 0;
    if (!hasRemap && !hasRemoved) return;
    try {
      if (hasRemap) await remapTransactionIds(change.remap!);
      if (hasRemoved) {
        await bulkAssignCategories(Object.fromEntries(change.removed!.map((id) => [id, null])));
      }
    } catch (e) {
      console.warn("Failed to update category assignments:", e);
    }
    listeners.current.forEach((l) => l(change));
  };

  // Incremented per load; a slower, older load (e.g. the user changed the
  // date filter twice quickly) must not overwrite the newer result.
  const loadGeneration = useRef(0);

  const currentRange = () => ({ apiFrom: toApiDate(filterDateFrom), apiTo: toApiDate(filterDateTo) });
  const setStored = (accountId: string, txs: Transaction[]) =>
    setStoredByAccount((prev) => ({ ...prev, [accountId]: filterAndSort(txs, "", "") }));

  const rangeFrom = toApiDate(filterDateFrom);
  const rangeTo = toApiDate(filterDateTo);
  const transactionsByAccount = useMemo(() => {
    const out: Record<string, Transaction[]> = {};
    for (const [accId, txs] of Object.entries(storedByAccount)) {
      out[accId] = txs.filter((t) => {
        const date = txDate(t);
        return (!rangeFrom || date >= rangeFrom) && (!rangeTo || date <= rangeTo);
      });
    }
    return out;
  }, [storedByAccount, rangeFrom, rangeTo]);

  const allStoredTransactions = useMemo(() => {
    const out: LocatedTx[] = [];
    for (const [accountId, txs] of Object.entries(storedByAccount)) {
      for (const tx of txs) out.push({ tx, txId: getStableTxId(tx), accountId });
    }
    return out;
  }, [storedByAccount]);

  const txIndex = useMemo(() => {
    const m = new Map<string, LocatedTx>();
    for (const l of allStoredTransactions) if (!m.has(l.txId)) m.set(l.txId, l);
    return m;
  }, [allStoredTransactions]);
  const findTransaction = useCallback((txId: string) => txIndex.get(txId), [txIndex]);

  const coverageGaps = useMemo(() => {
    const gaps: CoverageGap[] = [];
    if (!rangeFrom) return gaps;
    const windowStart = bankWindowStart();
    if (rangeFrom >= windowStart) return gaps;
    for (const acc of accounts) {
      if (acc.type !== "connected") continue;
      const txs = storedByAccount[acc.id];
      if (!txs) continue; // not loaded yet
      const earliest = txs.length > 0 ? txDate(txs[txs.length - 1]) : "";
      let availableFrom = earliest || windowStart;
      if (limitedAccounts[acc.id] && windowStart < availableFrom) availableFrom = windowStart;
      if (availableFrom > addDaysApi(rangeFrom, COVERAGE_SLACK_DAYS)) {
        gaps.push({ accountId: acc.id, availableFrom });
      }
    }
    return gaps;
  }, [accounts, storedByAccount, limitedAccounts, rangeFrom]);

  const markLimited = (accountId: string) => {
    if (limitedRef.current[accountId]) return;
    limitedRef.current = { ...limitedRef.current, [accountId]: true };
    setLimitedAccounts(limitedRef.current);
  };

  // Fetch all pages of one range from the bank API.
  const fetchApiRange = async (accountId: string, from: string, to: string): Promise<Transaction[]> => {
    const data = await getTransactions(accountId, from, to);
    let apiTxs = flattenPage(data.transactions);
    let nextKey: string | undefined = data.continuation_key;
    for (let pages = 0; nextKey && pages < MAX_CONTINUATION_PAGES; pages++) {
      try {
        const nextData = await getTransactions(accountId, from, to, nextKey);
        apiTxs = [...apiTxs, ...flattenPage(nextData.transactions)];
        nextKey = nextData.continuation_key;
      } catch {
        break;
      }
    }
    return apiTxs;
  };

  // Fetches + caches a connected account's transactions and returns the full
  // stored history. The bank API only serves a recent window
  // (bankWindow.ts): older parts of the range come from the cache, which
  // also holds imported statements. Range rejections are expected and
  // silent (the UI shows a coverage hint); other API failures fall back to
  // the cache and push a user-facing message onto `errors`.
  const loadConnectedAccount = async (
    acc: UnifiedAccount,
    apiFrom: string,
    apiTo: string,
    errors: string[],
  ): Promise<{ txs: Transaction[]; remap: Record<string, string> }> => {
    const cacheKey = storageKeyFor(acc.id, false);
    let cachedTxs: Transaction[] = [];
    try {
      cachedTxs = await readStored(cacheKey);
    } catch {
      // Corrupt cache — fall through to the API.
    }

    const plan = planApiRange(apiFrom, apiTo, bankWindowStart(), !!limitedRef.current[acc.id]);
    let apiTxs: Transaction[] | null = null;
    try {
      if (plan.first) {
        try {
          apiTxs = await fetchApiRange(acc.id, plan.first.from, plan.first.to);
        } catch (e) {
          if (!isRangeRejection(e) || plan.first.from >= bankWindowStart()) throw e;
          markLimited(acc.id);
          if (plan.fallback) apiTxs = await fetchApiRange(acc.id, plan.fallback.from, plan.fallback.to);
        }
      }
    } catch (e) {
      console.error("API Error in loadAllTransactions:", e);
      const err = e as { message?: string } | undefined;
      if (isRangeRejection(e)) {
        // Even the clamped range was rejected: show what's cached plus the hint.
        markLimited(acc.id);
      } else if (err?.message) {
        errors.push(err.message);
      }
      return { txs: cachedTxs, remap: {} };
    }
    if (!apiTxs) return { txs: cachedTxs, remap: {} };

    // Merge API txs into the cache (API wins; statement rows describing the
    // same booking are replaced) so imports and history beyond the API
    // window are kept.
    const { merged, remap } = mergeApiIntoCache(cachedTxs, apiTxs);
    if (merged.length > 0) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(merged));
    }

    // Always use the latest reported balance from Enable Banking (most
    // recent reference_date), not one pinned to a specific type/date.
    if (apiTxs.length > 0) {
      getBalances(acc.id)
        .then((balanceData) => {
          const mainBalance = pickLatestBalance(balanceData.balances);
          if (!mainBalance) return;
          const newBalance = parseFloat(mainBalance.balance_amount.amount);
          if (acc.balance !== newBalance) {
            updateAccount({
              ...acc,
              balance: newBalance,
              currency: mainBalance.balance_amount.currency,
              error: undefined,
            });
          }
        })
        .catch(() => {});
    }
    return { txs: merged, remap };
  };

  const loadAllTransactions = async () => {
    const generation = ++loadGeneration.current;
    setIsLoading(true);
    try {
      const { apiFrom, apiTo } = currentRange();
      const newMap: Record<string, Transaction[]> = {};
      const errors: string[] = [];
      const remap: Record<string, string> = {};

      for (const acc of accounts) {
        if (acc.type === "manual") {
          let txs: Transaction[] = [];
          try {
            txs = await readStored(storageKeyFor(acc.id, true));
          } catch {
            // Corrupt entry — show the account as empty rather than failing the whole load.
          }
          newMap[acc.id] = filterAndSort(txs, "", "");
        } else {
          const result = await loadConnectedAccount(acc, apiFrom, apiTo, errors);
          newMap[acc.id] = filterAndSort(result.txs, "", "");
          Object.assign(remap, result.remap);
        }
      }

      // Statement rows replaced by the bank's version: move their category
      // and links to the new id (even if a newer load supersedes this one,
      // storage already holds the new ids).
      if (Object.keys(remap).length > 0) await emitIdChange({ remap });

      if (generation === loadGeneration.current) {
        setStoredByAccount(newMap);
        // One alert per load, not one per failing account.
        if (errors.length > 0) {
          showAlert(i18n.error_title, Array.from(new Set(errors)).join("\n"));
        }
      }
    } finally {
      if (generation === loadGeneration.current) setIsLoading(false);
    }
  };

  // The effect below must call the latest closure (it reads accounts and the
  // date range) without re-running on every render.
  const loadRef = useRef(loadAllTransactions);
  loadRef.current = loadAllTransactions;

  useEffect(() => {
    if (!filterDateFrom || !filterDateTo) return;
    if (accounts.length === 0) {
      // Last account removed — drop stale per-account transactions.
      setStoredByAccount({});
      return;
    }
    loadRef.current();
    // accounts.length: load once accounts arrive / when one is added or removed.
  }, [filterDateFrom, filterDateTo, refreshSignal, accounts.length]);

  const writeManual = async (accountId: string, txs: Transaction[]) => {
    await AsyncStorage.setItem(storageKeyFor(accountId, true), JSON.stringify(txs));
    setStored(accountId, txs);
  };

  const addManualTransaction = async (accountId: string, txTitle: string, txAmount: string) => {
    const amountVal = roundCents(parseLocaleNumber(txAmount));
    if (isNaN(amountVal)) return;

    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newTx: ManualTransaction = {
      transaction_id: txId,
      // Local calendar date — toISOString() would yield the UTC date.
      booking_date: todayApiDate(),
      transaction_amount: { currency: "EUR", amount: amountVal.toString() },
      remittance_information: [txTitle],
      creditor: { name: amountVal < 0 ? txTitle : "Self" },
      debtor: { name: amountVal >= 0 ? txTitle : "Self" },
    };

    const allTxs = await readStored(storageKeyFor(accountId, true));
    await writeManual(accountId, [newTx, ...allTxs]);
    await adjustManualBalance(accountId, amountVal);
    return txId;
  };

  const updateManualTransaction = async (accountId: string, editingTx: Transaction, editTitle: string, editAmount: string) => {
    const oldAmount = parseFloat(editingTx.transaction_amount.amount) || 0;
    const newAmountVal = roundCents(parseLocaleNumber(editAmount));
    if (isNaN(newAmountVal)) return;

    const updatedTx: Transaction = {
      ...editingTx,
      transaction_amount: { ...editingTx.transaction_amount, amount: newAmountVal.toString() },
      remittance_information: [editTitle],
      creditor: { name: newAmountVal < 0 ? editTitle : "Self" },
      // Keep debtor in sync too, otherwise an edited income tx keeps its old
      // title (and a sign flip leaves both sides pointing at the old name).
      debtor: { name: newAmountVal >= 0 ? editTitle : "Self" },
    };

    const allTxs = await readStored(storageKeyFor(accountId, true));
    await writeManual(
      accountId,
      allTxs.map((t) => (t.transaction_id === editingTx.transaction_id ? updatedTx : t)),
    );
    await adjustManualBalance(accountId, newAmountVal - oldAmount);
  };

  const deleteManualTransaction = async (accountId: string, editingTx: Transaction) => {
    const amountToRemove = parseFloat(editingTx.transaction_amount.amount) || 0;
    const allTxs = await readStored(storageKeyFor(accountId, true));
    await writeManual(
      accountId,
      allTxs.filter((t) => t.transaction_id !== editingTx.transaction_id),
    );
    await adjustManualBalance(accountId, -amountToRemove);
    await emitIdChange({ removed: [getStableTxId(editingTx)] });
  };

  const deleteManualTransactionById = async (accountId: string, txId: string) => {
    const allTxs = await readStored(storageKeyFor(accountId, true));
    const tx = allTxs.find((t) => t.transaction_id === txId);
    if (tx) await deleteManualTransaction(accountId, tx);
  };

  const importBankStatement = async (
    accountId: string,
    newTxs: Transaction[],
    isManual: boolean,
    statementId?: string,
  ): Promise<ImportResult> => {
    const key = storageKeyFor(accountId, isManual);
    const existing = await readStored(key);

    // Fuzzy dedupe (dedupe.ts): a row is skipped when the account already
    // holds the same booking — same amount, close date, matching
    // counterparty — from the bank API, an earlier import or a manual entry.
    // Re-importing a statement is a no-op; genuinely repeated bookings
    // (two equal coffees on one day) stay because matching is one-to-one.
    const duplicates = matchDuplicates(existing, newTxs);

    const importedTxIds: string[] = [];
    const kept: Transaction[] = [];
    let skipped = 0;

    newTxs.forEach((tx, i) => {
      if (duplicates.has(i)) {
        skipped++;
        return;
      }
      const tagged: Transaction = statementId ? { ...tx, statement_id: statementId } : { ...tx };
      if (tagged.transaction_id) importedTxIds.push(tagged.transaction_id);
      kept.push(tagged);
    });

    const next = [...kept, ...existing];
    await AsyncStorage.setItem(key, JSON.stringify(next));

    // No balance change — imported transactions are independent of the
    // account balance.
    setStored(accountId, next);

    return { importedTxIds, skippedCount: skipped };
  };

  // Robust cascade: matches by transaction_id AND by statement_id tag so
  // imports where the stable id may have drifted (pre-existing entries,
  // dedupe-skipped re-imports, etc.) are still cleaned up.
  const deleteStatementTransactions = async (
    accountId: string,
    statementId: string,
    txIds: string[],
    isManual: boolean,
  ): Promise<number> => {
    try {
      const key = storageKeyFor(accountId, isManual);
      const all = await readStored(key);
      if (all.length === 0) return 0;
      const idSet = new Set(txIds);
      const removed: string[] = [];
      const remaining = all.filter((t) => {
        const byStmt = t.statement_id && t.statement_id === statementId;
        const byId = t.transaction_id && idSet.has(t.transaction_id);
        if (byStmt || byId) removed.push(getStableTxId(t));
        return !(byStmt || byId);
      });
      await AsyncStorage.setItem(key, JSON.stringify(remaining));
      setStored(accountId, remaining);
      await emitIdChange({ removed });
      return all.length - remaining.length;
    } catch (err) {
      console.error("Failed to delete statement transactions:", err);
      showAlert(i18n.error_title, i18n.tx_statement_delete_failed);
      return 0;
    }
  };

  const purgeAccountTransactions = async (accountId: string, isManual: boolean) => {
    const key = storageKeyFor(accountId, isManual);
    let ids: string[] = [];
    try {
      ids = (await readStored(key)).map(getStableTxId);
    } catch {
      // Unreadable entry — still remove it below.
    }
    await AsyncStorage.removeItem(key);
    setStoredByAccount((prev) => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });
    return ids;
  };

  // Pulls the raw cache for every account (no date filtering) so callers can
  // analyse the full available history. Stays inside this context because it
  // owns the transactions AsyncStorage domain.
  const getAllCachedTransactions = async (): Promise<Transaction[]> => {
    const all: Transaction[] = [];
    for (const acc of accounts) {
      try {
        all.push(...(await readStored(storageKeyFor(acc.id, acc.type === "manual"))));
      } catch {
        // Skip unreadable/corrupt cache entries.
      }
    }
    return all;
  };

  return (
    <TransactionsContext.Provider
      value={{
        transactionsByAccount,
        storedByAccount,
        allStoredTransactions,
        findTransaction,
        coverageGaps,
        subscribeTxIdChanges,
        isLoading,
        refreshTransactions: loadAllTransactions,
        addManualTransaction,
        updateManualTransaction,
        deleteManualTransaction,
        deleteManualTransactionById,
        importBankStatement,
        deleteStatementTransactions,
        purgeAccountTransactions,
        getAllCachedTransactions,
      }}
    >
      {children}
      <Modal visible={isLoading} transparent animationType="fade">
        <View style={styles.scrim}>
          <ActivityIndicator size="large" color={SCRIM_INK} />
          <Text style={styles.scrimText}>{i18n.tx_loading}</Text>
        </View>
      </Modal>
    </TransactionsContext.Provider>
  );
}

// The loading overlay sits on a fixed dark scrim in every palette/mode, so
// its colours are deliberately not theme tokens.
const SCRIM_INK = "#ffffff";
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrimText: {
    color: SCRIM_INK,
    marginTop: 16,
    fontSize: FMType.subhead,
    fontFamily: FMFonts.sansSemibold,
  },
});

export function useTransactionsContext() {
  const context = useContext(TransactionsContext);
  if (context === undefined) {
    throw new Error("useTransactionsContext must be used within a TransactionsProvider");
  }
  return context;
}
