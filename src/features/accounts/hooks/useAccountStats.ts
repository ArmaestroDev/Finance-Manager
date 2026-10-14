import { useMemo } from "react";
import type { Transaction } from "../../../services/enableBanking";
import { useTransactionLinks } from "../../transactions/context/TransactionLinksContext";
import { statAmountFor } from "../../transactions/utils/links";
import { getStableTxId } from "../../transactions/utils/transactions";

interface TransactionCategory {
  id: string;
  name: string;
  color: string;
  system?: "ignore";
}

interface UseAccountStatsParams {
  transactions: Transaction[];
  getCategoryForTransaction: (txId: string) => TransactionCategory | null;
  /** @deprecated Ignored — links are resolved from TransactionLinksContext across all accounts. */
  transactionLinks?: Record<string, string[]>;
}

export function useAccountStats({ transactions, getCategoryForTransaction }: UseAccountStatsParams) {
  // Links resolve against every stored transaction, so a reimbursement that
  // landed on another account still reduces this account's expense.
  const { linkIndex } = useTransactionLinks();
  const { accountIncome, accountExpenses, uncategorizedCount } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let uncat = 0;
    transactions.forEach((tx) => {
      const txId = getStableTxId(tx);
      const cat = getCategoryForTransaction(txId);
      // Uncategorized and Ignore (self-transfers, investment buys) don't count.
      if (!cat) {
        if (!linkIndex.childToParent.has(txId)) uncat++;
        return;
      }
      if (cat.system === "ignore") return;
      const amount = statAmountFor(tx, linkIndex, txId);
      if (amount === null || isNaN(amount)) return;
      if (amount >= 0) inc += amount;
      else exp += Math.abs(amount);
    });
    return { accountIncome: inc, accountExpenses: exp, uncategorizedCount: uncat };
  }, [transactions, getCategoryForTransaction, linkIndex]);

  /** Rows left out of the totals because they have no category yet. */
  return { accountIncome, accountExpenses, uncategorizedCount };
}
