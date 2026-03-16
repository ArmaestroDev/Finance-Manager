import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { useAccounts } from "../../context/AccountsContext";
import { useCategories } from "../../context/CategoriesContext";
import { useSettings } from "../../context/SettingsContext";
import { useThemeColor } from "../../hooks/use-theme-color";
import type { Transaction } from "../../services/enableBanking";

const CONNECTED_TRANSACTIONS_PREFIX = "connected_transactions_";

// ── Helpers ──
const toUiDate = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const toApiDate = (uiDate: string) => {
  const [dd, mm, yyyy] = uiDate.split("-");
  if (!dd || !mm || !yyyy) return "";
  return `${yyyy}-${mm}-${dd}`;
};

const getStableTxId = (tx: Transaction) => {
  return (
    tx.transaction_id ||
    `gen_${tx.booking_date || ""}_${tx.transaction_amount.amount}_${tx.creditor?.name || tx.debtor?.name || ""}`
  );
};

const getTransactionAmount = (tx: Transaction) => {
  let amount = parseFloat(tx.transaction_amount.amount);

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

export default function HomeScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const router = useRouter();
  const { isBalanceHidden, i18n } = useSettings();
  const { accounts, refreshAccounts, isRefreshing, cashBalance } =
    useAccounts();
  const { categories, transactionCategoryMap } = useCategories();

  // ── Date filter state (default: 1st of this month → today) ──
  const [filterDateFrom, setFilterDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return toUiDate(d);
  });
  const [filterDateTo, setFilterDateTo] = useState<string>(() =>
    toUiDate(new Date()),
  );
  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");

  // ── Stats state ──
  const [statsLoading, setStatsLoading] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // ── Load transactions across all accounts ──
  useEffect(() => {
    if (!filterDateFrom || !filterDateTo || accounts.length === 0) return;
    loadAllTransactions();
  }, [filterDateFrom, filterDateTo, accounts]);

  const loadAllTransactions = async () => {
    setStatsLoading(true);
    try {
      const apiFrom = toApiDate(filterDateFrom);
      const apiTo = toApiDate(filterDateTo);
      let combined: Transaction[] = [];

      console.log("[STATS] Loading transactions for", accounts.length, "accounts, date range:", apiFrom, "to", apiTo);

      for (const acc of accounts) {
        let key: string;
        if (acc.type === "manual") {
          key = `manual_transactions_${acc.id}`;
        } else {
          key = `${CONNECTED_TRANSACTIONS_PREFIX}${acc.id}`;
        }

        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const txs: Transaction[] = JSON.parse(data);
            console.log(`[STATS] Account ${acc.id} (${acc.type}): ${txs.length} total txs found in storage`);
            // Log first few transactions to see their structure
            if (txs.length > 0) {
              console.log("[STATS] Sample tx:", JSON.stringify(txs[0], null, 2));
            }
            const filtered = txs.filter((t) => {
              const date = t.booking_date || t.value_date || "";
              return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
            });
            console.log(`[STATS] After date filter: ${filtered.length} txs`);
            combined = [...combined, ...filtered];
          } else {
            console.log(`[STATS] Account ${acc.id} (${acc.type}): NO data in AsyncStorage for key "${key}"`);
          }
        } catch (e) {
          console.log(`[STATS] Error loading account ${acc.id}:`, e);
        }
      }

      console.log("[STATS] Total combined transactions:", combined.length);
      setAllTransactions(combined);
    } finally {
      setStatsLoading(false);
    }
  };

  // ── Compute totals ──
  const { totalAssets, totalLiabilities } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;

    if (cashBalance >= 0) {
      assets += cashBalance;
    } else {
      liabilities += Math.abs(cashBalance);
    }

    accounts.forEach((acc) => {
      const balance = acc.balance || 0;
      if (balance >= 0) {
        assets += balance;
      } else {
        liabilities += Math.abs(balance);
      }
    });

    return { totalAssets: assets, totalLiabilities: liabilities };
  }, [accounts, cashBalance]);

  // ── Compute category breakdown ──
  const { totalIncome, totalExpenses, categoryBreakdown, pieData } =
    useMemo(() => {
      let income = 0;
      let expenses = 0;
      const catAmounts: Record<string, number> = {};

      let debugCount = 0;
      allTransactions.forEach((tx) => {
        const amount = getTransactionAmount(tx);
        if (isNaN(amount)) return;

        if (debugCount < 5) {
          console.log(`[STATS COMPUTE] tx: indicator=${tx.credit_debit_indicator}, rawAmount=${tx.transaction_amount.amount}, computedAmount=${amount}, creditor=${tx.creditor?.name}, debtor=${tx.debtor?.name}`);
          debugCount++;
        }

        if (amount >= 0) {
          income += amount;
        } else {
          expenses += Math.abs(amount);
          const txId = getStableTxId(tx);
          const catId = transactionCategoryMap[txId];
          if (catId) {
            catAmounts[catId] = (catAmounts[catId] || 0) + Math.abs(amount);
          } else {
            catAmounts["__uncategorized__"] =
              (catAmounts["__uncategorized__"] || 0) + Math.abs(amount);
          }
        }
      });

      console.log(`[STATS COMPUTE] Total income=${income}, expenses=${expenses}, txCount=${allTransactions.length}, categories assigned=${Object.keys(catAmounts).length}`);

      // Build breakdown list
      const breakdown: {
        categoryId: string;
        name: string;
        color: string;
        amount: number;
      }[] = [];

      for (const [catId, amount] of Object.entries(catAmounts)) {
        if (catId === "__uncategorized__") {
          breakdown.push({
            categoryId: catId,
            name: i18n.uncategorized || "Uncategorized",
            color: "#636E72",
            amount,
          });
        } else {
          const cat = categories.find((c) => c.id === catId);
          if (cat) {
            breakdown.push({
              categoryId: catId,
              name: cat.name,
              color: cat.color,
              amount,
            });
          } else {
            breakdown.push({
              categoryId: catId,
              name: i18n.uncategorized || "Uncategorized",
              color: "#636E72",
              amount,
            });
          }
        }
      }

      // Sort by amount descending
      breakdown.sort((a, b) => b.amount - a.amount);

      // Build pie data
      const pie = breakdown.map((item) => ({
        value: item.amount,
        color: item.color,
        text: item.name,
      }));

      return {
        totalIncome: income,
        totalExpenses: expenses,
        categoryBreakdown: breakdown,
        pieData: pie,
      };
    }, [allTransactions, transactionCategoryMap, categories, i18n]);

  const onRefresh = () => {
    refreshAccounts();
    loadAllTransactions();
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const openDateModal = () => {
    setTempFrom(filterDateFrom);
    setTempTo(filterDateTo);
    setDateModalVisible(true);
  };

  const applyDateFilter = () => {
    setFilterDateFrom(tempFrom);
    setFilterDateTo(tempTo);
    setDateModalVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header with Settings */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: textColor }]}>
            {i18n.overview_title}
          </Text>
          <Text style={[styles.subtitle, { color: textColor, opacity: 0.6 }]}>
            {i18n.overview_subtitle}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/settings")}>
          <Ionicons name="settings-outline" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={tintColor}
          />
        }
      >
        {/* Total Assets Card */}
        <View style={[styles.card, { backgroundColor: tintColor }]}>
          <Text style={[styles.cardTitle, { color: backgroundColor }]}>
            {i18n.total_assets}
          </Text>
          <Text style={[styles.cardAmount, { color: backgroundColor }]}>
            {isBalanceHidden ? "*****" : formatAmount(totalAssets)}
          </Text>
        </View>

        {/* Total Liabilities Card */}
        {totalLiabilities > 0 && (
          <View style={[styles.card, { backgroundColor: "#ffcccc" }]}>
            <Text style={[styles.cardTitle, { color: "#cc0000" }]}>
              {i18n.total_liabilities}
            </Text>
            <Text style={[styles.cardAmount, { color: "#cc0000" }]}>
              {isBalanceHidden ? "*****" : `-${formatAmount(totalLiabilities)}`}
            </Text>
          </View>
        )}

        {/* Date Filter Modal */}
        <Modal
          visible={isDateModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDateModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {i18n.statistics_title}
              </Text>

              <View style={{ gap: 12, marginBottom: 16 }}>
                <View>
                  <Text
                    style={{ color: textColor, marginBottom: 4, fontSize: 12 }}
                  >
                    From (DD-MM-YYYY)
                  </Text>
                  <TextInput
                    style={[
                      styles.dateInput,
                      { color: textColor, borderColor: tintColor },
                    ]}
                    value={tempFrom}
                    onChangeText={setTempFrom}
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
                      styles.dateInput,
                      { color: textColor, borderColor: tintColor },
                    ]}
                    value={tempTo}
                    onChangeText={setTempTo}
                    placeholder="DD-MM-YYYY"
                    placeholderTextColor={textColor + "50"}
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => setDateModalVisible(false)}
                  style={styles.modalButton}
                >
                  <Text style={{ color: textColor }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={applyDateFilter}
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

        {/* ── Statistics Section ── */}
        <View style={styles.statsSection}>
          <View style={styles.statsHeader}>
            <Text style={[styles.statsTitle, { color: textColor }]}>
              {i18n.statistics_title}
            </Text>
            <TouchableOpacity onPress={openDateModal}>
              <Ionicons name="calendar-outline" size={22} color={textColor} />
            </TouchableOpacity>
          </View>{" "}
          {/* Stats Card */}
          <View
            style={[styles.statsCard, { backgroundColor: tintColor + "0A" }]}
          >
            {statsLoading ? (
              <View style={styles.statsLoading}>
                <ActivityIndicator size="large" color={tintColor} />
              </View>
            ) : allTransactions.length === 0 ? (
              <View style={styles.statsLoading}>
                <Text style={{ color: textColor, opacity: 0.5, fontSize: 14 }}>
                  {i18n.pull_to_refresh}
                </Text>
              </View>
            ) : (
              <>
                {/* Pie + Income/Expenses row */}
                <View style={styles.chartRow}>
                  {/* Pie Chart */}
                  <View style={styles.pieContainer}>
                    {pieData.length > 0 ? (
                      <PieChart
                        data={pieData}
                        donut
                        radius={70}
                        innerRadius={40}
                        innerCircleColor={backgroundColor}
                        centerLabelComponent={() => (
                          <View style={styles.pieCenterLabel}>
                            <Text
                              style={[
                                styles.pieCenterAmount,
                                { color: textColor },
                              ]}
                            >
                              {isBalanceHidden
                                ? "***"
                                : formatAmount(totalExpenses)}
                            </Text>
                          </View>
                        )}
                      />
                    ) : (
                      <View
                        style={[
                          styles.emptyPie,
                          { borderColor: tintColor + "30" },
                        ]}
                      >
                        <Text
                          style={{
                            color: textColor,
                            opacity: 0.4,
                            fontSize: 12,
                          }}
                        >
                          —
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Income / Expenses */}
                  <View style={styles.incomeExpenseCol}>
                    <View style={styles.incExpItem}>
                      <View style={styles.incExpHeader}>
                        <View
                          style={[
                            styles.incExpDot,
                            { backgroundColor: "#2ecc71" },
                          ]}
                        />
                        <Text
                          style={[
                            styles.incExpLabel,
                            { color: textColor, opacity: 0.7 },
                          ]}
                        >
                          {i18n.income_label}
                        </Text>
                      </View>
                      <Text style={[styles.incExpAmount, { color: "#2ecc71" }]}>
                        {isBalanceHidden ? "*****" : formatAmount(totalIncome)}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.incExpDivider,
                        { backgroundColor: textColor + "15" },
                      ]}
                    />

                    <View style={styles.incExpItem}>
                      <View style={styles.incExpHeader}>
                        <View
                          style={[
                            styles.incExpDot,
                            { backgroundColor: "#FF6B6B" },
                          ]}
                        />
                        <Text
                          style={[
                            styles.incExpLabel,
                            { color: textColor, opacity: 0.7 },
                          ]}
                        >
                          {i18n.expenses_label}
                        </Text>
                      </View>
                      <Text style={[styles.incExpAmount, { color: "#FF6B6B" }]}>
                        {isBalanceHidden
                          ? "*****"
                          : formatAmount(totalExpenses)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Category Legend */}
                {categoryBreakdown.length > 0 && (
                  <View style={styles.legendContainer}>
                    {categoryBreakdown.map((item) => (
                      <View key={item.categoryId} style={styles.legendRow}>
                        <View style={styles.legendLeft}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: item.color },
                            ]}
                          />
                          <Text
                            style={[styles.legendName, { color: textColor }]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.legendAmount,
                            { color: textColor, opacity: 0.8 },
                          ]}
                        >
                          {isBalanceHidden
                            ? "*****"
                            : formatAmount(item.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Helper Text */}
        <Text
          style={{
            textAlign: "center",
            marginTop: 8,
            color: textColor,
            opacity: 0.5,
          }}
        >
          {isBalanceHidden ? i18n.balances_hidden : i18n.pull_to_refresh}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    opacity: 0.9,
  },
  cardAmount: {
    fontSize: 32,
    fontWeight: "700",
  },

  // ── Statistics ──
  statsSection: {
    marginTop: 8,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
  },
  statsLoading: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  pieContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  pieCenterLabel: {
    alignItems: "center",
    justifyContent: "center",
  },
  pieCenterAmount: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyPie: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  incomeExpenseCol: {
    flex: 1,
    gap: 12,
  },
  incExpItem: {
    gap: 4,
  },
  incExpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  incExpDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  incExpLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  incExpAmount: {
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 18,
  },
  incExpDivider: {
    height: 1,
    borderRadius: 1,
  },

  // ── Legend ──
  legendContainer: {
    marginTop: 20,
    gap: 10,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendName: {
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
});
