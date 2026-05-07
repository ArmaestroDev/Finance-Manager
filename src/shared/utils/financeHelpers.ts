// Re-export all pure utility functions from a single entry point
export { toUiDate, toApiDate } from "./date";
export {
  getStableTxId,
  getTransactionAmount,
  cleanRemittanceInfo,
  pickTransactionTitle,
} from "../../features/transactions/utils/transactions";

export const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};
