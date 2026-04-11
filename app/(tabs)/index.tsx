import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { BalanceCard } from "../../components/BalanceCard";
import { DateFilterModal } from "../../components/DateFilterModal";
import { StatsOverview } from "../../components/StatsOverview";
import { useCategories } from "../../context/CategoriesContext";
import { useSettings } from "../../context/SettingsContext";
import { useThemeColor } from "../../hooks/use-theme-color";
import { useFinanceData } from "../../hooks/useFinanceData";
import { useFinanceStats } from "../../hooks/useFinanceStats";
import { formatAmount } from "../utils/financeHelpers";

export default function HomeScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const router = useRouter();
  const { isBalanceHidden, i18n } = useSettings();
  const { categories, transactionCategoryMap } = useCategories();

  // ── Data hook ──
  const {
    allTransactions,
    statsLoading,
    filterDateFrom,
    filterDateTo,
    accounts,
    cashBalance,
    refreshAccounts,
    isRefreshing,
    loadAllTransactions,
    applyDateFilter,
  } = useFinanceData();

  // ── Stats hook ──
  const {
    totalAssets,
    totalLiabilities,
    totalIncome,
    totalExpenses,
    categoryBreakdown,
    pieData,
  } = useFinanceStats({
    allTransactions,
    accounts,
    cashBalance,
    categories,
    transactionCategoryMap,
  });

  // ── Date modal state (UI-only) ──
  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");

  const openDateModal = () => {
    setTempFrom(filterDateFrom);
    setTempTo(filterDateTo);
    setDateModalVisible(true);
  };

  const handleApplyDateFilter = () => {
    applyDateFilter(tempFrom, tempTo);
    setDateModalVisible(false);
  };

  const onRefresh = () => {
    refreshAccounts();
    loadAllTransactions();
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
        <BalanceCard
          title={i18n.total_assets}
          amount={isBalanceHidden ? "*****" : formatAmount(totalAssets)}
          backgroundColor={tintColor}
          textColor={backgroundColor}
        />

        {/* Total Liabilities Card */}
        {totalLiabilities > 0 && (
          <BalanceCard
            title={i18n.total_liabilities}
            amount={
              isBalanceHidden
                ? "*****"
                : `-${formatAmount(totalLiabilities)}`
            }
            backgroundColor="#ffcccc"
            textColor="#cc0000"
          />
        )}

        {/* Date Filter Modal */}
        <DateFilterModal
          visible={isDateModalVisible}
          title={i18n.statistics_title}
          tempFrom={tempFrom}
          tempTo={tempTo}
          onTempFromChange={setTempFrom}
          onTempToChange={setTempTo}
          onApply={handleApplyDateFilter}
          onCancel={() => setDateModalVisible(false)}
          backgroundColor={backgroundColor}
          textColor={textColor}
          tintColor={tintColor}
        />

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
          <StatsOverview
            statsLoading={statsLoading}
            hasTransactions={allTransactions.length > 0}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            categoryBreakdown={categoryBreakdown}
            pieData={pieData}
            isBalanceHidden={isBalanceHidden}
            backgroundColor={backgroundColor}
            textColor={textColor}
            tintColor={tintColor}
            i18n={i18n}
          />
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
});
