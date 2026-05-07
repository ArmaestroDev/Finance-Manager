import { type Transaction } from "../../../services/enableBanking";

export const getStableTxId = (tx: any) => {
    return (
        tx.transaction_id ||
        `gen_${tx.booking_date || ""}_${tx.transaction_amount?.amount ?? tx.amount ?? ""}_${tx.creditor?.name || tx.debtor?.name || ""}`
    );
};

export const getTransactionAmount = (tx: any) => {
    let amount = parseFloat(tx.transaction_amount?.amount ?? tx.amount ?? "0");

    if (tx.credit_debit_indicator === "DBIT") {
        return amount > 0 ? -amount : amount;
    }
    if (tx.credit_debit_indicator === "CRDT") {
        return amount < 0 ? -amount : amount;
    }

    // Fallback: If no indicator but there is a creditor (and no debtor), it's a payment we made
    if (amount > 0 && tx.creditor?.name && !tx.debtor?.name) {
        return -amount;
    }

    return amount;
};

const SEPA_NOISE_RE =
  /^(mandate?reference|creditorid|enduserref|enduserreference|sepa[- ]?reference|reference)\b/i;

const SEPA_KV_STRIP =
  /\b(mandate?reference|creditorid|enduserref|enduserreference|sepa[- ]?reference)\s*:\s*[^,;\s]*/gi;

export const cleanRemittanceInfo = (info?: string[]): string | null => {
  if (!info || info.length === 0) return null;
  const text = info.join(" ");
  const remittanceMatch = text.match(/remittanceinformation:(.*)/i);
  const base = remittanceMatch?.[1] ?? text;
  return (
    base
      .replace(SEPA_KV_STRIP, "")
      .replace(/[,;]{2,}/g, ",")
      .replace(/^[,\s;]+|[,\s;]+$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim() || null
  );
};

export const pickTransactionTitle = (tx: any): string => {
  const c = tx?.creditor?.name?.trim?.();
  if (c) return c;
  const d = tx?.debtor?.name?.trim?.();
  if (d) return d;

  const cleaned = cleanRemittanceInfo(tx?.remittance_information);
  if (cleaned && !SEPA_NOISE_RE.test(cleaned)) return cleaned;

  const flat = tx?.creditor_name ?? tx?.debtor_name ?? tx?.title;
  if (typeof flat === "string" && flat.trim()) return flat.trim();

  if (Array.isArray(tx?.remittance_information)) {
    const stripped = tx.remittance_information
      .join(" ")
      .replace(/\b(mandate?reference|creditorid|enduserref|enduserreference|sepa[- ]?reference|reference):[^\s,]*/gi, "")
      .replace(/[,;]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped) return stripped;
  }

  return "Transaction";
};
