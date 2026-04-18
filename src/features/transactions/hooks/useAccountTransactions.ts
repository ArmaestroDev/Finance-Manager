import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useMemo } from "react";
import { Alert, Platform } from "react-native";
import type { UnifiedAccount } from "../../accounts/context/AccountsContext";
import { type Transaction } from "../../../services/enableBanking";
import { useDateFilter } from "../../../shared/context/DateFilterContext";
import { useTransactionsContext } from "../context/TransactionsContext";

const MANUAL_ACCOUNTS_KEY = "manual_accounts";
const ACCOUNT_METADATA_KEY = "account_metadata";

type AccountCategory = "Giro" | "Savings" | "Stock";

interface UseAccountTransactionsParams {
  id: string;
  type: "connected" | "manual";
  accounts: UnifiedAccount[];
  updateAccount: (account: UnifiedAccount) => void;
  refreshAccounts: (showLoading?: boolean) => Promise<void>;
  i18n: Record<string, string>;
}

export function useAccountTransactions({
  id,
  type,
  accounts,
  updateAccount,
  refreshAccounts,
  i18n,
}: UseAccountTransactionsParams) {
  const { filterDateFrom, filterDateTo, applyDateFilter, applyPreset } = useDateFilter();
  const { 
    transactionsByAccount, 
    isLoading: globalLoading, 
    refreshTransactions,
    addManualTransaction,
    updateManualTransaction,
    deleteManualTransaction,
    importBankStatement,
  } = useTransactionsContext();

  const [category, setCategory] = useState<AccountCategory>("Giro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Category
  useEffect(() => {
    if (!id) return;
    const loadCategory = async () => {
      try {
        if (type === "manual") {
          const manualData = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
          if (manualData) {
            const accs = JSON.parse(manualData);
            const account = accs.find((a: any) => a.id === id);
            if (account) setCategory(account.category);
          }
        } else {
          const metaData = await AsyncStorage.getItem(ACCOUNT_METADATA_KEY);
          if (metaData) {
            const meta = JSON.parse(metaData);
            if (meta[id]) setCategory(meta[id].category);
          }
        }
      } catch (e) {}
    };
    loadCategory();
  }, [id, type]);

  const transactions = useMemo(() => {
    return transactionsByAccount[id] || [];
  }, [transactionsByAccount, id]);

  const loadTransactions = async () => {
    setLoading(true);
    await refreshTransactions();
    setLoading(false);
  };

  // ── Manual Transaction CRUD ──

  const handleAddTransaction = async (txTitle: string, txAmount: string) => {
    await addManualTransaction(id, txTitle, txAmount);
  };

  const handleUpdateTransaction = async (
    editingTx: Transaction,
    editTitle: string,
    editAmount: string,
  ) => {
    await updateManualTransaction(id, editingTx, editTitle, editAmount);
  };

  const handleDeleteTransaction = async (editingTx: Transaction) => {
    const performDelete = async () => {
      await deleteManualTransaction(id, editingTx);
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this transaction?")) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Delete Transaction",
        "Are you sure you want to delete this transaction?",
        [
          { text: i18n.cancel, style: "cancel" },
          {
            text: i18n.delete,
            style: "destructive",
            onPress: performDelete,
          },
        ],
      );
    }
  };

  const handleImportBankStatement = async (newTxs: Transaction[]) => {
    await importBankStatement(id, newTxs, type === "manual");
  };

  // ── Account Category ──

  const updateCategoryValue = async (newCat: AccountCategory) => {
    setCategory(newCat);

    try {
      if (type === "manual") {
        const manualData = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
        if (manualData) {
          const accs = JSON.parse(manualData);
          const updatedAccounts = accs.map((acc: any) =>
            acc.id === id ? { ...acc, category: newCat } : acc,
          );
          await AsyncStorage.setItem(
            MANUAL_ACCOUNTS_KEY,
            JSON.stringify(updatedAccounts),
          );
        }
      } else {
        const metaData = await AsyncStorage.getItem(ACCOUNT_METADATA_KEY);
        const meta = metaData ? JSON.parse(metaData) : {};
        meta[id] = { ...meta[id], category: newCat };
        await AsyncStorage.setItem(ACCOUNT_METADATA_KEY, JSON.stringify(meta));
      }
    } catch (err) {
      console.error("Failed to update category:", err);
    }
  };

  // ── Delete Account ──

  const handleDeleteAccount = (
    deleteManualAccount: (id: string) => Promise<void>,
    onDeleteComplete: () => void,
  ) => {
    if (type !== "manual") return;

    const performDelete = async () => {
      await deleteManualAccount(id);
      onDeleteComplete();
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Are you sure you want to delete this account? This action cannot be undone.",
        )
      ) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Delete Account",
        "Are you sure you want to delete this account? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: performDelete,
          },
        ],
      );
    }
  };

  return {
    transactions,
    loading: globalLoading || loading,
    setLoading,
    refreshing: globalLoading,
    error,
    category,
    filterDateFrom,
    filterDateTo,
    applyDateFilter,
    applyPreset,
    loadTransactions,
    handleAddTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleImportBankStatement,
    updateCategoryValue,
    handleDeleteAccount,
  };
}
