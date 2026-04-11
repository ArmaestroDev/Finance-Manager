import { useMemo } from "react";
import type { UnifiedAccount } from "../context/AccountsContext";
import type { TransactionCategory } from "../context/CategoriesContext";
import type { Transaction } from "../services/enableBanking";
import { getStableTxId, getTransactionAmount } from "../app/utils/transactions";

export interface CategoryBreakdownItem {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
}

export interface PieDataItem {
  value: number;
  color: string;
  text: string;
}

interface UseFinanceStatsArgs {
  allTransactions: Transaction[];
  accounts: UnifiedAccount[];
  cashBalance: number;
  categories: TransactionCategory[];
  transactionCategoryMap: Record<string, string>;
}

export function useFinanceStats({
  allTransactions,
  accounts,
  cashBalance,
  categories,
  transactionCategoryMap,
}: UseFinanceStatsArgs) {
  // ── Compute totals ──
  const { totalAssets, totalLiabilities } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;

    if (cashBalance >= 0) {
      assets += cashBalance;
    } else {
      liabilities += Math.abs(cashBalance);
    }

    accounts.forEach((acc) => {
      const balance = acc.balance || 0;
      if (balance >= 0) {
        assets += balance;
      } else {
        liabilities += Math.abs(balance);
      }
    });

    return { totalAssets: assets, totalLiabilities: liabilities };
  }, [accounts, cashBalance]);

  // ── Compute category breakdown ──
  const { totalIncome, totalExpenses, categoryBreakdown, pieData } =
    useMemo(() => {
      let income = 0;
      let expenses = 0;
      const catAmounts: Record<string, number> = {};

      let debugCount = 0;
      allTransactions.forEach((tx) => {
        const amount = getTransactionAmount(tx);
        if (isNaN(amount)) return;

        if (debugCount < 5) {
          console.log(`[STATS COMPUTE] tx: indicator=${tx.credit_debit_indicator}, rawAmount=${tx.transaction_amount.amount}, computedAmount=${amount}, creditor=${tx.creditor?.name}, debtor=${tx.debtor?.name}`);
          debugCount++;
        }

        const txId = getStableTxId(tx);
        const catId = transactionCategoryMap[txId];
        const cat = categories.find((c) => c.id === catId);

        // Explicitly exclude uncategorized transactions from stats
        if (!catId || !cat) return; 

        if (amount >= 0) {
          income += amount;
        } else {
          expenses += Math.abs(amount);
          catAmounts[catId] = (catAmounts[catId] || 0) + Math.abs(amount);
        }
      });

      console.log(`[STATS COMPUTE] Total income=${income}, expenses=${expenses}, txCount=${allTransactions.length}, categories assigned=${Object.keys(catAmounts).length}`);

      // Build breakdown list
      const breakdown: CategoryBreakdownItem[] = [];

      for (const [catId, amount] of Object.entries(catAmounts)) {
        const cat = categories.find((c) => c.id === catId);
        if (cat) {
          breakdown.push({
            categoryId: catId,
            name: cat.name,
            color: cat.color,
            amount,
          });
        }
      }

      // Sort by amount descending
      breakdown.sort((a, b) => b.amount - a.amount);

      // Build pie data
      const pie: PieDataItem[] = breakdown.map((item) => ({
        value: item.amount,
        color: item.color,
        text: item.name,
      }));

      return {
        totalIncome: income,
        totalExpenses: expenses,
        categoryBreakdown: breakdown,
        pieData: pie,
      };
    }, [allTransactions, transactionCategoryMap, categories]);

  return {
    totalAssets,
    totalLiabilities,
    totalIncome,
    totalExpenses,
    categoryBreakdown,
    pieData,
  };
}
