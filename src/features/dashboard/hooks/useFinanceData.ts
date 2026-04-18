import { useMemo } from "react";
import { useAccounts } from "../../accounts/context/AccountsContext";
import { useDateFilter } from "../../../shared/context/DateFilterContext";
import { useSettings } from "../../../shared/context/SettingsContext";
import { useTransactionsContext } from "../../transactions/context/TransactionsContext";
import type { Transaction } from "../../../services/enableBanking";

export function useFinanceData() {
  const { accounts, refreshAccounts, isRefreshing, cashBalance } = useAccounts();
  const { filterDateFrom, filterDateTo, applyDateFilter } = useDateFilter();
  const { mainAccountId } = useSettings();
  const { transactionsByAccount, isLoading: statsLoading, refreshTransactions } = useTransactionsContext();

  const allTransactions = useMemo(() => {
    let targetAccounts = [];
    if (mainAccountId) {
      const found = accounts.find(a => a.id === mainAccountId);
      if (found) targetAccounts = [found];
    }
    
    if (targetAccounts.length === 0) {
      targetAccounts = accounts.filter(acc => acc.category === "Giro");
      if (targetAccounts.length === 0 && accounts.length > 0) {
        targetAccounts = [accounts[0]];
      }
    }
    
    let combined: Transaction[] = [];
    for (const acc of targetAccounts) {
      if (transactionsByAccount[acc.id]) {
        combined = [...combined, ...transactionsByAccount[acc.id]];
      }
    }
    
    // Sort combined descending
    combined.sort((a, b) => {
      const dateA = a.booking_date || a.value_date || "";
      const dateB = b.booking_date || b.value_date || "";
      return dateB.localeCompare(dateA);
    });

    return combined;
  }, [accounts, mainAccountId, transactionsByAccount]);

  const loadAllTransactions = async () => {
    await refreshTransactions();
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
