
/**
 * The loose transaction shape these helpers accept: Enable Banking
 * transactions, manual/imported ones, and a few legacy flat fields
 * (`amount`, `creditor_name`, `debtor_name`, `title`) from older stored data.
 */
export interface TxLike {
    transaction_id?: string;
    booking_date?: string;
    value_date?: string;
    transaction_amount?: { amount?: string | number };
    amount?: string | number;
    credit_debit_indicator?: string;
    creditor?: { name?: string } | null;
    debtor?: { name?: string } | null;
    remittance_information?: string[];
    creditor_name?: string;
    debtor_name?: string;
    title?: string;
}

export const getStableTxId = (tx: TxLike): string => {
    return (
        tx.transaction_id ||
        `gen_${tx.booking_date || ""}_${tx.transaction_amount?.amount ?? tx.amount ?? ""}_${tx.creditor?.name || tx.debtor?.name || ""}`
    );
};

export const getTransactionAmount = (tx: TxLike): number => {
    const amount = parseFloat(String(tx.transaction_amount?.amount ?? tx.amount ?? "0"));

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

// "Self" is the placeholder written for the account-owner side of manual,
// CSV and PDF-imported transactions — never a meaningful title.
const SELF_PLACEHOLDER = "self";
const IMPORTED_PREFIX_RE = /^\[Imported\]\s*/;
const counterpartyName = (party: TxLike["creditor"]): string | null => {
  // Older CSV imports stored the "[Imported]" marker in the name itself.
  const raw = party?.name;
  const n = typeof raw === "string" ? raw.trim().replace(IMPORTED_PREFIX_RE, "") : "";
  if (!n || n.toLowerCase() === SELF_PLACEHOLDER) return null;
  return n;
};

export const pickTransactionTitle = (tx: TxLike): string => {
  // The counterparty is the creditor for outgoing money and the debtor for
  // incoming money. Checking the creditor first regardless of sign showed
  // "Self" for every manual/imported income, and the account holder's own
  // name for incoming bank transfers.
  let isIncome = false;
  try {
    isIncome = getTransactionAmount(tx) > 0;
  } catch {
    isIncome = false;
  }
  const primary = counterpartyName(isIncome ? tx?.debtor : tx?.creditor);
  if (primary) return primary;
  const secondary = counterpartyName(isIncome ? tx?.creditor : tx?.debtor);
  if (secondary) return secondary;

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
