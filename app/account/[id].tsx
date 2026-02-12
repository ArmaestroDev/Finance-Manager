import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAccounts } from "../../context/AccountsContext";
import {
  CATEGORY_COLORS,
  useCategories,
} from "../../context/CategoriesContext";
import { useSettings } from "../../context/SettingsContext";
import { useThemeColor } from "../../hooks/use-theme-color";
import {
  getBalances,
  getTransactions,
  type Transaction,
} from "../../services/enableBanking";

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

const getStableTxId = (tx: Transaction) => {
  return (
    tx.transaction_id ||
    `gen_${tx.booking_date || ""}_${tx.transaction_amount.amount}_${tx.creditor?.name || tx.debtor?.name || ""}`
  );
};

export default function AccountDetailScreen() {
  const { id, name, type } = useLocalSearchParams<{
    id: string;
    name: string;
    type: "connected" | "manual";
  }>();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const router = useRouter();
  const { isBalanceHidden, geminiApiKey, i18n, language } = useSettings(); // Modified hook usage
  const { deleteManualAccount, refreshAccounts, updateAccount, accounts } =
    useAccounts();
  const {
    categories,
    transactionCategoryMap,
    addCategory,
    updateCategory: updateCategoryCtx,
    deleteCategory: deleteCategoryCtx,
    assignCategory,
    bulkAssignCategories,
    bulkAddCategories,
    getCategoryForTransaction,
  } = useCategories();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const categoriesScrollRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0); // Track scroll position to conditionally show arrows? Or just always show?
  // Let's just scroll blindly for now.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<AccountCategory>("Giro");

  // Date Filter State
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  // Helpers
  const toUiDate = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const toApiDate = (uiDate: string) => {
    // Expects DD-MM-YYYY
    const [dd, mm, yyyy] = uiDate.split("-");
    if (!dd || !mm || !yyyy) return "";
    return `${yyyy}-${mm}-${dd}`;
  };

  // Default to ~90 days if not set, or let user pick 'All'
  // Actually, let's init with last 90 days to match previous behavior
  useEffect(() => {
    const d = new Date();
    d.setDate(1);
    setFilterDateFrom(toUiDate(d));
    // To date is today
    setFilterDateTo(toUiDate(new Date()));
  }, []);

  // Add Transaction Modal State (Manual Only)
  const [isTxModalVisible, setTxModalVisible] = useState(false);
  const [txTitle, setTxTitle] = useState("");
  const [txAmount, setTxAmount] = useState("");

  // Edit Transaction Modal State
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");

  // Category Modal State (Account-level)
  const [isCatModalVisible, setCatModalVisible] = useState(false);

  // Transaction Detail Modal State (read-only)
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);

  // Category Management Modal State
  const [isCatManageModalVisible, setCatManageModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  const [editingCat, setEditingCat] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (id && filterDateFrom && filterDateTo) {
      // Initial load: Try cache first, then fetch
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
    setFilterModalVisible(false);
  };

  const loadTransactions = async (useCache = false) => {
    try {
      const apiFrom = toApiDate(filterDateFrom);
      const apiTo = toApiDate(filterDateTo);

      // 1. Load Category (Always fast)
      if (type === "manual") {
        const manualData = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
        if (manualData) {
          const accounts = JSON.parse(manualData);
          const account = accounts.find((a: any) => a.id === id);
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
            // Verify if cached data overlaps with requested range?
            // For simplicity, we just show what we have, then filter.
            // But actually, we should probably filter what we show based on the UI date filters.
            const filteredCached = cachedTxs.filter((t) => {
              const date = t.booking_date || t.value_date || "";
              // Only filter by start date to allow future/pending transactions to show
              // matching API behavior which seems to include them despite date_to
              return !apiFrom || date >= apiFrom;
            });

            if (filteredCached.length > 0) {
              setTransactions(filteredCached);
              setLoading(false); // Show content immediately
            }
          }
        } catch (e) {
          console.log("Failed to load cached transactions", e);
        }
      }

      if (!useCache) setLoading(true); // If explicit refresh or manual
      // If we loaded cache, we are still "loading" in background, but we can show data.
      // Let's use a separate refreshing state if we have data?
      // Actually, standard pattern: if we have data, we just show a small indicator or nothing.
      // But we need to ensure we DO fetch.

      if (loading && type === "connected" && useCache) {
        // If we are here, we might have set loading=false above.
        // If we did, we should set refreshing=true for the background fetch.
        setRefreshing(true);
      }

      // 3. Fetch Fresh Data
      let txs: Transaction[] = [];

      if (type === "manual") {
        const txKey = `manual_transactions_${id}`;
        const storedTx = await AsyncStorage.getItem(txKey);
        if (storedTx) {
          const allTxs: ManualTransaction[] = JSON.parse(storedTx);
          // Filter localized
          txs = allTxs.filter((t) => {
            const date = t.booking_date; // YYYY-MM-DD
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

        // CACHE THE RESULT
        if (txs.length > 0) {
          const cacheKey = `${CONNECTED_TRANSACTIONS_PREFIX}${id}`;
          // We should probably merge with existing cache if we are only fetching a slice?
          // The user requirement is "last known transactions".
          // If we overwrite with just the filtered range, we lose other ranges.
          // However, implementing full sync/merge logic is complex.
          // For now, let's cache what we just fetched (likely the default view).
          await AsyncStorage.setItem(cacheKey, JSON.stringify(txs));
        }

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

              // Update context immediately if different
              if (currentAccount.balance !== newBalance) {
                updateAccount({
                  ...currentAccount,
                  balance: newBalance,
                  currency: mainBalance.balance_amount.currency,
                  error: undefined, // Clear any previous error
                });
                // Also trigger silent global refresh
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
      // Only set error if we don't have data shown
      if (transactions.length === 0) {
        setError(err.message || "Failed to load transactions");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cleanRemittanceInfo = (info?: string[]) => {
    if (!info || info.length === 0) return null;
    const text = info.join(" ");
    const remittanceMatch = text.match(/remittanceinformation:(.*)/i);
    if (remittanceMatch && remittanceMatch[1]) {
      return remittanceMatch[1].trim();
    }
    return text;
  };

  const handleAddTransaction = async () => {
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

      setTxModalVisible(false);
      setTxTitle("");
      setTxAmount("");
    } catch (err) {
      console.error("Failed to add transaction:", err);
    }
  };

  const openEditModal = (tx: Transaction) => {
    if (type !== "manual") return;
    setEditingTx(tx);
    const title =
      cleanRemittanceInfo(tx.remittance_information) ||
      tx.creditor?.name ||
      tx.debtor?.name ||
      "";
    setEditTitle(title);
    setEditAmount(tx.transaction_amount.amount);
    setEditModalVisible(true);
  };

  const handleUpdateTransaction = async () => {
    if (!editingTx) return;
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

      setEditModalVisible(false);
      setEditingTx(null);
    } catch (err) {
      console.error("Failed to update transaction:", err);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!editingTx) return;

    const performDelete = async () => {
      try {
        const amountToRemove = parseFloat(editingTx.transaction_amount.amount);
        const txKey = `manual_transactions_${id}`;

        // Remove the transaction from the list
        const updatedTxs = transactions.filter(
          (t) => t.transaction_id !== editingTx.transaction_id,
        );

        await AsyncStorage.setItem(txKey, JSON.stringify(updatedTxs));
        setTransactions(updatedTxs);

        // Update Account Balance (reverse the transaction effect)
        await updateAccountBalance(-amountToRemove);

        setEditModalVisible(false);
        setEditingTx(null);
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

  const updateAccountBalance = async (diff: number) => {
    try {
      const manualData = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
      if (manualData) {
        const accounts = JSON.parse(manualData);
        const updatedAccounts = accounts.map((acc: any) => {
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

  const updateCategory = async (newCat: AccountCategory) => {
    setCategory(newCat);
    setCatModalVisible(false);

    try {
      if (type === "manual") {
        const manualData = await AsyncStorage.getItem(MANUAL_ACCOUNTS_KEY);
        if (manualData) {
          const accounts = JSON.parse(manualData);
          const updatedAccounts = accounts.map((acc: any) =>
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

  const handleDeleteAccount = () => {
    if (type !== "manual") return;

    const performDelete = async () => {
      await deleteManualAccount(id);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/accounts");
      }
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

  const autoCategorizeTransactions = async () => {
    if (!geminiApiKey) {
      if (Platform.OS === "web") {
        alert("Please set your Gemini API Key in Settings first.");
      } else {
        Alert.alert(
          "API Key Missing",
          "Please set your Gemini API Key in Settings first.",
          [
            { text: i18n.cancel, style: "cancel" },
            { text: "Settings", onPress: () => router.push("/settings") },
          ],
        );
      }
      return;
    }

    // Identify uncategorized transactions
    // Strict filter: Only process transactions that do NOT have a category assigned
    // AND are within the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const uncategorized = transactions.filter((tx) => {
      const txId = getStableTxId(tx);
      if (getCategoryForTransaction(txId)) return false;

      const txDate = new Date(tx.booking_date || tx.value_date || "");
      return txDate >= threeMonthsAgo;
    });

    if (uncategorized.length === 0) {
      Alert.alert("All Done", "All transactions are already categorized!");
      return;
    }

    setLoading(true);

    try {
      // Prepare data for prompt
      const categoryList = categories.map((c) => ({ id: c.id, name: c.name }));

      // We map the transactions to a cleaner format for the AI
      const txList = uncategorized.map((tx) => {
        // We include the full remittance info string effectively
        const remittanceFull = tx.remittance_information?.join(" ") || "";
        const cleanRef = cleanRemittanceInfo(tx.remittance_information) || "";

        // Prefer the cleaner one if it's not empty, but fallback or append full info if needed
        // Actually, let's provide both or the most detailed one.
        // Providing "raw_reference" might help if "cleanRemittanceInfo" strips too much.

        return {
          id: getStableTxId(tx),
          creditor: tx.creditor?.name || "Unknown",
          debtor: tx.debtor?.name || "Unknown",
          amount: tx.transaction_amount.amount,
          // We provide the cleaned reference AND the raw one to give AI more context
          reference: cleanRef,
          raw_reference:
            remittanceFull !== cleanRef ? remittanceFull : undefined,
          date: tx.booking_date,
        };
      });

      // Limit batch size to avoid token limits (e.g. 50 txs)
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < txList.length; i += batchSize) {
        batches.push(txList.slice(i, i + batchSize));
      }

      let categorizedCount = 0;

      for (const batch of batches) {
        const prompt = `
You are an intelligent financial assistant.
Your goal is to categorize bank transactions into one of the provided categories.

Here are the available transaction categories:
${JSON.stringify(categoryList)}

Here is a list of uncategorized transactions:
${JSON.stringify(batch)}

INSTRUCTIONS:
1. Analyze each transaction (creditor, debtor, amount, reference).
2. Assign the MOST APPROPRIATE category ID from the available list.
3. If a transaction clearly fits a category (e.g., "Rewe" -> Groceries, "Shell" -> Gas), ASSIGN IT.
4. If NO existing category fits, BUT you are confident it belongs to a common category, you may suggest a NEW category name.
IMPORTANT: Aim for a COMPACT list of categories. Do not create granular categories like "Coffee" or "Gym"; instead consolidate into "Lifestyle" or "Leisure". Ideally, keep the TOTAL number of categories around 6-7 if possible. Prefer broader categories like "Shopping", "Mobility", "Living", "Lifestyle".
5. If a transaction is ambiguous or absolutely does not fit any category (existing or new), assign null.
6. Return a STRICT valid JSON object where keys are transaction IDs and values are either:
   - An existing category ID (string starting with "cat_")
   - A NEW category name (string, human readable, e.g. "Gym"). IMPORTANT: The new category name MUST be in the language "${
     language === "de" ? "German (Deutsch)" : "English"
   }".
   - null

Example output format:
{
  "tx_123": "cat_456",
  "tx_789": "New Category Name",
  "tx_000": null
}
`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          },
        );

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) continue;

        // Clean markdown code blocks if present
        resultText = resultText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        console.log("Generative AI Response Text:", resultText);

        try {
          const assignments = JSON.parse(resultText);
          console.log("Generative AI Assignments:", assignments);

          const validAssignments: Record<string, string> = {};
          const newCategoriesToCreate = new Set<string>();

          for (const [txId, value] of Object.entries(assignments)) {
            if (typeof value === "string") {
              // Check if it's an existing category ID
              const existingCat = categories.find((c) => c.id === value);
              if (existingCat) {
                validAssignments[txId] = existingCat.id;
                categorizedCount++;
              } else {
                // It's a new category name?
                const normalizedName = value.trim();
                // Check if it already exists (case-insensitive)
                const existingByName = categories.find(
                  (c) => c.name.toLowerCase() === normalizedName.toLowerCase(),
                );

                if (existingByName) {
                  validAssignments[txId] = existingByName.id;
                  categorizedCount++;
                } else {
                  // Queue for creation
                  if (!newCategoriesToCreate.has(normalizedName)) {
                    newCategoriesToCreate.add(normalizedName);
                  }
                }
              }
            }
          }

          // Bulk create new categories if any
          if (newCategoriesToCreate.size > 0) {
            const newCatsInput = Array.from(newCategoriesToCreate).map(
              (name) => ({
                name,
                color:
                  CATEGORY_COLORS[
                    Math.floor(Math.random() * CATEGORY_COLORS.length)
                  ],
              }),
            );

            const createdCats = await bulkAddCategories(newCatsInput);

            // Now map the transactions that were waiting for these new categories
            for (const [txId, value] of Object.entries(assignments)) {
              if (typeof value === "string") {
                const normalizedName = value.trim();
                const createdCat = createdCats.find(
                  (c) => c.name.toLowerCase() === normalizedName.toLowerCase(),
                );
                if (createdCat && !validAssignments[txId]) {
                  // Only if not already assigned
                  validAssignments[txId] = createdCat.id;
                  categorizedCount++;
                }
              }
            }
          }

          if (Object.keys(validAssignments).length > 0) {
            await bulkAssignCategories(validAssignments);
          }
        } catch (parseError) {
          console.error("Failed to parse AI response:", resultText);
        }
      }

      Alert.alert("Success", `Categorized ${categorizedCount} transactions.`);
    } catch (err: any) {
      console.error("Auto-categorization failed", err);
      let msg = err.message || "Unknown error";
      if (
        typeof msg === "string" &&
        (msg.includes("503") || msg.includes("overloaded"))
      ) {
        msg =
          "The AI service is currently overloaded. Please try again in a moment.";
      }
      Alert.alert("Auto-categorization Issue", msg);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionAmount = (item: Transaction) => {
    let amount = parseFloat(item.transaction_amount.amount);
    if (item.credit_debit_indicator === "DBIT" && amount > 0) {
      amount = -amount;
    } else if (item.credit_debit_indicator === "CRDT" && amount < 0) {
      amount = -amount;
    }
    return amount;
  };

  const openDetailModal = (tx: Transaction) => {
    setDetailTx(tx);
    setDetailModalVisible(true);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const amount = getTransactionAmount(item);
    const isNegative = amount < 0;
    const name =
      item.creditor?.name || item.debtor?.name || "Unknown Transaction";
    const date = new Date(
      item.booking_date || item.value_date || "",
    ).toLocaleDateString();
    const reference = cleanRemittanceInfo(item.remittance_information);
    const txId =
      item.transaction_id ||
      `gen_${item.booking_date || ""}_${item.transaction_amount.amount}_${item.creditor?.name || item.debtor?.name || ""}`;
    const txCat = getCategoryForTransaction(txId);

    return (
      <TouchableOpacity onPress={() => openDetailModal(item)}>
        <View
          style={[styles.transactionItem, { borderBottomColor: textColor }]}
        >
          {txCat && (
            <View
              style={[styles.categoryDot, { backgroundColor: txCat.color }]}
            />
          )}
          <View style={styles.transactionLeft}>
            <Text style={[styles.transactionName, { color: textColor }]}>
              {name}
            </Text>
            <Text
              style={[
                styles.transactionDate,
                { color: textColor, opacity: 0.6 },
              ]}
            >
              {date}
            </Text>
            {reference && (
              <Text
                style={[
                  styles.referenceText,
                  { color: textColor, opacity: 0.5 },
                ]}
                numberOfLines={2}
              >
                {reference}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.transactionAmount,
              { color: isNegative ? textColor : "#2ecc71" },
            ]}
          >
            {isNegative ? "" : "+"}
            {new Intl.NumberFormat("de-DE", {
              style: "currency",
              currency: item.transaction_amount.currency,
            }).format(amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Filter Transactions
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => applyPreset(30)}
                style={[styles.filterPreset, { borderColor: tintColor }]}
              >
                <Text style={{ color: textColor }}>30 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => applyPreset(90)}
                style={[styles.filterPreset, { borderColor: tintColor }]}
              >
                <Text style={{ color: textColor }}>90 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => applyPreset("year")}
                style={[styles.filterPreset, { borderColor: tintColor }]}
              >
                <Text style={{ color: textColor }}>This Year</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, marginBottom: 16 }}>
              <View>
                <Text
                  style={{ color: textColor, marginBottom: 4, fontSize: 12 }}
                >
                  From (DD-MM-YYYY)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: textColor,
                      borderColor: tintColor,
                      marginBottom: 0,
                    },
                  ]}
                  value={filterDateFrom}
                  onChangeText={setFilterDateFrom}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor={textColor + "50"}
                />
              </View>
              <View>
                <Text
                  style={{ color: textColor, marginBottom: 4, fontSize: 12 }}
                >
                  To (DD-MM-YYYY)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: textColor,
                      borderColor: tintColor,
                      marginBottom: 0,
                    },
                  ]}
                  value={filterDateTo}
                  onChangeText={setFilterDateTo}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor={textColor + "50"}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.modalButton}
              >
                <Text style={{ color: textColor }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setFilterModalVisible(false);
                  loadTransactions();
                }}
                style={[styles.modalButton, { backgroundColor: tintColor }]}
              >
                <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual: Add Tx Modal */}
      <Modal
        visible={isTxModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTxModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Add Transaction
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: textColor, borderColor: tintColor },
              ]}
              placeholder="Title (e.g. Shopping)"
              placeholderTextColor={textColor + "50"}
              value={txTitle}
              onChangeText={setTxTitle}
            />
            <TextInput
              style={[
                styles.input,
                { color: textColor, borderColor: tintColor },
              ]}
              placeholder="Amount (e.g. -50.00)"
              placeholderTextColor={textColor + "50"}
              keyboardType="numeric"
              value={txAmount}
              onChangeText={setTxAmount}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setTxModalVisible(false)}
                style={styles.modalButton}
              >
                <Text style={{ color: textColor }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddTransaction}
                style={[styles.modalButton, { backgroundColor: tintColor }]}
              >
                <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual: Edit Tx Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Edit Transaction
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: textColor, borderColor: tintColor },
              ]}
              placeholder="Title"
              placeholderTextColor={textColor + "50"}
              value={editTitle}
              onChangeText={setEditTitle}
            />
            <TextInput
              style={[
                styles.input,
                { color: textColor, borderColor: tintColor },
              ]}
              placeholder="Amount"
              placeholderTextColor={textColor + "50"}
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={handleDeleteTransaction}
                style={[styles.modalButton, { backgroundColor: "#FF6B6B" }]}
              >
                <Text style={{ color: "white", fontWeight: "600" }}>
                  Delete
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalButton}
              >
                <Text style={{ color: textColor }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateTransaction}
                style={[styles.modalButton, { backgroundColor: tintColor }]}
              >
                <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal
        visible={isCatModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCatModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Change Category
            </Text>
            <View style={{ gap: 8 }}>
              {(["Giro", "Savings", "Stock"] as AccountCategory[]).map(
                (cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor:
                          category === cat ? tintColor : tintColor + "10",
                      },
                    ]}
                    onPress={() => updateCategory(cat)}
                  >
                    <Text
                      style={{
                        color: category === cat ? backgroundColor : textColor,
                        fontWeight: "600",
                        textAlign: "center",
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
            <TouchableOpacity
              onPress={() => setCatModalVisible(false)}
              style={[styles.modalButton, { marginTop: 16 }]}
            >
              <Text style={{ color: textColor }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Transaction Detail Modal (read-only) */}
      <Modal
        visible={isDetailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor, maxWidth: 380 }]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Transaction Details
              </Text>

              {detailTx &&
                (() => {
                  const amount = getTransactionAmount(detailTx);
                  const isNeg = amount < 0;
                  // Generate a stable ID for transactions that don't have one
                  const txId =
                    detailTx.transaction_id ||
                    `gen_${detailTx.booking_date || ""}_${detailTx.transaction_amount.amount}_${detailTx.creditor?.name || detailTx.debtor?.name || ""}`;
                  const txCat = getCategoryForTransaction(txId);

                  const handleAssign = (categoryId: string | null) => {
                    assignCategory(txId, categoryId);
                  };

                  return (
                    <>
                      {/* Category Assignment */}
                      <View style={{ marginBottom: 20 }}>
                        <Text
                          style={{
                            color: textColor,
                            opacity: 0.6,
                            fontSize: 12,
                            marginBottom: 6,
                          }}
                        >
                          Category
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          <TouchableOpacity
                            activeOpacity={0.6}
                            onPress={() => handleAssign(null)}
                            style={[
                              styles.catPill,
                              {
                                backgroundColor: !txCat
                                  ? textColor
                                  : textColor + "15",
                                borderColor: textColor + "30",
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: !txCat ? backgroundColor : textColor,
                                fontSize: 12,
                                fontWeight: "600",
                              }}
                            >
                              None
                            </Text>
                          </TouchableOpacity>
                          {categories.map((cat) => (
                            <TouchableOpacity
                              key={cat.id}
                              activeOpacity={0.6}
                              onPress={() => handleAssign(cat.id)}
                              style={[
                                styles.catPill,
                                {
                                  backgroundColor:
                                    txCat?.id === cat.id
                                      ? cat.color
                                      : cat.color + "20",
                                  borderColor: cat.color,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  color:
                                    txCat?.id === cat.id ? "#fff" : textColor,
                                  fontSize: 12,
                                  fontWeight: "600",
                                }}
                              >
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Amount */}
                      <Text
                        style={{
                          fontSize: 28,
                          fontWeight: "700",
                          color: isNeg ? textColor : "#2ecc71",
                          textAlign: "center",
                          marginBottom: 20,
                        }}
                      >
                        {isNeg ? "" : "+"}
                        {new Intl.NumberFormat("de-DE", {
                          style: "currency",
                          currency: detailTx.transaction_amount.currency,
                        }).format(amount)}
                      </Text>

                      {/* Detail fields */}
                      {detailTx.creditor?.name && (
                        <View style={styles.detailRow}>
                          <Text
                            style={[styles.detailLabel, { color: textColor }]}
                          >
                            Creditor
                          </Text>
                          <Text
                            style={[styles.detailValue, { color: textColor }]}
                          >
                            {detailTx.creditor.name}
                          </Text>
                        </View>
                      )}
                      {detailTx.debtor?.name && (
                        <View style={styles.detailRow}>
                          <Text
                            style={[styles.detailLabel, { color: textColor }]}
                          >
                            Debtor
                          </Text>
                          <Text
                            style={[styles.detailValue, { color: textColor }]}
                          >
                            {detailTx.debtor.name}
                          </Text>
                        </View>
                      )}
                      {detailTx.booking_date && (
                        <View style={styles.detailRow}>
                          <Text
                            style={[styles.detailLabel, { color: textColor }]}
                          >
                            Booking Date
                          </Text>
                          <Text
                            style={[styles.detailValue, { color: textColor }]}
                          >
                            {new Date(
                              detailTx.booking_date,
                            ).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                      {detailTx.value_date && (
                        <View style={styles.detailRow}>
                          <Text
                            style={[styles.detailLabel, { color: textColor }]}
                          >
                            Value Date
                          </Text>
                          <Text
                            style={[styles.detailValue, { color: textColor }]}
                          >
                            {new Date(detailTx.value_date).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                      {detailTx.credit_debit_indicator && (
                        <View style={styles.detailRow}>
                          <Text
                            style={[styles.detailLabel, { color: textColor }]}
                          >
                            Type
                          </Text>
                          <Text
                            style={[styles.detailValue, { color: textColor }]}
                          >
                            {detailTx.credit_debit_indicator === "CRDT"
                              ? "Credit"
                              : "Debit"}
                          </Text>
                        </View>
                      )}
                      {detailTx.remittance_information &&
                        detailTx.remittance_information.length > 0 && (
                          <View
                            style={[
                              styles.detailRow,
                              {
                                flexDirection: "column",
                                alignItems: "flex-start",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.detailLabel,
                                { color: textColor, marginBottom: 4 },
                              ]}
                            >
                              Reference
                            </Text>
                            <Text
                              style={[
                                styles.detailValue,
                                { color: textColor, opacity: 0.7 },
                              ]}
                            >
                              {cleanRemittanceInfo(
                                detailTx.remittance_information,
                              )}
                            </Text>
                          </View>
                        )}
                      {detailTx.transaction_id && (
                        <View
                          style={[
                            styles.detailRow,
                            {
                              flexDirection: "column",
                              alignItems: "flex-start",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.detailLabel,
                              { color: textColor, marginBottom: 4 },
                            ]}
                          >
                            Transaction ID
                          </Text>
                          <Text
                            style={[
                              styles.detailValue,
                              { color: textColor, opacity: 0.5, fontSize: 11 },
                            ]}
                          >
                            {detailTx.transaction_id}
                          </Text>
                        </View>
                      )}
                    </>
                  );
                })()}

              {/* Buttons */}
              <View style={[styles.modalButtons, { marginTop: 20 }]}>
                {type === "manual" && detailTx && (
                  <TouchableOpacity
                    onPress={() => {
                      setDetailModalVisible(false);
                      openEditModal(detailTx);
                    }}
                    style={[styles.modalButton, { backgroundColor: tintColor }]}
                  >
                    <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setDetailModalVisible(false)}
                  style={[
                    styles.modalButton,
                    { backgroundColor: textColor + "15" },
                  ]}
                >
                  <Text style={{ color: textColor, fontWeight: "600" }}>
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        visible={isCatManageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setCatManageModalVisible(false);
          setEditingCat(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor, maxWidth: 380 }]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {editingCat ? "Edit Category" : "Manage Categories"}
              </Text>

              {editingCat ? (
                /* Edit/Create form */
                <View>
                  <TextInput
                    style={[
                      styles.input,
                      { color: textColor, borderColor: tintColor },
                    ]}
                    placeholder="Category name"
                    placeholderTextColor={textColor + "50"}
                    value={editingCat.name}
                    onChangeText={(t) =>
                      setEditingCat({ ...editingCat, name: t })
                    }
                  />
                  <Text
                    style={{
                      color: textColor,
                      opacity: 0.6,
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    Color
                  </Text>
                  <View style={styles.colorGrid}>
                    {CATEGORY_COLORS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() =>
                          setEditingCat({ ...editingCat, color: c })
                        }
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: c },
                          editingCat.color === c && styles.colorSwatchSelected,
                        ]}
                      />
                    ))}
                  </View>
                  <View style={[styles.modalButtons, { marginTop: 16 }]}>
                    <TouchableOpacity
                      onPress={() => setEditingCat(null)}
                      style={styles.modalButton}
                    >
                      <Text style={{ color: textColor }}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        if (!editingCat.name.trim()) return;
                        if (editingCat.id) {
                          await updateCategoryCtx(editingCat.id, {
                            name: editingCat.name,
                            color: editingCat.color,
                          });
                        } else {
                          await addCategory(editingCat.name, editingCat.color);
                        }
                        setEditingCat(null);
                      }}
                      style={[
                        styles.modalButton,
                        { backgroundColor: tintColor },
                      ]}
                    >
                      <Text
                        style={{ color: backgroundColor, fontWeight: "600" }}
                      >
                        Save
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Category list */
                <View>
                  {categories.length === 0 && (
                    <Text
                      style={{
                        color: textColor,
                        opacity: 0.5,
                        textAlign: "center",
                        marginBottom: 16,
                      }}
                    >
                      No categories yet
                    </Text>
                  )}
                  {categories.map((cat) => (
                    <View key={cat.id} style={styles.catManageRow}>
                      <View
                        style={[
                          styles.catManageDot,
                          { backgroundColor: cat.color },
                        ]}
                      />
                      <Text
                        style={[styles.catManageName, { color: textColor }]}
                      >
                        {cat.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setEditingCat({
                            id: cat.id,
                            name: cat.name,
                            color: cat.color,
                          })
                        }
                        style={{ padding: 6 }}
                      >
                        <Ionicons name="pencil" size={16} color={textColor} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          const doDelete = async () => {
                            await deleteCategoryCtx(cat.id);
                          };
                          if (Platform.OS === "web") {
                            if (window.confirm(`Delete "${cat.name}"?`))
                              doDelete();
                          } else {
                            Alert.alert(
                              "Delete Category",
                              `Delete "${cat.name}"?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Delete",
                                  style: "destructive",
                                  onPress: doDelete,
                                },
                              ],
                            );
                          }
                        }}
                        style={{ padding: 6 }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#FF6B6B"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={() =>
                      setEditingCat({
                        id: "",
                        name: "",
                        color: CATEGORY_COLORS[0],
                      })
                    }
                    style={[styles.addCatButton, { borderColor: tintColor }]}
                  >
                    <Ionicons name="add" size={18} color={tintColor} />
                    <Text style={{ color: tintColor, fontWeight: "600" }}>
                      New Category
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setCatManageModalVisible(false);
                      setEditingCat(null);
                    }}
                    style={[
                      styles.modalButton,
                      { marginTop: 16, backgroundColor: textColor + "15" },
                    ]}
                  >
                    <Text style={{ color: textColor, fontWeight: "600" }}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/accounts")} // Use replace to force reload of Accounts screen
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: textColor }]}>{name}</Text>

          {/* Balance Display */}
          {(() => {
            const currentAccount = accounts.find((a) => a.id === id);
            if (!currentAccount) return null;

            return (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <Text
                  style={{ fontSize: 24, fontWeight: "700", color: textColor }}
                >
                  {isBalanceHidden
                    ? "****"
                    : new Intl.NumberFormat("de-DE", {
                        style: "currency",
                        currency: currentAccount.currency || "EUR",
                      }).format(currentAccount.balance || 0)}
                </Text>
                {loading && (
                  <ActivityIndicator size="small" color={tintColor} />
                )}
              </View>
            );
          })()}

          <TouchableOpacity
            onPress={() => setCatModalVisible(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginTop: 4,
              opacity: 0.7,
            }}
          >
            <Text style={{ color: textColor, fontSize: 13, fontWeight: "500" }}>
              {category}
            </Text>
            <Ionicons name="pencil" size={12} color={textColor} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", gap: 16 }}>
          <TouchableOpacity onPress={() => setCatManageModalVisible(true)}>
            <Ionicons name="pricetag-outline" size={22} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={autoCategorizeTransactions}>
            <Ionicons name="sparkles" size={22} color={tintColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="calendar-outline" size={24} color={textColor} />
          </TouchableOpacity>
          {type === "manual" ? (
            <TouchableOpacity onPress={() => setTxModalVisible(true)}>
              <Ionicons name="add-circle" size={28} color={tintColor} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 28 }} />
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tintColor} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={{ color: textColor }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={
            selectedCategoryFilter
              ? transactions.filter((tx) => {
                  const txId = getStableTxId(tx);
                  return (
                    transactionCategoryMap[txId] === selectedCategoryFilter
                  );
                })
              : transactions
          }
          renderItem={renderTransaction}
          keyExtractor={(item) =>
            item.transaction_id || Math.random().toString()
          }
          refreshing={refreshing}
          onRefresh={() => loadTransactions(false)}
          contentContainerStyle={styles.listContent}
          style={{ flex: 1 }} // Ensure list takes up space for scrolling
          ListHeaderComponent={
            categories.length > 0 ? (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {/* Left Arrow */}
                  <TouchableOpacity
                    onPress={() => {
                      setScrollX((prev) => {
                        const next = Math.max(0, prev - 200);
                        categoriesScrollRef.current?.scrollTo({
                          x: next,
                          animated: true,
                        });
                        return next;
                      });
                    }}
                    style={{
                      padding: 8,
                      marginRight: 8,
                      marginLeft: -12,
                      zIndex: 1,
                    }}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={24}
                      color={textColor}
                      style={{ opacity: 0.7 }}
                    />
                  </TouchableOpacity>

                  {/* Scrollable List */}
                  <ScrollView
                    ref={categoriesScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ paddingRight: 20, gap: 10 }}
                    style={{ flex: 1 }}
                  >
                    {categories.map((cat) => {
                      const isSelected = selectedCategoryFilter === cat.id;
                      const catSum = transactions.reduce((sum, tx) => {
                        const txId = getStableTxId(tx);
                        if (transactionCategoryMap[txId] === cat.id) {
                          return sum + getTransactionAmount(tx);
                        }
                        return sum;
                      }, 0);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => {
                            if (selectedCategoryFilter === cat.id) {
                              setSelectedCategoryFilter(null);
                            } else {
                              setSelectedCategoryFilter(cat.id);
                            }
                          }}
                        >
                          <View
                            style={[
                              styles.categorySummaryCard,
                              {
                                backgroundColor: isSelected
                                  ? cat.color
                                  : cat.color + "20",
                                borderColor: cat.color,
                                opacity:
                                  selectedCategoryFilter && !isSelected
                                    ? 0.5
                                    : 1,
                              },
                            ]}
                          >
                            {!isSelected && (
                              <View
                                style={[
                                  styles.categorySummaryDot,
                                  { backgroundColor: cat.color },
                                ]}
                              />
                            )}
                            <Text
                              style={[
                                styles.categorySummaryName,
                                {
                                  color: isSelected ? "#fff" : textColor,
                                },
                              ]}
                            >
                              {cat.name}
                            </Text>
                            <Text
                              style={[
                                styles.categorySummaryAmount,
                                {
                                  color: isSelected
                                    ? "#fff"
                                    : catSum < 0
                                      ? textColor
                                      : "#2ecc71",
                                  marginTop: 4,
                                  fontSize: 12,
                                  fontWeight: "600",
                                },
                              ]}
                            >
                              {new Intl.NumberFormat("de-DE", {
                                style: "currency",
                                currency: "EUR",
                              }).format(catSum)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Right Arrow */}
                  <TouchableOpacity
                    onPress={() => {
                      setScrollX((prev) => {
                        const next = prev + 200;
                        categoriesScrollRef.current?.scrollTo({
                          x: next,
                          animated: true,
                        });
                        return next;
                      });
                    }}
                    style={{
                      padding: 8,
                      marginLeft: 8,
                      marginRight: -12,
                      zIndex: 1,
                    }}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={textColor}
                      style={{ opacity: 0.7 }}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ color: textColor, opacity: 0.5 }}>
                No transactions found
              </Text>
            </View>
          }
          ListFooterComponent={
            type === "manual" ? (
              <TouchableOpacity
                onPress={handleDeleteAccount}
                style={{
                  marginTop: 32,
                  padding: 16,
                  backgroundColor: "#FF6B6B20",
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#FF6B6B",
                }}
              >
                <Text
                  style={{ color: "#FF6B6B", fontWeight: "600", fontSize: 16 }}
                >
                  Delete Account
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  transactionLeft: {
    flex: 1,
    marginRight: 16,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
  },
  referenceText: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    maxHeight: "80%", // Ensure modal fits on screen and scrolls if needed
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  categoryButton: {
    paddingVertical: 12,
    borderRadius: 8,
  },
  filterPreset: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  // Transaction category dot
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  // Detail modal
  detailRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  detailLabel: {
    fontSize: 13,
    opacity: 0.6,
    fontWeight: "500" as const,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500" as const,
    flexShrink: 1,
    textAlign: "right" as const,
  },
  // Category pills in detail modal
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  // Color picker grid
  colorGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
    marginBottom: 12,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  // Category management list
  catManageRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  catManageDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  catManageName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500" as const,
  },
  addCatButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: "dashed" as const,
    borderRadius: 8,
    marginTop: 12,
  },
  // Category summary cards
  categorySummaryCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 120,
    alignItems: "center" as const,
  },
  categorySummaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  categorySummaryName: {
    fontSize: 12,
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  categorySummaryAmount: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
});
