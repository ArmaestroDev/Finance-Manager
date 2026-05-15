// Shared time-series helpers for the interactive sparklines.
// The window follows the active UI date-range filter; when no filter is set
// the caller derives a sensible fallback (span of available data, else the
// trailing 30 days).

import { toApiDate } from "./date";

export const SPARK_FALLBACK_DAYS = 30;
// Safety cap so an "all time" / pathological range can't build a runaway array.
const MAX_DAYS = 1830; // ~5 years

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Trailing N days as `YYYY-MM-DD`, oldest → newest, ending today (local time).
export function lastNDays(n = SPARK_FALLBACK_DAYS): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(isoDay(d));
  }
  return days;
}

// Inclusive `YYYY-MM-DD` axis between two ISO dates, oldest → newest.
export function daysBetween(
  startIso: string,
  endIso: string,
  maxDays = MAX_DAYS,
): string[] {
  if (!startIso || !endIso) return [];
  let s = startIso;
  let e = endIso;
  if (s > e) [s, e] = [e, s];
  const start = new Date(`${s}T00:00:00`);
  const end = new Date(`${e}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end && out.length < maxDays) {
    out.push(isoDay(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

// Convert the UI filter range (DD.MM.YYYY) to ISO bounds, or null for
// all-time / unset / invalid.
export function uiRangeToIso(
  fromUi?: string,
  toUi?: string,
): { start: string; end: string } | null {
  if (!fromUi || !toUi) return null;
  const start = toApiDate(fromUi);
  const end = toApiDate(toUi);
  if (!start || !end) return null;
  return { start, end };
}

// Day key (`YYYY-MM-DD`) of a transaction, from booking or value date.
export function txDayKey(tx: any): string {
  return String(tx?.booking_date || tx?.value_date || "").slice(0, 10);
}
