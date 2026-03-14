import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
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

// ── Date presets ──
type PresetKey = "30" | "90" | "year" | "all";

export default function HomeScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const router = useRouter();
  const { isBalanceHidden, i18n } = useSettings();
  const { accounts, refreshAccounts, isRefreshing, cashBalance } =
    useAccounts();
  const { categories, transactionCategoryMap } = useCategories();

  // ── Date filter state ──
  const [activePreset, setActivePreset] = useState<PresetKey>("30");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  // ── Stats state ──
  const [statsLoading, setStatsLoading] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // ── Initialise dates (default: last 30 days) ──
  useEffect(() => {
    applyPreset("30");
  }, []);

  const applyPreset = useCallback((preset: PresetKey) => {
    setActivePreset(preset);
    const to = new Date();
    const from = new Date();

    if (preset === "year") {
      from.setMonth(0, 1);
    } else if (preset === "all") {
      from.setFullYear(2000, 0, 1);
    } else {
      from.setDate(from.getDate() - parseInt(preset, 10));
    }

    setFilterDateFrom(toUiDate(from));
    setFilterDateTo(toUiDate(to));
  }, []);

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
            const filtered = txs.filter((t) => {
              const date = t.booking_date || t.value_date || "";
              return (!apiFrom || date >= apiFrom) && (!apiTo || date <= apiTo);
            });
            combined = [...combined, ...filtered];
          }
        } catch {
          // skip account on error
        }
      }

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

      allTransactions.forEach((tx) => {
        const amount = parseFloat(tx.transaction_amount.amount);
        if (isNaN(amount)) return;

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

  const presets: { key: PresetKey; label: string }[] = [
    { key: "30", label: i18n.filter_30 },
    { key: "90", label: i18n.filter_90 },
    { key: "year", label: i18n.filter_year },
    { key: "all", label: i18n.filter_all },
  ];

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

        {/* ── Statistics Section ── */}
        <View style={styles.statsSection}>
          <Text style={[styles.statsTitle, { color: textColor }]}>
            {i18n.statistics_title}
          </Text>

          {/* Date Preset Buttons */}
          <View style={styles.presetRow}>
            {presets.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.presetButton,
                  {
                    backgroundColor:
                      activePreset === p.key ? tintColor : tintColor + "15",
                  },
                ]}
                onPress={() => applyPreset(p.key)}
              >
                <Text
                  style={[
                    styles.presetText,
                    {
                      color:
                        activePreset === p.key ? backgroundColor : textColor,
                    },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
  statsTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  presetText: {
    fontSize: 13,
    fontWeight: "600",
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
});
