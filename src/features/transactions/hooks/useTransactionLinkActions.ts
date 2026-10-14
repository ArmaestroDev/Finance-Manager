import { useCallback } from "react";
import type { Transaction } from "../../../services/enableBanking";
import { useSettings } from "../../../shared/context/SettingsContext";
import { SYSTEM_IGNORE_ID, useCategories } from "../context/CategoriesContext";
import { useTransactionLinks } from "../context/TransactionLinksContext";
import { useTransactionsContext } from "../context/TransactionsContext";
import { getStableTxId, pickTransactionTitle } from "../utils/transactions";

/**
 * The multi-context link workflows shared by the desktop and mobile account
 * detail screens (links, categories and manual transactions each live in
 * their own context).
 */
export function useTransactionLinkActions() {
  const { i18n } = useSettings();
  const { linkTransaction, unlinkTransaction, markAutoCreated, unmarkAutoCreated, getAutoCreatedInfo } =
    useTransactionLinks();
  const { assignCategory } = useCategories();
  const { addManualTransaction, deleteManualTransactionById } = useTransactionsContext();

  /** Link `childTxId` (a reimbursement) to an expense; the child is ignored in stats. */
  const linkToExpense = useCallback(
    async (childTxId: string, parentTxId: string) => {
      await linkTransaction(childTxId, parentTxId);
      await assignCategory(childTxId, SYSTEM_IGNORE_ID);
    },
    [linkTransaction, assignCategory],
  );

  /** Link several reimbursements to one expense (each child is ignored in stats). */
  const linkReimbursements = useCallback(
    async (childTxIds: string[], parentTxId: string) => {
      for (const childId of childTxIds) {
        if (childId === parentTxId) continue;
        await linkTransaction(childId, parentTxId);
        await assignCategory(childId, SYSTEM_IGNORE_ID);
      }
    },
    [linkTransaction, assignCategory],
  );

  /**
   * "Pay from account": record `amount` leaving a manual account as a linked,
   * ignored child of the expense (see DECISIONS.md §1.8).
   */
  const payFromAccount = useCallback(
    async (expenseTx: Transaction, accountId: string, amount: string) => {
      const title = i18n.tx_linked_payment_title.replace("{title}", pickTransactionTitle(expenseTx));
      const txId = await addManualTransaction(accountId, title, `-${amount}`);
      if (!txId) return;
      await linkTransaction(txId, getStableTxId(expenseTx));
      await markAutoCreated(txId, accountId);
      await assignCategory(txId, SYSTEM_IGNORE_ID);
    },
    [i18n.tx_linked_payment_title, addManualTransaction, linkTransaction, markAutoCreated, assignCategory],
  );

  /** Undo a link. Auto-created "pay from account" children are deleted again. */
  const unlink = useCallback(
    async (childTxId: string, parentTxId: string) => {
      const autoInfo = getAutoCreatedInfo(childTxId);
      if (autoInfo) {
        await deleteManualTransactionById(autoInfo.accountId, childTxId);
        await unmarkAutoCreated(childTxId);
      }
      await unlinkTransaction(childTxId, parentTxId);
      await assignCategory(childTxId, null);
    },
    [getAutoCreatedInfo, deleteManualTransactionById, unmarkAutoCreated, unlinkTransaction, assignCategory],
  );

  return { linkToExpense, linkReimbursements, payFromAccount, unlink };
}
