// Pure helpers for linked transactions (reimbursements and "pay from
// account" payments). Kept free of React so the math can be unit-tested and
// so every screen/stat uses the same rules (DECISIONS.md §1.8, §4.4).
import type { Transaction } from "../../../services/enableBanking";
import { getStableTxId, getTransactionAmount, pickTransactionTitle } from "./transactions";

export interface LinkSummary {
  parentId: string;
  /** |parent amount|; 0 when the parent isn't in the cache. */
  original: number;
  /** Sum of the positive children (reimbursements). */
  reimbursed: number;
  /** Sum of |negative children| ("pay from account" payments). */
  funded: number;
  /** What the expense really cost the user: max(0, original − reimbursed). */
  net: number;
  /** Reimbursed beyond the expense (shown as a hint, never counted). */
  over: number;
  reimbursementIds: string[];
  fundingIds: string[];
  /** Linked children that aren't in the on-device cache (deleted / not loaded). */
  missingIds: string[];
}

export interface LinkIndex {
  summaries: Map<string, LinkSummary>;
  childToParent: Map<string, string>;
}

export const EMPTY_LINK_INDEX: LinkIndex = { summaries: new Map(), childToParent: new Map() };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Resolve the link map (parentId → childIds) against a transaction lookup
 * that should cover every stored transaction of every account, regardless of
 * the active date range — a reimbursement may land on another account or a
 * few days after the range ends.
 */
export function buildLinkIndex(
  links: Record<string, string[]>,
  lookup: (txId: string) => Transaction | undefined,
): LinkIndex {
  const summaries = new Map<string, LinkSummary>();
  const childToParent = new Map<string, string>();
  for (const [parentId, childIds] of Object.entries(links)) {
    if (!childIds || childIds.length === 0) continue;
    const parent = lookup(parentId);
    const original = parent ? Math.abs(getTransactionAmount(parent)) : 0;
    let reimbursed = 0;
    let funded = 0;
    const reimbursementIds: string[] = [];
    const fundingIds: string[] = [];
    const missingIds: string[] = [];
    for (const childId of childIds) {
      childToParent.set(childId, parentId);
      const child = lookup(childId);
      if (!child) {
        missingIds.push(childId);
        continue;
      }
      const amount = getTransactionAmount(child);
      if (!Number.isFinite(amount)) continue;
      if (amount > 0) {
        reimbursed += amount;
        reimbursementIds.push(childId);
      } else {
        funded += Math.abs(amount);
        fundingIds.push(childId);
      }
    }
    reimbursed = round2(reimbursed);
    funded = round2(funded);
    summaries.set(parentId, {
      parentId,
      original,
      reimbursed,
      funded,
      net: round2(Math.max(0, original - reimbursed)),
      over: round2(Math.max(0, reimbursed - original)),
      reimbursementIds,
      fundingIds,
      missingIds,
    });
  }
  return { summaries, childToParent };
}

/**
 * The amount a list row shows: an expense with reimbursements shows the
 * user's share (−net); everything else shows its booked amount.
 */
export function displayAmountFor(tx: Transaction, index: LinkIndex, txId = getStableTxId(tx)): number {
  const amount = getTransactionAmount(tx);
  if (amount >= 0) return amount;
  const s = index.summaries.get(txId);
  if (!s || s.reimbursed <= 0) return amount;
  return -s.net;
}

/**
 * The amount a transaction contributes to totals (stats, budgets, flow
 * series, list subtotals), or `null` when it must not count at all:
 *  - every linked child is excluded — a reimbursement is not income, and a
 *    "pay from account" payment only moves money between the user's pots;
 *  - an expense with reimbursements counts with its net share.
 * Category rules (uncategorized / Ignore) are applied by the caller.
 */
export function statAmountFor(tx: Transaction, index: LinkIndex, txId = getStableTxId(tx)): number | null {
  if (index.childToParent.has(txId)) return null;
  const amount = getTransactionAmount(tx);
  if (!Number.isFinite(amount)) return null;
  return displayAmountFor(tx, index, txId);
}

// ── Candidate ranking for the link picker ──

export interface LocatedTx {
  tx: Transaction;
  txId: string;
  accountId: string;
}

export interface RankedCandidate extends LocatedTx {
  amount: number;
  /** Days from the anchor transaction (positive = after). */
  dayOffset: number;
  score: number;
  suggested: boolean;
}

const DAY_MS = 86_400_000;
const txDate = (tx: Transaction) => tx.booking_date || tx.value_date || "";
const dayNumber = (iso: string): number => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS : NaN;
};

const normName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

/** True when any word (≥3 chars) of `name` appears in the transaction's title/reference. */
export function mentionsName(tx: Transaction, name: string): boolean {
  const words = normName(name);
  if (words.length === 0) return false;
  const hay = new Set(
    normName(
      [pickTransactionTitle(tx), tx.creditor?.name, tx.debtor?.name, ...(tx.remittance_information ?? [])]
        .filter(Boolean)
        .join(" "),
    ),
  );
  return words.some((w) => hay.has(w));
}

interface RankOptions {
  /** Ids already used as a child or parent somewhere (excluded / allowed per side). */
  linkIndex: LinkIndex;
  /** Names of people from the debts screen — a payer match is a strong signal. */
  personNames?: string[];
  /** Suggestion window after the expense, in days. */
  windowDays?: number;
}

/**
 * Incoming transactions that could reimburse `expense`, best first.
 * Suggested = within −7…+windowDays days and not larger than what's left
 * to reimburse; the rest stays searchable below.
 */
export function rankReimbursementCandidates(
  expense: LocatedTx,
  pool: LocatedTx[],
  { linkIndex, personNames = [], windowDays = 60 }: RankOptions,
): RankedCandidate[] {
  const expDay = dayNumber(txDate(expense.tx));
  const summary = linkIndex.summaries.get(expense.txId);
  const original = Math.abs(getTransactionAmount(expense.tx));
  const remaining = Math.max(0, original - (summary?.reimbursed ?? 0));
  const out: RankedCandidate[] = [];
  for (const c of pool) {
    if (c.txId === expense.txId) continue;
    if (linkIndex.childToParent.has(c.txId) || linkIndex.summaries.has(c.txId)) continue;
    const amount = getTransactionAmount(c.tx);
    if (!(amount > 0)) continue;
    const dayOffset = dayNumber(txDate(c.tx)) - expDay;
    const inWindow = Number.isFinite(dayOffset) && dayOffset >= -7 && dayOffset <= windowDays;
    const fits = amount <= remaining + 0.005;
    const person = personNames.some((n) => mentionsName(c.tx, n));
    let score = 0;
    if (inWindow) score += 50 - Math.min(40, Math.abs(dayOffset)) * 0.5;
    if (fits) score += 25;
    if (person) score += 30;
    out.push({ ...c, amount, dayOffset, score, suggested: inWindow && (fits || person) });
  }
  return sortCandidates(out);
}

/** Expenses an incoming transaction could reimburse (the reverse flow). */
export function rankExpenseCandidates(
  reimbursement: LocatedTx,
  pool: LocatedTx[],
  { linkIndex, personNames = [], windowDays = 60 }: RankOptions,
): RankedCandidate[] {
  const inDay = dayNumber(txDate(reimbursement.tx));
  const inAmount = getTransactionAmount(reimbursement.tx);
  const out: RankedCandidate[] = [];
  for (const c of pool) {
    if (c.txId === reimbursement.txId) continue;
    // A child can't become a parent; an existing parent can take more children.
    if (linkIndex.childToParent.has(c.txId)) continue;
    const amount = getTransactionAmount(c.tx);
    if (!(amount < 0)) continue;
    const dayOffset = dayNumber(txDate(c.tx)) - inDay; // negative = expense before
    const inWindow = Number.isFinite(dayOffset) && dayOffset <= 7 && dayOffset >= -windowDays;
    const s = linkIndex.summaries.get(c.txId);
    const remaining = Math.abs(amount) - (s?.reimbursed ?? 0);
    const fits = inAmount <= remaining + 0.005;
    const person = personNames.some((n) => mentionsName(reimbursement.tx, n));
    let score = 0;
    if (inWindow) score += 50 - Math.min(40, Math.abs(dayOffset)) * 0.5;
    if (fits) score += 25;
    if (s && s.reimbursed > 0) score += 10; // already shared with others
    if (person) score += 5;
    out.push({ ...c, amount, dayOffset, score, suggested: inWindow && fits });
  }
  return sortCandidates(out);
}

function sortCandidates(list: RankedCandidate[]): RankedCandidate[] {
  return list.sort((a, b) => {
    if (a.suggested !== b.suggested) return a.suggested ? -1 : 1;
    if (a.suggested) return b.score - a.score;
    return txDate(b.tx).localeCompare(txDate(a.tx));
  });
}
