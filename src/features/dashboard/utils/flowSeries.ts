import type { Transaction } from "@/src/services/enableBanking";
import {
  daysBetween,
  lastNDays,
  txDayKey,
  uiRangeToIso,
} from "@/src/shared/utils/series";
import { getStableTxId, getTransactionAmount } from "@/src/features/transactions/utils/transactions";

interface CategoryLike {
  id: string;
  system?: "ignore";
}

export interface FlowSeries {
  /** `YYYY-MM-DD`, oldest → newest. */
  days: string[];
  /** Cumulative categorized income across the window, per day. */
  income: number[];
  /** Cumulative categorized expense (positive) across the window, per day. */
  expenses: number[];
  /** Cumulative net (income − expenses), per day. */
  net: number[];
}

// Cumulative categorized income / expense / net over the active date-range
// filter (same exclusions useFinanceStats applies). When no filter is set the
// window spans the available transactions, falling back to the trailing 30
// days when there are none — so the line lines up with the cards' totals.
export function buildFlowSeries(
  allTransactions: Transaction[],
  transactionCategoryMap: Record<string, string>,
  categories: CategoryLike[],
  fromUi?: string,
  toUi?: string,
): FlowSeries {
  // Pre-filter to the transactions that count toward the cards' totals.
  const included: { day: string; amount: number }[] = [];
  for (const tx of allTransactions) {
    const amount = getTransactionAmount(tx);
    if (isNaN(amount)) continue;
    const catId = transactionCategoryMap[getStableTxId(tx)];
    const cat = catId ? categories.find((c) => c.id === catId) : null;
    if (!catId || !cat || cat.system === "ignore") continue;
    const day = txDayKey(tx);
    if (!day) continue;
    included.push({ day, amount });
  }

  let days: string[];
  const win = uiRangeToIso(fromUi, toUi);
  if (win) {
    days = daysBetween(win.start, win.end);
  } else if (included.length > 0) {
    let min = included[0].day;
    let max = included[0].day;
    for (const it of included) {
      if (it.day < min) min = it.day;
      if (it.day > max) max = it.day;
    }
    days = daysBetween(min, max);
  } else {
    days = lastNDays();
  }
  if (days.length === 0) days = lastNDays();

  const dayIndex = new Map(days.map((d, i) => [d, i]));
  const dailyIncome = new Array(days.length).fill(0);
  const dailyExpense = new Array(days.length).fill(0);

  for (const { day, amount } of included) {
    const i = dayIndex.get(day);
    if (i === undefined) continue; // outside the active window
    if (amount >= 0) dailyIncome[i] += amount;
    else dailyExpense[i] += Math.abs(amount);
  }

  const income: number[] = [];
  const expenses: number[] = [];
  const net: number[] = [];
  let ci = 0;
  let ce = 0;
  for (let i = 0; i < days.length; i++) {
    ci += dailyIncome[i];
    ce += dailyExpense[i];
    income.push(ci);
    expenses.push(ce);
    net.push(ci - ce);
  }

  return { days, income, expenses, net };
}
