import { useMemo } from "react";
import type { Transaction } from "../../../services/enableBanking";
import { getStableTxId, getTransactionAmount } from "../../transactions/utils/transactions";

interface TransactionCategory {
  id: string;
  name: string;
  color: string;
}

interface UseAccountStatsParams {
  transactions: Transaction[];
  getCategoryForTransaction: (txId: string) => TransactionCategory | null;
}

export function useAccountStats({
  transactions,
  getCategoryForTransaction,
}: UseAccountStatsParams) {
  const { accountIncome, accountExpenses } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    transactions.forEach((tx) => {
      const txId = getStableTxId(tx);
      const cat = getCategoryForTransaction(txId);
      
      // Exclude uncategorized transactions from stats as requested
      if (!cat) return;

      const amount = getTransactionAmount(tx);
      if (amount >= 0) {
        inc += amount;
      } else {
        exp += Math.abs(amount);
      }
    });
    return { accountIncome: inc, accountExpenses: exp };
  }, [transactions, getCategoryForTransaction]);

  return { accountIncome, accountExpenses };
}
