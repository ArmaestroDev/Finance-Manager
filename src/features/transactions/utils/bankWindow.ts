// How far back the bank API (Enable Banking / PSD2) can be asked for
// transactions. Enable Banking doesn't publish a per-bank limit; PSD2 banks
// must serve 90 days without a fresh SCA, and many reject anything older with
// a 422 (WRONG_TRANSACTIONS_PERIOD). Older history comes from imported
// statements, which live in the same per-account cache.
import { todayApiDate } from "../../../shared/utils/date";

export const BANK_HISTORY_DAYS = 90;

/** First day (`YYYY-MM-DD`) the bank API is expected to serve. */
export function bankWindowStart(today: Date = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (BANK_HISTORY_DAYS - 1));
  return todayApiDate(d);
}

export interface ApiRangePlan {
  /** Range to request first. */
  first: { from: string; to: string } | null;
  /** Clamped range to retry with when the first request is rejected as too old. */
  fallback: { from: string; to: string } | null;
}

/**
 * Plan the API request for a requested [from, to] range (API dates).
 *  - Entirely inside the window → ask for it as is.
 *  - Starts before the window → ask for the full range once (some banks
 *    serve more right after consent); on rejection retry from the window
 *    start. Once an account is known to be limited, go straight to the
 *    clamped range.
 *  - Ends before the window → ask only when the account isn't known to be
 *    limited; otherwise there's nothing the API can add.
 */
export function planApiRange(
  from: string,
  to: string,
  windowStart: string,
  knownLimited: boolean,
): ApiRangePlan {
  if (!from || from >= windowStart) return { first: { from, to }, fallback: null };
  const clamped = to >= windowStart ? { from: windowStart, to } : null;
  if (knownLimited) return { first: clamped, fallback: null };
  return { first: { from, to }, fallback: clamped };
}

/** True for API errors that mean "this date range is not available". */
export function isRangeRejection(err: unknown): boolean {
  const e = err as { status?: number; message?: string } | undefined;
  if (!e) return false;
  if (e.status === 422) return true;
  const msg = e.message || "";
  return /\(422\)|WRONG_TRANSACTIONS_PERIOD|transactions period|date_from/i.test(msg);
}

/** Show the "import statements for older data" hint when data starts more than this many days after `from`. */
export const COVERAGE_SLACK_DAYS = 7;

export function addDaysApi(iso: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return todayApiDate(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
}
