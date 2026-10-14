// Fuzzy duplicate detection between transaction sources (bank API, PDF/CSV
// statements, manual entries). Different sources describe the same booking
// with different ids, titles and sometimes a booking-vs-value date, so the
// match is: same signed amount (cents) + close date + (for looser date
// matches) a shared counterparty word. Matching is one-to-one, so two real
// 3.50 € coffees on the same day stay two transactions.
import type { Transaction } from "../../../services/enableBanking";
import { getStableTxId, getTransactionAmount, pickTransactionTitle } from "./transactions";

const DAY_MS = 86_400_000;

const dayNumber = (iso: string | undefined): number => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS : NaN;
};

const dayDiff = (a: Transaction, b: Transaction): number => {
  let best = Infinity;
  for (const da of [a.booking_date, a.value_date]) {
    for (const db of [b.booking_date, b.value_date]) {
      const d = Math.abs(dayNumber(da) - dayNumber(db));
      if (Number.isFinite(d) && d < best) best = d;
    }
  }
  return best;
};

const STOP = new Set(["gmbh", "sepa", "lastschrift", "gutschrift", "ueberweisung", "uberweisung", "kartenzahlung", "visa", "debit", "self"]);

const words = (tx: Transaction): Set<string> =>
  new Set(
    [pickTransactionTitle(tx), tx.creditor?.name, tx.debtor?.name, ...(tx.remittance_information ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );

const sharesWord = (a: Set<string>, b: Set<string>) => {
  for (const w of a) if (b.has(w)) return true;
  return false;
};

const cents = (tx: Transaction) => Math.round(getTransactionAmount(tx) * 100);

/**
 * Pair each `incoming` transaction with at most one `existing` duplicate.
 * Returns incomingIndex → existingIndex.
 */
export function matchDuplicates(existing: Transaction[], incoming: Transaction[]): Map<number, number> {
  const byAmount = new Map<number, number[]>();
  existing.forEach((tx, i) => {
    const c = cents(tx);
    if (!Number.isFinite(c)) return;
    const list = byAmount.get(c);
    if (list) list.push(i);
    else byAmount.set(c, [i]);
  });
  const wordCache = new Map<Transaction, Set<string>>();
  const wordsOf = (tx: Transaction) => {
    let w = wordCache.get(tx);
    if (!w) {
      w = words(tx);
      wordCache.set(tx, w);
    }
    return w;
  };

  const used = new Set<number>();
  const result = new Map<number, number>();
  incoming.forEach((tx, inIdx) => {
    const candidates = byAmount.get(cents(tx));
    if (!candidates) return;
    let best = -1;
    let bestRank = Infinity;
    for (const exIdx of candidates) {
      if (used.has(exIdx)) continue;
      const d = dayDiff(tx, existing[exIdx]);
      if (d > 3) continue;
      const named = sharesWord(wordsOf(tx), wordsOf(existing[exIdx]));
      // Same day always matches; ±1 day needs no name evidence; up to ±3
      // days (booking vs value date, weekend shifts) needs a shared word.
      if (d > 1 && !named) continue;
      const rank = d * 2 + (named ? 0 : 1);
      if (rank < bestRank) {
        bestRank = rank;
        best = exIdx;
      }
    }
    if (best >= 0) {
      used.add(best);
      result.set(inIdx, best);
    }
  });
  return result;
}

/** True for rows that came from a PDF/CSV statement import. */
export const isStatementTx = (tx: Transaction): boolean =>
  !!tx.statement_id || /^import_(pdf|csv)_/.test(tx.transaction_id || "");

export interface MergeResult {
  merged: Transaction[];
  /** Statement-row id → bank-API id it was replaced by. */
  remap: Record<string, string>;
}

/**
 * Merge freshly fetched bank-API transactions into an account's cache.
 * Same stable id → the API version wins. A statement-imported row that is the
 * same booking as an API row (fuzzy match) is replaced by the API row, and
 * its id is reported in `remap` so categories and links can follow it.
 */
export function mergeApiIntoCache(cached: Transaction[], apiTxs: Transaction[]): MergeResult {
  const apiIds = new Set(apiTxs.map(getStableTxId));
  const keep: Transaction[] = [];
  const statementRows: Transaction[] = [];
  for (const tx of cached) {
    if (apiIds.has(getStableTxId(tx))) continue; // replaced by the API version
    if (isStatementTx(tx)) statementRows.push(tx);
    else keep.push(tx);
  }

  // Only API rows that are new to the cache can be statement duplicates.
  const cachedIds = new Set(cached.map(getStableTxId));
  const fresh = apiTxs.filter((t) => !cachedIds.has(getStableTxId(t)));
  const pairs = matchDuplicates(statementRows, fresh);
  const remap: Record<string, string> = {};
  const replaced = new Set<number>();
  for (const [freshIdx, stmtIdx] of pairs) {
    replaced.add(stmtIdx);
    remap[getStableTxId(statementRows[stmtIdx])] = getStableTxId(fresh[freshIdx]);
  }

  const byId = new Map<string, Transaction>();
  for (const tx of keep) byId.set(getStableTxId(tx), tx);
  statementRows.forEach((tx, i) => {
    if (!replaced.has(i)) byId.set(getStableTxId(tx), tx);
  });
  for (const tx of apiTxs) byId.set(getStableTxId(tx), tx);
  return { merged: Array.from(byId.values()), remap };
}
