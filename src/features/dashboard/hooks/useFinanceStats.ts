import { useMemo } from "react";
import type { UnifiedAccount } from "../../accounts/context/AccountsContext";
import type { TransactionCategory } from "../../transactions/context/CategoriesContext";
import type { Transaction } from "../../../services/enableBanking";
import { getStableTxId, getTransactionAmount } from "../../transactions/utils/transactions";
import { toApiDate } from "../../../shared/utils/date";

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

export interface MonthlyBucket {
  key: string;          // "YYYY-MM"
  year: number;
  month: number;        // 0-11
  income: number;
  expenses: number;
  categoryBreakdown: CategoryBreakdownItem[];
}

interface UseFinanceStatsArgs {
  allTransactions: Transaction[];
  accounts: UnifiedAccount[];
  cashBalance: number;
  categories: TransactionCategory[];
  transactionCategoryMap: Record<string, string>;
  filterDateFrom?: string;
  filterDateTo?: string;
}

export function useFinanceStats({
  allTransactions,
  accounts,
  cashBalance,
  categories,
  transactionCategoryMap,
  filterDateFrom,
  filterDateTo,
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

  // ── Compute category breakdown + per-month buckets ──
  const { totalIncome, totalExpenses, categoryBreakdown, pieData, monthlyBuckets } =
    useMemo(() => {
      let income = 0;
      let expenses = 0;
      const catAmounts: Record<string, number> = {};

      // Enumerate months from the active filter range so empty months still
      // render in the selector (and contribute a 0 to the average).
      const monthKeys: string[] = [];
      const apiFrom = filterDateFrom ? toApiDate(filterDateFrom) : "";
      const apiTo = filterDateTo ? toApiDate(filterDateTo) : "";
      if (apiFrom && apiTo) {
        const [fy, fm] = apiFrom.split("-").map(Number);
        const [ty, tm] = apiTo.split("-").map(Number);
        let y = fy;
        let m = fm;
        while (y < ty || (y === ty && m <= tm)) {
          monthKeys.push(`${y}-${String(m).padStart(2, "0")}`);
          m++;
          if (m > 12) {
            m = 1;
            y++;
          }
        }
      }

      const monthData: Record<
        string,
        { income: number; expenses: number; cats: Record<string, number> }
      > = {};
      monthKeys.forEach((k) => {
        monthData[k] = { income: 0, expenses: 0, cats: {} };
      });

      allTransactions.forEach((tx) => {
        const amount = getTransactionAmount(tx);
        if (isNaN(amount)) return;

        const txId = getStableTxId(tx);
        const catId = transactionCategoryMap[txId];
        const cat = categories.find((c) => c.id === catId);

        // Explicitly exclude uncategorized transactions from stats
        if (!catId || !cat) return;
        // Exclude system "Ignore" category (self-transfers, investment buys)
        if (cat.system === "ignore") return;

        const date = tx.booking_date || tx.value_date || "";
        const monthKey = date.slice(0, 7);

        if (amount >= 0) {
          income += amount;
          if (monthData[monthKey]) monthData[monthKey].income += amount;
        } else {
          const abs = Math.abs(amount);
          expenses += abs;
          catAmounts[catId] = (catAmounts[catId] || 0) + abs;
          if (monthData[monthKey]) {
            monthData[monthKey].expenses += abs;
            monthData[monthKey].cats[catId] = (monthData[monthKey].cats[catId] || 0) + abs;
          }
        }
      });

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

      const buckets: MonthlyBucket[] = monthKeys.map((k) => {
        const md = monthData[k];
        const [y, m] = k.split("-").map(Number);
        const mb: CategoryBreakdownItem[] = [];
        for (const [catId, amount] of Object.entries(md.cats)) {
          const cat = categories.find((c) => c.id === catId);
          if (cat) {
            mb.push({ categoryId: catId, name: cat.name, color: cat.color, amount });
          }
        }
        mb.sort((a, b) => b.amount - a.amount);
        return {
          key: k,
          year: y,
          month: m - 1,
          income: md.income,
          expenses: md.expenses,
          categoryBreakdown: mb,
        };
      });

      return {
        totalIncome: income,
        totalExpenses: expenses,
        categoryBreakdown: breakdown,
        pieData: pie,
        monthlyBuckets: buckets,
      };
    }, [allTransactions, transactionCategoryMap, categories, filterDateFrom, filterDateTo]);

  return {
    totalAssets,
    totalLiabilities,
    totalIncome,
    totalExpenses,
    categoryBreakdown,
    pieData,
    monthlyBuckets,
  };
}
