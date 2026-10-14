import { useMemo, useState } from "react";
import { useAccounts, type AccountCategory } from "../../accounts/context/AccountsContext";
import { useBankStatements } from "../../import/context/BankStatementsContext";
import type { Transaction } from "../../../services/enableBanking";
import { useSettings } from "../../../shared/context/SettingsContext";
import { showAlert } from "../../../shared/utils/alert";
import { useCategories } from "../context/CategoriesContext";
import { useTransactionLinks } from "../context/TransactionLinksContext";
import { useTransactionsContext, type ImportResult } from "../context/TransactionsContext";

interface UseAccountTransactionsParams {
  id: string;
  type: "connected" | "manual";
}

/** Transactions + account-level actions for the account detail screens. */
export function useAccountTransactions({ id, type }: UseAccountTransactionsParams) {
  const { i18n } = useSettings();
  const { accounts, updateAccount, deleteManualAccount } = useAccounts();
  const {
    transactionsByAccount,
    isLoading: globalLoading,
    refreshTransactions,
    addManualTransaction,
    updateManualTransaction,
    deleteManualTransaction,
    importBankStatement,
    purgeAccountTransactions,
  } = useTransactionsContext();
  const { bulkAssignCategories } = useCategories();
  const { removeLinksFor } = useTransactionLinks();
  const { deleteStatementsForAccount } = useBankStatements();

  const [loading, setLoading] = useState(false);

  const account = accounts.find((a) => a.id === id);
  const category: AccountCategory = account?.category ?? "Giro";

  const transactions = useMemo(() => transactionsByAccount[id] || [], [transactionsByAccount, id]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      await refreshTransactions();
    } finally {
      setLoading(false);
    }
  };

  // ── Manual Transaction CRUD ──

  const handleAddTransaction = async (txTitle: string, txAmount: string) => {
    await addManualTransaction(id, txTitle, txAmount);
  };

  const handleUpdateTransaction = async (editingTx: Transaction, editTitle: string, editAmount: string) => {
    await updateManualTransaction(id, editingTx, editTitle, editAmount);
  };

  const handleDeleteTransaction = (editingTx: Transaction) => {
    showAlert(i18n.tx_delete_title, i18n.tx_delete_confirm, [
      { text: i18n.cancel, style: "cancel" },
      {
        text: i18n.delete,
        style: "destructive",
        onPress: () => {
          deleteManualTransaction(id, editingTx).catch((e) => console.error("Failed to delete transaction:", e));
        },
      },
    ]);
  };

  /**
   * CSV / one-off imports (not tracked as a "bank statement" — no source file
   * to manage). PDF imports go through the ImportQueue. Returns null (after
   * telling the user) when the import could not be stored.
   */
  const handleImportBankStatement = async (newTxs: Transaction[]): Promise<ImportResult | null> => {
    try {
      return await importBankStatement(id, newTxs, type === "manual");
    } catch (e) {
      console.error("Failed to import transactions:", e);
      showAlert(i18n.error_title, i18n.tx_import_failed);
      return null;
    }
  };

  // ── Account Category ──

  const updateCategoryValue = async (newCat: AccountCategory) => {
    // AccountsContext persists it to manual_accounts / account_metadata.
    if (account && account.category !== newCat) {
      await updateAccount({ ...account, category: newCat });
    }
  };

  // ── Delete Account ──

  // Removes the account and everything that references it: its stored
  // transactions, their category assignments and links, and its imported
  // statements. Each piece is cleaned up by the context that owns it.
  const deleteAccountCascade = async () => {
    const txIds = await purgeAccountTransactions(id, type === "manual");
    if (txIds.length > 0) {
      await bulkAssignCategories(Object.fromEntries(txIds.map((txId) => [txId, null])));
      await removeLinksFor(txIds);
    }
    await deleteStatementsForAccount(id);
    await deleteManualAccount(id);
  };

  const handleDeleteAccount = (onDeleteComplete: () => void) => {
    if (type !== "manual") return;
    showAlert(i18n.delete_account, i18n.delete_account_confirm, [
      { text: i18n.cancel, style: "cancel" },
      {
        text: i18n.delete,
        style: "destructive",
        onPress: () => {
          deleteAccountCascade()
            .then(onDeleteComplete)
            .catch((e) => console.error("Failed to delete account:", e));
        },
      },
    ]);
  };

  return {
    transactions,
    loading: globalLoading || loading,
    setLoading,
    refreshing: globalLoading,
    category,
    loadTransactions,
    handleAddTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleImportBankStatement,
    updateCategoryValue,
    handleDeleteAccount,
  };
}
