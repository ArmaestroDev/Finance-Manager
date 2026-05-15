import type { Transaction } from "@/src/services/enableBanking";
import {
  daysBetween,
  lastNDays,
  txDayKey,
  uiRangeToIso,
} from "@/src/shared/utils/series";
import { getTransactionAmount } from "@/src/features/transactions/utils/transactions";

export interface BalanceSeries {
  /** `YYYY-MM-DD`, oldest → newest. */
  days: string[];
  /** Reconstructed end-of-day balance for each day. */
  balance: number[];
}

// Reconstruct end-of-day balance across the active date-range filter from the
// current balance and the account's transactions:
//   balance(day) = currentBalance − Σ(amount of every tx dated after that day)
// (over all transactions, so a window ending in the past is still anchored
// correctly to the live balance). Window follows the filter; with no filter it
// spans the account's transactions, else the trailing 30 days. No transactions
// → a flat line at the current balance (still hoverable).
export function buildAccountBalanceSeries(
  currentBalance: number,
  txs: Transaction[] | undefined,
  fromUi?: string,
  toUi?: string,
): BalanceSeries {
  let days: string[];
  const win = uiRangeToIso(fromUi, toUi);
  if (win) {
    days = daysBetween(win.start, win.end);
  } else if (txs && txs.length > 0) {
    let min = txDayKey(txs[0]);
    let max = min;
    for (const tx of txs) {
      const k = txDayKey(tx);
      if (!k) continue;
      if (!min || k < min) min = k;
      if (k > max) max = k;
    }
    days = min && max ? daysBetween(min, max) : lastNDays();
  } else {
    days = lastNDays();
  }
  if (days.length === 0) days = lastNDays();

  if (!txs || txs.length === 0) {
    return { days, balance: days.map(() => currentBalance) };
  }

  const end = days[days.length - 1];
  const byDay = new Map<string, number>();
  let afterEnd = 0;
  for (const tx of txs) {
    const a = getTransactionAmount(tx);
    if (isNaN(a)) continue;
    const k = txDayKey(tx);
    if (!k) continue;
    if (k > end) afterEnd += a;
    else byDay.set(k, (byDay.get(k) ?? 0) + a);
  }

  // balance(day) = current − Σ(amount of tx dated strictly after that day),
  // walking from the newest day backwards.
  const balance = new Array<number>(days.length);
  let afterSum = afterEnd;
  for (let i = days.length - 1; i >= 0; i--) {
    balance[i] = currentBalance - afterSum;
    afterSum += byDay.get(days[i]) ?? 0;
  }

  return { days, balance };
}
