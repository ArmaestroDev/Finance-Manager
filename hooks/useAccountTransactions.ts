import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import type { UnifiedAccount } from "../context/AccountsContext";
import {
  getBalances,
  getTransactions,
  type Transaction,
} from "../services/enableBanking";
import { toApiDate, toUiDate } from "../app/utils/date";

const MANUAL_ACCOUNTS_KEY = "manual_accounts";
const ACCOUNT_METADATA_KEY = "account_metadata";
const CONNECTED_TRANSACTIONS_PREFIX = "connected_transactions_";

type AccountCategory = "Giro" | "Savings" | "Stock";

interface ManualTransaction {
  transaction_id: string;
  booking_date: string;
  transaction_amount: {
    currency: string;
    amount: string;
  };
  remittance_information: string[];
  creditor?: { name?: string };
  debtor?: { name?: string };
}

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<AccountCategory>("Giro");

  // Date Filter State
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  // Default to 1st of this month → today
  useEffect(() => {
    const d = new Date();
    d.setDate(1);
    setFilterDateFrom(toUiDate(d));
    setFilterDateTo(toUiDate(new Date()));
  }, []);

  // Trigger load when dates or id changes
  useEffect(() => {
    if (id && filterDateFrom && filterDateTo) {
      loadTransactions(true);
    }
  }, [id, filterDateFrom, filterDateTo]);

  const applyPreset = (days: number | "year") => {
    const to = new Date();
    const from = new Date();

    if (days === "year") {
      from.setMonth(0, 1); // Jan 1st of current year
    } else {
      from.setDate(from.getDate() - days);
    }

    setFilterDateFrom(toUiDate(from));
    setFilterDateTo(toUiDate(to));
  };

  const loadTransactions = async (useCache = false) => {
    try {
      const apiFrom = toApiDate(filterDateFrom);
      const apiTo = toApiDate(filterDateTo);

      // 1. Load Category (Always fast)
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

      // 2. Try Cache First for Connected Accounts
      if (useCache && type === "connected") {
        setLoading(true);
        const cacheKey = `${CONNECTED_TRANSACTIONS_PREFIX}${id}`;
        try {
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const cachedTxs: Transaction[] = JSON.parse(cachedData);
            const filteredCached = cachedTxs.filter((t) => {
              const date = t.booking_date || t.value_date || "";
              return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
            });

            if (filteredCached.length > 0) {
              setTransactions(filteredCached);
              setLoading(false);
            }
          }
        } catch (e) {
          console.log("Failed to load cached transactions", e);
        }
      }

      if (!useCache) setLoading(true);

      if (loading && type === "connected" && useCache) {
        setRefreshing(true);
      }

      // 3. Fetch Fresh Data
      let txs: Transaction[] = [];

      if (type === "manual") {
        const txKey = `manual_transactions_${id}`;
        const storedTx = await AsyncStorage.getItem(txKey);
        if (storedTx) {
          const allTxs: ManualTransaction[] = JSON.parse(storedTx);
          txs = allTxs.filter((t) => {
            const date = t.booking_date;
            return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
          }) as unknown as Transaction[];
        }
        setLoading(false);
      } else {
        // Connected Account - API Load
        const data = await getTransactions(id, apiFrom, apiTo);
        if (Array.isArray(data.transactions)) {
          txs = data.transactions;
        } else {
          txs = [
            ...(data.transactions.booked || []),
            ...(data.transactions.pending || []),
          ];
        }

        // Handle Pagination
        if (data.continuation_key) {
          let nextKey: string | undefined = data.continuation_key;
          let pages = 0;
          while (nextKey && pages < 5) {
            try {
              const nextData = await getTransactions(
                id,
                apiFrom,
                apiTo,
                nextKey,
              );
              let nextTxs: Transaction[] = [];
              if (Array.isArray(nextData.transactions)) {
                nextTxs = nextData.transactions;
              } else {
                nextTxs = [
                  ...(nextData.transactions.booked || []),
                  ...(nextData.transactions.pending || []),
                ];
              }
              txs = [...txs, ...nextTxs];
              nextKey = nextData.continuation_key;
              pages++;
            } catch (e) {
              console.log("Error fetching next page:", e);
              break;
            }
          }
        }

        // Sort by date desc
        txs.sort((a, b) => {
          const dateA = a.booking_date || a.value_date || "";
          const dateB = b.booking_date || b.value_date || "";
          return dateB.localeCompare(dateA);
        });

        // CACHE THE FULL RESULT FIRST
        if (txs.length > 0) {
          const cacheKey = `${CONNECTED_TRANSACTIONS_PREFIX}${id}`;
          await AsyncStorage.setItem(cacheKey, JSON.stringify(txs));
        }

        // Apply strict date filtering so UI totals match exact range
        txs = txs.filter((t) => {
          const date = t.booking_date || t.value_date || "";
          return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
        });

        // Update Global Balance with valid data
        if (txs.length > 0) {
          try {
            const balanceData = await getBalances(id);
            const mainBalance =
              balanceData.balances.find(
                (b: any) =>
                  b.balance_type === "CLAV" || b.balance_type === "XPCD",
              ) || balanceData.balances[0];

            const currentAccount = accounts.find((a) => a.id === id);
            if (currentAccount && mainBalance) {
              const newBalance = parseFloat(mainBalance.balance_amount.amount);

              if (currentAccount.balance !== newBalance) {
                updateAccount({
                  ...currentAccount,
                  balance: newBalance,
                  currency: mainBalance.balance_amount.currency,
                  error: undefined,
                });
                refreshAccounts(false);
              }
            }
          } catch (balanceErr) {
            console.error("Failed to fetch fresh balance:", balanceErr);
          }
        }
      }

      setTransactions(txs);
    } catch (err: any) {
      console.error("Failed to load transactions:", err);
      if (transactions.length === 0) {
        setError(err.message || "Failed to load transactions");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Manual Transaction CRUD ──

  const updateAccountBalance = async (diff: number) => {
    try {
      const manualData = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
      if (manualData) {
        const accs = JSON.parse(manualData);
        const updatedAccounts = accs.map((acc: any) => {
          if (acc.id === id) {
            return { ...acc, balance: acc.balance + diff };
          }
          return acc;
        });
        await AsyncStorage.setItem(
          MANUAL_ACCOUNTS_KEY,
          JSON.stringify(updatedAccounts),
        );
      }
    } catch (err) {
      console.error("Failed to update balance:", err);
    }
  };

  const handleAddTransaction = async (txTitle: string, txAmount: string) => {
    try {
      const amountVal = parseFloat(txAmount.replace(",", "."));
      if (isNaN(amountVal)) return;

      const newTx: ManualTransaction = {
        transaction_id: `tx_${Date.now()}`,
        booking_date: new Date().toISOString().split("T")[0],
        transaction_amount: {
          currency: "EUR",
          amount: amountVal.toString(),
        },
        remittance_information: [txTitle],
        creditor: { name: amountVal < 0 ? txTitle : "Self" },
        debtor: { name: amountVal > 0 ? txTitle : "Self" },
      };

      const txKey = `manual_transactions_${id}`;
      const updatedTx = [newTx, ...transactions];
      await AsyncStorage.setItem(txKey, JSON.stringify(updatedTx));
      setTransactions(updatedTx);

      await updateAccountBalance(amountVal);
    } catch (err) {
      console.error("Failed to add transaction:", err);
    }
  };

  const handleUpdateTransaction = async (
    editingTx: Transaction,
    editTitle: string,
    editAmount: string,
  ) => {
    try {
      const oldAmount = parseFloat(editingTx.transaction_amount.amount);
      const newAmountVal = parseFloat(editAmount.replace(",", "."));
      if (isNaN(newAmountVal)) return;

      const updatedTx = {
        ...editingTx,
        transaction_amount: {
          ...editingTx.transaction_amount,
          amount: newAmountVal.toString(),
        },
        remittance_information: [editTitle],
        creditor: { name: newAmountVal < 0 ? editTitle : "Self" },
      };

      const txKey = `manual_transactions_${id}`;
      const updatedTxs = transactions.map((t) =>
        t.transaction_id === editingTx.transaction_id ? updatedTx : t,
      );
      await AsyncStorage.setItem(txKey, JSON.stringify(updatedTxs));
      setTransactions(updatedTxs);

      const balanceDiff = newAmountVal - oldAmount;
      await updateAccountBalance(balanceDiff);
    } catch (err) {
      console.error("Failed to update transaction:", err);
    }
  };

  const handleDeleteTransaction = async (editingTx: Transaction) => {
    const performDelete = async () => {
      try {
        const amountToRemove = parseFloat(editingTx.transaction_amount.amount);
        const txKey = `manual_transactions_${id}`;

        const updatedTxs = transactions.filter(
          (t) => t.transaction_id !== editingTx.transaction_id,
        );

        await AsyncStorage.setItem(txKey, JSON.stringify(updatedTxs));
        setTransactions(updatedTxs);

        await updateAccountBalance(-amountToRemove);
      } catch (err) {
        console.error("Failed to delete transaction:", err);
        Alert.alert("Error", "Failed to delete transaction");
      }
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
    loading,
    setLoading,
    refreshing,
    error,
    category,
    filterDateFrom,
    filterDateTo,
    setFilterDateFrom,
    setFilterDateTo,
    applyPreset,
    loadTransactions,
    handleAddTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    updateCategoryValue,
    handleDeleteAccount,
  };
}
