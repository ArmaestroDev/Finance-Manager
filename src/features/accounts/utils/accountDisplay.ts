// Display helpers shared by the account screens / modals (desktop + mobile).
import type { Strings } from "@/src/constants/Strings";
import type { Transaction } from "@/src/services/enableBanking";
import { formatDate, formatWeekday, localeFor } from "@/src/shared/utils/date";
import {
  CASH_ACCOUNT_ID,
  DEFAULT_CASH_ACCOUNT_NAME,
  type AccountCategory,
  type UnifiedAccount,
} from "../context/AccountsContext";

type I18n = typeof Strings.de;

export const ACCOUNT_CATEGORIES: readonly AccountCategory[] = ["Giro", "Savings", "Stock"];

/** Localized name of an account category ("Savings" → "Spar"). */
export function accountCategoryLabel(cat: AccountCategory, i18n: I18n): string {
  if (cat === "Savings") return i18n.cat_savings;
  if (cat === "Stock") return i18n.cat_stock;
  return i18n.cat_giro;
}

/** One-line description of an account category for the category picker. */
export function accountCategoryHint(cat: AccountCategory, i18n: I18n): string {
  if (cat === "Savings") return i18n.acct_cat_savings_hint;
  if (cat === "Stock") return i18n.acct_cat_stock_hint;
  return i18n.acct_cat_giro_hint;
}

/** Bank column / pill text. Manual accounts are stored with the literal
 *  bankName "Manual" / "Manual Account" (kept for data compatibility) —
 *  show it localized. */
const STORED_MANUAL_BANK_NAMES = new Set(["Manual", "Manual Account"]);

export function accountBankLabel(
  account: Pick<UnifiedAccount, "type" | "bankName">,
  i18n: I18n,
): string | undefined {
  if (account.type === "manual" && (!account.bankName || STORED_MANUAL_BANK_NAMES.has(account.bankName))) {
    return i18n.acct_src_manual;
  }
  return account.bankName || undefined;
}

/** Account name for display: the auto-created cash account keeps its stored
 *  English default name but is shown in the UI language. */
export function accountDisplayName(account: Pick<UnifiedAccount, "id" | "name">, i18n: I18n): string {
  if (account.id === CASH_ACCOUNT_ID && account.name === DEFAULT_CASH_ACCOUNT_NAME) return i18n.cash_at_hand;
  return account.name;
}

/** "3 accounts" / "1 account" (localized). */
export function accountCountLabel(count: number, i18n: I18n): string {
  return (count === 1 ? i18n.acct_count_one : i18n.acct_count).replace("{count}", String(count));
}

/** "12 transactions" / "1 transaction" (localized). */
export function transactionCountLabel(count: number, i18n: I18n): string {
  return (count === 1 ? i18n.tx_count_one : i18n.tx_count_many).replace("{count}", String(count));
}

/** "5 accounts across 2 banks" (localized, singular-aware). */
export function accountsSummaryLabel(accounts: number, banks: number, i18n: I18n): string {
  const banksLabel = (banks === 1 ? i18n.bank_count_one : i18n.bank_count_many).replace(
    "{count}",
    String(banks),
  );
  return i18n.acct_summary_fmt
    .replace("{accounts}", accountCountLabel(accounts, i18n))
    .replace("{banks}", banksLabel);
}

/** Date-range chip label ("All time" when no range is set). */
export function dateRangeLabel(from: string, to: string, i18n: I18n): string {
  if (!from || !to) return i18n.range_all_time;
  return `${from} → ${to}`;
}

/** Group header for a transaction day: "12.10.2026 · Montag" (weekday in the UI language). */
export function formatGroupHeader(iso: string, i18n: I18n, language: "en" | "de"): string {
  if (!iso) return i18n.unknown_date;
  const date = formatDate(iso);
  const weekday = formatWeekday(iso, true, localeFor(language));
  return weekday ? `${date} · ${weekday}` : date;
}

export function currencySymbol(currency: string): string {
  if (currency === "EUR") return "€";
  if (currency === "USD") return "$";
  if (currency === "GBP") return "£";
  return currency;
}

/** Imported rows carry an app-local `source` ("pdf" / "csv"); live bank rows don't. */
export function transactionSource(tx: Transaction): string | undefined {
  const source = (tx as Transaction & { source?: unknown }).source;
  return source == null ? undefined : String(source);
}
