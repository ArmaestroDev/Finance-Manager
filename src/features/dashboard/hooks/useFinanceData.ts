import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useAccounts } from "../../accounts/context/AccountsContext";
import { getTransactions, type Transaction } from "../../../services/enableBanking";
import { toApiDate, toUiDate } from "../../../shared/utils/date";

const CONNECTED_TRANSACTIONS_PREFIX = "connected_transactions_";

export function useFinanceData() {
  const { accounts, refreshAccounts, isRefreshing, cashBalance } =
    useAccounts();

  // ── Date filter state (default: 1st of this month → today) ──
  const [filterDateFrom, setFilterDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return toUiDate(d);
  });
  const [filterDateTo, setFilterDateTo] = useState<string>(() =>
    toUiDate(new Date()),
  );

  // ── Stats state ──
  const [statsLoading, setStatsLoading] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // ── Load transactions across all accounts ──
  useEffect(() => {
    if (!filterDateFrom || !filterDateTo || accounts.length === 0) return;
    loadAllTransactions();
  }, [filterDateFrom, filterDateTo, accounts]);

  const loadAllTransactions = async () => {
    setStatsLoading(true);
    try {
      const apiFrom = toApiDate(filterDateFrom);
      const apiTo = toApiDate(filterDateTo);
      let combined: Transaction[] = [];

      console.log("[STATS] Loading transactions for", accounts.length, "accounts, date range:", apiFrom, "to", apiTo);

      for (const acc of accounts) {
        if (acc.type === "manual") {
          const key = `manual_transactions_${acc.id}`;
          try {
            const data = await AsyncStorage.getItem(key);
            if (data) {
              let txs: Transaction[] = JSON.parse(data);
              const filtered = txs.filter((t) => {
                const date = t.booking_date || t.value_date || "";
                return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
              });
              combined = [...combined, ...filtered];
            }
          } catch (e) {
            console.log(`[STATS] Error loading manual account ${acc.id}:`, e);
          }
        } else {
          // Connected account: fetch from API
          try {
            const data = await getTransactions(acc.id, apiFrom, apiTo);
            let txs: Transaction[] = [];
            if (Array.isArray(data.transactions)) {
              txs = data.transactions;
            } else {
              txs = [
                ...(data.transactions.booked || []),
                ...(data.transactions.pending || []),
              ];
            }

            // Handle Pagination (up to 3 pages for home screen stats)
            if (data.continuation_key) {
              let nextKey: string | undefined = data.continuation_key;
              let pages = 0;
              while (nextKey && pages < 3) {
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
                  txs = [...txs, ...nextTxs];
                  nextKey = nextData.continuation_key;
                  pages++;
                } catch (e) {
                  break;
                }
              }
            }

            // Apply exact date filtering
            const filtered = txs.filter((t) => {
              const date = t.booking_date || t.value_date || "";
              return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
            });
            combined = [...combined, ...filtered];
            
            // Cache it for the account detail screen 
            if (txs.length > 0) {
              const cacheKey = `${CONNECTED_TRANSACTIONS_PREFIX}${acc.id}`;
              await AsyncStorage.setItem(cacheKey, JSON.stringify(txs));
            }
          } catch (e) {
             console.log(`[STATS] Error loading connected account ${acc.id} from API:`, e);
             // Fallback to cache if API fails
             const cacheKey = `${CONNECTED_TRANSACTIONS_PREFIX}${acc.id}`;
             try {
                const data = await AsyncStorage.getItem(cacheKey);
                if (data) {
                  const txs: Transaction[] = JSON.parse(data);
                  const filtered = txs.filter((t) => {
                    const date = t.booking_date || t.value_date || "";
                    return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
                  });
                  combined = [...combined, ...filtered];
                }
             } catch (cacheErr) {}
          }
        }
      }

      console.log("[STATS] Total combined transactions:", combined.length);
      setAllTransactions(combined);
    } finally {
      setStatsLoading(false);
    }
  };

  const applyDateFilter = (from: string, to: string) => {
    setFilterDateFrom(from);
    setFilterDateTo(to);
  };

  return {
    allTransactions,
    statsLoading,
    filterDateFrom,
    filterDateTo,
    accounts,
    cashBalance,
    refreshAccounts,
    isRefreshing,
    loadAllTransactions,
    applyDateFilter,
  };
}
