import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, ActivityIndicator, Modal, StyleSheet, View, Text } from "react-native";
import { getTransactions, getBalances, pickLatestBalance, type Transaction } from "../../../services/enableBanking";
import { toApiDate } from "../../../shared/utils/date";
import { useDateFilter } from "../../../shared/context/DateFilterContext";
import { useAccounts, type UnifiedAccount } from "../../accounts/context/AccountsContext";

const MANUAL_ACCOUNTS_KEY = "manual_accounts";
const CONNECTED_TRANSACTIONS_PREFIX = "connected_transactions_";

interface ManualTransaction {
  transaction_id: string;
  booking_date: string;
  transaction_amount: {
    currency: string;
    amount: string;
  };
  remittance_information: string[];
  creditor?: { name?: string };
  debtor?: { name?: string };
}

export interface ImportResult {
  importedTxIds: string[];
  skippedCount: number;
}

interface TransactionsContextType {
  transactionsByAccount: Record<string, Transaction[]>;
  isLoading: boolean;
  globalError: string | null;
  refreshTransactions: () => Promise<void>;
  addManualTransaction: (accountId: string, txTitle: string, txAmount: string) => Promise<void>;
  updateManualTransaction: (accountId: string, editingTx: Transaction, editTitle: string, editAmount: string) => Promise<void>;
  deleteManualTransaction: (accountId: string, editingTx: Transaction) => Promise<void>;
  importBankStatement: (
    accountId: string,
    newTxs: Transaction[],
    isManual: boolean,
    statementId?: string,
  ) => Promise<ImportResult>;
  deleteTransactionsByIds: (
    accountId: string,
    txIds: string[],
    isManual: boolean,
  ) => Promise<void>;
  deleteStatementTransactions: (
    accountId: string,
    statementId: string,
    txIds: string[],
    isManual: boolean,
  ) => Promise<number>;
  /**
   * Every transaction in the on-device cache across all accounts, ignoring
   * the active date filter. Used for long-range analysis (e.g. recurring
   * spend detection) that needs more history than the current view.
   */
  getAllCachedTransactions: () => Promise<Transaction[]>;
  clearGlobalError: () => void;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { accounts, updateAccount, refreshAccounts } = useAccounts();
  const { filterDateFrom, filterDateTo, refreshSignal } = useDateFilter();

  const [transactionsByAccount, setTransactionsByAccount] = useState<Record<string, Transaction[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const lastSignal = useRef(refreshSignal);

  useEffect(() => {
    if (!filterDateFrom || !filterDateTo || accounts.length === 0) return;
    
    // Load whenever dates or refresh signal changes
    loadAllTransactions();
    lastSignal.current = refreshSignal;
  }, [filterDateFrom, filterDateTo, refreshSignal, accounts.length]); // depend on accounts.length to load initially

  useEffect(() => {
    if (globalError) {
      Alert.alert("Error", globalError, [{ text: "OK", onPress: () => setGlobalError(null) }]);
    }
  }, [globalError]);

  const loadAllTransactions = async () => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const apiFrom = toApiDate(filterDateFrom);
      const apiTo = toApiDate(filterDateTo);
      const newMap: Record<string, Transaction[]> = {};

      for (const acc of accounts) {
        if (acc.type === "manual") {
          let txs: Transaction[] = [];
          const key = `manual_transactions_${acc.id}`;
          try {
            const data = await AsyncStorage.getItem(key);
            if (data) {
              const allTxs: ManualTransaction[] = JSON.parse(data);
              txs = allTxs.filter((t) => {
                const date = t.booking_date;
                return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
              }) as unknown as Transaction[];
            }
          } catch (e) {}
          txs.sort((a, b) => {
            const dateA = a.booking_date || a.value_date || "";
            const dateB = b.booking_date || b.value_date || "";
            return dateB.localeCompare(dateA);
          });
          newMap[acc.id] = txs;
        } else {
          // Connected Account
          let apiTxs: Transaction[] = [];
          const cacheKey = `${CONNECTED_TRANSACTIONS_PREFIX}${acc.id}`;
          
          let cachedTxs: Transaction[] = [];
          try {
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
              cachedTxs = JSON.parse(cachedData);
            }
          } catch (e) {}

          try {
            const data = await getTransactions(acc.id, apiFrom, apiTo);
            if (Array.isArray(data.transactions)) {
              apiTxs = data.transactions;
            } else {
              apiTxs = [
                ...(data.transactions.booked || []),
                ...(data.transactions.pending || []),
              ];
            }

            if (data.continuation_key) {
              let nextKey: string | undefined = data.continuation_key;
              let pages = 0;
              while (nextKey && pages < 5) {
                try {
                  const nextData = await getTransactions(acc.id, apiFrom, apiTo, nextKey);
                  let nextTxs: Transaction[] = [];
                  if (Array.isArray(nextData.transactions)) {
                    nextTxs = nextData.transactions;
                  } else {
                    nextTxs = [
                      ...(nextData.transactions.booked || []),
                      ...(nextData.transactions.pending || []),
                    ];
                  }
                  apiTxs = [...apiTxs, ...nextTxs];
                  nextKey = nextData.continuation_key;
                  pages++;
                } catch (e) {
                  break;
                }
              }
            }

            // Merge API txs with Cached txs to prevent duplication
            const txMap = new Map<string, Transaction>();
            cachedTxs.forEach(t => {
               const txId = t.transaction_id || `gen_${t.booking_date || ""}_${t.transaction_amount.amount}_${t.creditor?.name || t.debtor?.name || ""}`;
               txMap.set(txId, t);
            });
            apiTxs.forEach(t => {
               const txId = t.transaction_id || `gen_${t.booking_date || ""}_${t.transaction_amount.amount}_${t.creditor?.name || t.debtor?.name || ""}`;
               txMap.set(txId, t);
            });

            let mergedTxs = Array.from(txMap.values());

            const filtered = mergedTxs.filter((t) => {
              const date = t.booking_date || t.value_date || "";
              return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
            });
            
            filtered.sort((a, b) => {
              const dateA = a.booking_date || a.value_date || "";
              const dateB = b.booking_date || b.value_date || "";
              return dateB.localeCompare(dateA);
            });
            
            newMap[acc.id] = filtered;

            if (mergedTxs.length > 0) {
              await AsyncStorage.setItem(cacheKey, JSON.stringify(mergedTxs));
            }
            
            // Check balance update — always use the latest reported balance
            // from Enable Banking (most recent reference_date), not a balance
            // that's pinned to a specific type/date.
            if (apiTxs.length > 0) {
               getBalances(acc.id).then(balanceData => {
                 const mainBalance = pickLatestBalance(balanceData.balances);
                 if (mainBalance) {
                    const newBalance = parseFloat(mainBalance.balance_amount.amount);
                    if (acc.balance !== newBalance) {
                       updateAccount({
                         ...acc,
                         balance: newBalance,
                         currency: mainBalance.balance_amount.currency,
                         error: undefined
                       });
                       refreshAccounts(false);
                    }
                 }
               }).catch(() => {});
            }

          } catch (e: any) {
            console.error("API Error in loadAllTransactions:", e);
            if (e.message && e.message.includes("422")) {
              setGlobalError("The selected date range is not supported by the bank. Please select a different range.");
            } else if (e.message) {
              setGlobalError(e.message);
            }
            // Fallback to cache
            try {
              const data = await AsyncStorage.getItem(cacheKey);
              if (data) {
                const cachedTxs: Transaction[] = JSON.parse(data);
                const filtered = cachedTxs.filter((t) => {
                  const date = t.booking_date || t.value_date || "";
                  return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
                });
                filtered.sort((a, b) => {
                  const dateA = a.booking_date || a.value_date || "";
                  const dateB = b.booking_date || b.value_date || "";
                  return dateB.localeCompare(dateA);
                });
                newMap[acc.id] = filtered;
              } else {
                newMap[acc.id] = [];
              }
            } catch (cacheErr) {
              newMap[acc.id] = [];
            }
          }
        }
      }

      setTransactionsByAccount(newMap);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAccountBalance = async (accountId: string, diff: number) => {
    try {
      const manualData = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
      if (manualData) {
        const accs = JSON.parse(manualData);
        const updatedAccounts = accs.map((acc: any) => {
          if (acc.id === accountId) {
            return { ...acc, balance: acc.balance + diff };
          }
          return acc;
        });
        await AsyncStorage.setItem(MANUAL_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
        
        const acc = accounts.find(a => a.id === accountId);
        if (acc) {
          updateAccount({ ...acc, balance: acc.balance + diff });
          refreshAccounts(false);
        }
      }
    } catch (err) {}
  };

  const addManualTransaction = async (accountId: string, txTitle: string, txAmount: string) => {
    const amountVal = parseFloat(txAmount.replace(",", "."));
    if (isNaN(amountVal)) return;

    const newTx: ManualTransaction = {
      transaction_id: `tx_${Date.now()}`,
      booking_date: new Date().toISOString().split("T")[0],
      transaction_amount: { currency: "EUR", amount: amountVal.toString() },
      remittance_information: [txTitle],
      creditor: { name: amountVal < 0 ? txTitle : "Self" },
      debtor: { name: amountVal > 0 ? txTitle : "Self" },
    };

    const txKey = `manual_transactions_${accountId}`;
    const storedTx = await AsyncStorage.getItem(txKey);
    let allTxs: ManualTransaction[] = storedTx ? JSON.parse(storedTx) : [];
    allTxs = [newTx, ...allTxs];
    
    await AsyncStorage.setItem(txKey, JSON.stringify(allTxs));
    
    // Update memory
    const apiFrom = toApiDate(filterDateFrom);
    const apiTo = toApiDate(filterDateTo);
    const filtered = allTxs.filter((t) => {
       const date = t.booking_date;
       return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
    }) as unknown as Transaction[];
    
    filtered.sort((a, b) => {
       const dateA = a.booking_date || a.value_date || "";
       const dateB = b.booking_date || b.value_date || "";
       return dateB.localeCompare(dateA);
    });

    setTransactionsByAccount(prev => ({ ...prev, [accountId]: filtered }));
    await updateAccountBalance(accountId, amountVal);
  };

  const updateManualTransaction = async (accountId: string, editingTx: Transaction, editTitle: string, editAmount: string) => {
    const oldAmount = parseFloat(editingTx.transaction_amount.amount);
    const newAmountVal = parseFloat(editAmount.replace(",", "."));
    if (isNaN(newAmountVal)) return;

    const updatedTx = {
      ...editingTx,
      transaction_amount: { ...editingTx.transaction_amount, amount: newAmountVal.toString() },
      remittance_information: [editTitle],
      creditor: { name: newAmountVal < 0 ? editTitle : "Self" },
    };

    const txKey = `manual_transactions_${accountId}`;
    const storedTx = await AsyncStorage.getItem(txKey);
    let allTxs: Transaction[] = storedTx ? JSON.parse(storedTx) : [];
    
    allTxs = allTxs.map((t) => t.transaction_id === editingTx.transaction_id ? updatedTx : t);
    await AsyncStorage.setItem(txKey, JSON.stringify(allTxs));
    
    const apiFrom = toApiDate(filterDateFrom);
    const apiTo = toApiDate(filterDateTo);
    const filtered = allTxs.filter((t) => {
       const date = t.booking_date || t.value_date || "";
       return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
    });
    
    filtered.sort((a, b) => {
       const dateA = a.booking_date || a.value_date || "";
       const dateB = b.booking_date || b.value_date || "";
       return dateB.localeCompare(dateA);
    });

    setTransactionsByAccount(prev => ({ ...prev, [accountId]: filtered }));
    const balanceDiff = newAmountVal - oldAmount;
    await updateAccountBalance(accountId, balanceDiff);
  };

  const deleteManualTransaction = async (accountId: string, editingTx: Transaction) => {
    const amountToRemove = parseFloat(editingTx.transaction_amount.amount);
    const txKey = `manual_transactions_${accountId}`;

    const storedTx = await AsyncStorage.getItem(txKey);
    let allTxs: Transaction[] = storedTx ? JSON.parse(storedTx) : [];
    allTxs = allTxs.filter((t) => t.transaction_id !== editingTx.transaction_id);

    await AsyncStorage.setItem(txKey, JSON.stringify(allTxs));
    
    const apiFrom = toApiDate(filterDateFrom);
    const apiTo = toApiDate(filterDateTo);
    const filtered = allTxs.filter((t) => {
       const date = t.booking_date || t.value_date || "";
       return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
    });
    
    filtered.sort((a, b) => {
       const dateA = a.booking_date || a.value_date || "";
       const dateB = b.booking_date || b.value_date || "";
       return dateB.localeCompare(dateA);
    });

    setTransactionsByAccount(prev => ({ ...prev, [accountId]: filtered }));
    await updateAccountBalance(accountId, -amountToRemove);
  };

  const storageKeyFor = (accountId: string, isManual: boolean) =>
    isManual
      ? `manual_transactions_${accountId}`
      : `${CONNECTED_TRANSACTIONS_PREFIX}${accountId}`;

  const applyInMemoryDateFilter = (txs: Transaction[]) => {
    const apiFrom = toApiDate(filterDateFrom);
    const apiTo = toApiDate(filterDateTo);
    const filtered = txs.filter((t) => {
      const date = t.booking_date || t.value_date || "";
      return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
    });
    filtered.sort((a, b) => {
      const dateA = a.booking_date || a.value_date || "";
      const dateB = b.booking_date || b.value_date || "";
      return dateB.localeCompare(dateA);
    });
    return filtered;
  };

  const importBankStatement = async (
    accountId: string,
    newTxs: Transaction[],
    isManual: boolean,
    statementId?: string,
  ): Promise<ImportResult> => {
    try {
      const key = storageKeyFor(accountId, isManual);
      const stored = await AsyncStorage.getItem(key);
      let existing: Transaction[] = stored ? JSON.parse(stored) : [];

      // Date-coverage dedupe: the Enable Banking API is authoritative for
      // connected accounts within its 90-day window, so any date that already
      // has at least one recorded transaction is considered fully covered and
      // statement rows for that date are skipped. Dates with no existing log
      // (usually older than the API window) get imported as-is.
      const coveredDates = new Set(
        existing
          .map((t) => t.booking_date || t.value_date || "")
          .filter(Boolean),
      );

      const importedTxIds: string[] = [];
      const kept: Transaction[] = [];
      let skipped = 0;

      for (const tx of newTxs) {
        const date = tx.booking_date || tx.value_date || "";
        if (date && coveredDates.has(date)) {
          skipped++;
          continue;
        }
        const tagged: Transaction = statementId
          ? { ...tx, statement_id: statementId }
          : { ...tx };
        if (tagged.transaction_id) importedTxIds.push(tagged.transaction_id);
        kept.push(tagged);
      }

      existing = [...kept, ...existing];
      await AsyncStorage.setItem(key, JSON.stringify(existing));

      // Update in-memory map for current date filter. No balance change —
      // imported transactions are independent of account balance.
      setTransactionsByAccount((prev) => ({
        ...prev,
        [accountId]: applyInMemoryDateFilter(existing),
      }));

      return { importedTxIds, skippedCount: skipped };
    } catch (err) {
      console.error("Failed to import bank statement:", err);
      setGlobalError("Failed to import bank statement");
      return { importedTxIds: [], skippedCount: 0 };
    }
  };

  const deleteTransactionsByIds = async (
    accountId: string,
    txIds: string[],
    isManual: boolean,
  ) => {
    if (txIds.length === 0) return;
    try {
      const key = storageKeyFor(accountId, isManual);
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return;
      const all: Transaction[] = JSON.parse(stored);
      const idSet = new Set(txIds);
      const remaining = all.filter(
        (t) => !t.transaction_id || !idSet.has(t.transaction_id),
      );
      await AsyncStorage.setItem(key, JSON.stringify(remaining));
      setTransactionsByAccount((prev) => ({
        ...prev,
        [accountId]: applyInMemoryDateFilter(remaining),
      }));
    } catch (err) {
      console.error("Failed to delete transactions by ids:", err);
      setGlobalError("Failed to delete statement transactions");
    }
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
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return 0;
      const all: Transaction[] = JSON.parse(stored);
      const idSet = new Set(txIds);
      let removed = 0;
      const remaining = all.filter((t) => {
        const byStmt = t.statement_id && t.statement_id === statementId;
        const byId = t.transaction_id && idSet.has(t.transaction_id);
        if (byStmt || byId) {
          removed++;
          return false;
        }
        return true;
      });
      await AsyncStorage.setItem(key, JSON.stringify(remaining));
      setTransactionsByAccount((prev) => ({
        ...prev,
        [accountId]: applyInMemoryDateFilter(remaining),
      }));
      return removed;
    } catch (err) {
      console.error("Failed to delete statement transactions:", err);
      setGlobalError("Failed to delete statement transactions");
      return 0;
    }
  };

  // Pulls the raw cache for every account (no date filtering) so callers can
  // analyse the full available history. Stays inside this context because it
  // owns the transactions AsyncStorage domain.
  const getAllCachedTransactions = async (): Promise<Transaction[]> => {
    const all: Transaction[] = [];
    for (const acc of accounts) {
      const key = storageKeyFor(acc.id, acc.type === "manual");
      try {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) all.push(...(parsed as Transaction[]));
        }
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
        isLoading,
        globalError,
        refreshTransactions: loadAllTransactions,
        addManualTransaction,
        updateManualTransaction,
        deleteManualTransaction,
        importBankStatement,
        deleteTransactionsByIds,
        deleteStatementTransactions,
        getAllCachedTransactions,
        clearGlobalError: () => setGlobalError(null),
      }}
    >
      {children}
      <Modal visible={isLoading} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 16, fontWeight: '600' }}>
            Loading transactions...
          </Text>
        </View>
      </Modal>
    </TransactionsContext.Provider>
  );
}

export function useTransactionsContext() {
  const context = useContext(TransactionsContext);
  if (context === undefined) {
    throw new Error("useTransactionsContext must be used within a TransactionsProvider");
  }
  return context;
}
