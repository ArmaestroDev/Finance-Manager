import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BalanceCard } from "../BalanceCard";
import { DateFilterModal } from "../../../../shared/components/DateFilterModal";
import { StatsOverview } from "../StatsOverview";
import { useCategories } from "../../../transactions/context/CategoriesContext";
import { useSettings } from "../../../../shared/context/SettingsContext";
import { useThemeColor } from "../../../../shared/hooks/use-theme-color";
import { useFinanceData } from "../../hooks/useFinanceData";
import { useFinanceStats } from "../../hooks/useFinanceStats";
import { formatAmount } from "../../../../shared/utils/financeHelpers";
import { useDateFilter } from "../../../../shared/context/DateFilterContext";

export function DashboardScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const router = useRouter();
  const { isBalanceHidden, i18n, mainAccountId } = useSettings();
  const { categories, transactionCategoryMap } = useCategories();

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

  const { setSelectedCategoryId } = useDateFilter();

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategoryId(categoryId);

    let targetAccount = null;
    if (mainAccountId) {
      targetAccount = accounts.find((a) => a.id === mainAccountId);
    }

    if (!targetAccount) {
      targetAccount = accounts.find((a) => a.category === "Giro") || accounts[0];
    }

    if (targetAccount) {
      router.push({
        pathname: `/account/${targetAccount.id}` as any,
        params: { name: targetAccount.name, type: targetAccount.type },
      });
    }
  };

  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");

  const openDateModal = () => {
    setTempFrom(filterDateFrom);
    setTempTo(filterDateTo);
    setDateModalVisible(true);
  };

  const handleApplyDateFilter = (from: string, to: string) => {
    applyDateFilter(from, to);
    setDateModalVisible(false);
  };

  const onRefresh = () => {
    refreshAccounts();
    loadAllTransactions();
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
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
        <BalanceCard
          title={i18n.total_assets}
          amount={isBalanceHidden ? "*****" : formatAmount(totalAssets)}
          backgroundColor={tintColor}
          textColor={backgroundColor}
        />

        {totalLiabilities > 0 && (
          <BalanceCard
            title={i18n.total_liabilities}
            amount={
              isBalanceHidden ? "*****" : `-${formatAmount(totalLiabilities)}`
            }
            backgroundColor="#ffcccc"
            textColor="#cc0000"
          />
        )}

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

        <View style={styles.statsSection}>
          <View style={styles.statsHeader}>
            <Text style={[styles.statsTitle, { color: textColor }]}>
              {i18n.statistics_title}
            </Text>
            <TouchableOpacity onPress={openDateModal}>
              <Ionicons name="calendar-outline" size={22} color={textColor} />
            </TouchableOpacity>
          </View>
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
            onCategoryPress={handleCategoryPress}
            i18n={i18n}
          />
        </View>

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
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  scrollContent: {
    paddingBottom: 64,
    gap: 24,
  },
  statsSection: {
    marginTop: 16,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
});
