// Deterministic detection of transfers between the user's own accounts.
// Runs before AI categorization: obvious self-transfers go straight to the
// system "Ignore" category (reliable, and no tokens spent on them).
import type { Transaction } from "../../../services/enableBanking";
import { getTransactionAmount } from "./transactions";

/** What the app knows about the user's own accounts. */
export interface OwnIdentity {
  /** Normalized IBANs (upper case, no spaces). */
  ibans: Set<string>;
  /** Account holder names (from the bank's account data), normalized word sets. */
  holderNames: string[][];
  /** Display names of the user's accounts (for the AI prompt only). */
  accountNames: string[];
  /** Raw holder names (for the AI prompt). */
  holderNamesRaw: string[];
}

interface AccountLike {
  name?: string;
  iban?: string;
  /** Raw Enable Banking account (connected accounts only). */
  account?: { name?: string; account_id?: { iban?: string } };
}

export const normalizeIban = (iban: string | null | undefined): string =>
  (iban || "").replace(/\s+/g, "").toUpperCase();

const nameWords = (name: string): string[] =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(dr|prof|herr|frau|mr|mrs|ms)\b\.?/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .sort();

const SELF_PLACEHOLDER = "self";

export function buildOwnIdentity(accounts: AccountLike[], extraHolderNames: string[] = []): OwnIdentity {
  const ibans = new Set<string>();
  const holderRaw = new Set<string>();
  const accountNames: string[] = [];
  for (const acc of accounts) {
    for (const iban of [acc.iban, acc.account?.account_id?.iban]) {
      const n = normalizeIban(iban);
      if (n.length >= 15) ibans.add(n);
    }
    const holder = acc.account?.name?.trim();
    if (holder) holderRaw.add(holder);
    if (acc.name?.trim()) accountNames.push(acc.name.trim());
  }
  for (const n of extraHolderNames) if (n.trim()) holderRaw.add(n.trim());
  const holderNames = [...holderRaw]
    .map(nameWords)
    // A single word ("Max") is too weak to call something a self-transfer.
    .filter((w) => w.length >= 2);
  return { ibans, holderNames, accountNames, holderNamesRaw: [...holderRaw] };
}

const sameWords = (a: string[], b: string[]) => a.length === b.length && a.every((w, i) => w === b[i]);

// "Umbuchung" / "Übertrag" are what German banks print for moves between a
// customer's own accounts ("Eigenübertrag", "Übertrag auf Tagesgeld").
// Explicit letter class instead of \b / \p{L}: \b treats "ü" as a non-word
// character, and Unicode property escapes aren't available on every engine.
const SELF_REFERENCE_RE =
  /(?:^|[^a-zäöüß])(umbuchung|eigen(?:e|er)?\s*(?:ü|ue|u)bertrag|(?:ü|ue)bertrag|kontoübertrag|eigene?s?\s+konto|own\s+account|between\s+own\s+accounts)(?![a-zäöüß])/i;

export type SelfTransferReason = "iban" | "same-name" | "holder-name" | "reference";

/**
 * Why `tx` is a transfer between the user's own accounts, or null.
 *  - "iban": the counterparty account is one of the user's IBANs;
 *  - "same-name": creditor and debtor are the same person;
 *  - "holder-name": the counterparty is the account holder;
 *  - "reference": the bank marks it as an own-account booking.
 */
export function selfTransferReason(tx: Transaction, own: OwnIdentity): SelfTransferReason | null {
  const amount = getTransactionAmount(tx);
  const outgoing = amount < 0;
  const counterpartyIban = normalizeIban((outgoing ? tx.creditor_account : tx.debtor_account)?.iban);
  if (counterpartyIban && own.ibans.has(counterpartyIban)) return "iban";

  const cName = tx.creditor?.name?.trim() ?? "";
  const dName = tx.debtor?.name?.trim() ?? "";
  if (
    cName &&
    dName &&
    cName.toLowerCase() !== SELF_PLACEHOLDER &&
    sameWords(nameWords(cName), nameWords(dName))
  ) {
    return "same-name";
  }

  const counterparty = outgoing ? cName : dName;
  if (counterparty && counterparty.toLowerCase() !== SELF_PLACEHOLDER) {
    const words = nameWords(counterparty);
    if (own.holderNames.some((h) => sameWords(h, words))) return "holder-name";
  }

  const text = [counterparty, ...(tx.remittance_information ?? [])].join(" ");
  if (SELF_REFERENCE_RE.test(text)) return "reference";
  return null;
}

export const isSelfTransfer = (tx: Transaction, own: OwnIdentity) => selfTransferReason(tx, own) !== null;
