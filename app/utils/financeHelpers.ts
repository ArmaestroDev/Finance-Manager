// Re-export all pure utility functions from a single entry point
export { toUiDate, toApiDate } from "./date";
export { getStableTxId, getTransactionAmount } from "./transactions";

export const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export const cleanRemittanceInfo = (info?: string[]) => {
  if (!info || info.length === 0) return null;
  const text = info.join(" ");
  const remittanceMatch = text.match(/remittanceinformation:(.*)/i);
  if (remittanceMatch && remittanceMatch[1]) {
    return remittanceMatch[1].trim();
  }
  return text;
};
