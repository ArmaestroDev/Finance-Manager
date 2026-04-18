import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BalanceCard } from "./BalanceCard";
import { DateFilterModal } from "../../../../shared/components/DateFilterModal";
import { StatsOverview } from "./StatsOverview";
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

  const { allTransactions, statsLoading, filterDateFrom, filterDateTo, accounts, cashBalance, refreshAccounts, loadAllTransactions, applyDateFilter } = useFinanceData();
  const { totalAssets, totalLiabilities, totalIncome, totalExpenses, categoryBreakdown, pieData } = useFinanceStats({ allTransactions, accounts, cashBalance, categories, transactionCategoryMap });
  const { setSelectedCategoryId } = useDateFilter();

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    let targetAccount = null;
    if (mainAccountId) targetAccount = accounts.find(a => a.id === mainAccountId);
    if (!targetAccount) targetAccount = accounts.find(a => a.category === "Giro") || accounts[0];
    if (targetAccount) router.push({ pathname: `/account/${targetAccount.id}` as any, params: { name: targetAccount.name, type: targetAccount.type } });
  };

  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");

  const openDateModal = () => { setTempFrom(filterDateFrom); setTempTo(filterDateTo); setDateModalVisible(true); };
  const handleApplyDateFilter = (from: string, to: string) => { applyDateFilter(from, to); setDateModalVisible(false); };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Top header bar */}
      <View style={[styles.topBar, { borderBottomColor: textColor + "10" }]}>
        <View>
          <Text style={[styles.pageTitle, { color: textColor }]}>{i18n.overview_title}</Text>
          <Text style={[styles.pageSubtitle, { color: textColor, opacity: 0.5 }]}>{i18n.overview_subtitle}</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={openDateModal} style={[styles.topBtn, { backgroundColor: textColor + "10" }]}>
            <Ionicons name="calendar-outline" size={18} color={textColor} />
            <Text style={{ color: textColor, fontSize: 13, fontWeight: "600" }}>
              {filterDateFrom} – {filterDateTo}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { refreshAccounts(); loadAllTransactions(); }} style={[styles.topBtn, { backgroundColor: tintColor + "15" }]}>
            <Ionicons name="refresh" size={18} color={tintColor} />
            <Text style={{ color: tintColor, fontSize: 13, fontWeight: "600" }}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/settings")} style={[styles.topBtn, { backgroundColor: textColor + "10" }]}>
            <Ionicons name="settings-outline" size={18} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

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
        i18n={i18n}
      />
      {/* Two-column desktop layout */}
      <View style={styles.twoColumn}>
        {/* Left column: balance cards */}
        <View style={styles.leftPanel}>
          <Text style={[styles.sectionLabel, { color: textColor, opacity: 0.5 }]}>{i18n.overview_title.toUpperCase()}</Text>
          <BalanceCard
            title={i18n.total_assets}
            amount={isBalanceHidden ? "*****" : formatAmount(totalAssets)}
            backgroundColor={tintColor}
            textColor={backgroundColor}
          />
          {totalLiabilities > 0 && (
            <BalanceCard
              title={i18n.total_liabilities}
              amount={isBalanceHidden ? "*****" : `-${formatAmount(totalLiabilities)}`}
              backgroundColor="#ffcccc"
              textColor="#cc0000"
            />
          )}
          {isBalanceHidden && (
            <Text style={{ color: textColor, opacity: 0.4, fontSize: 12, textAlign: "center", marginTop: 8 }}>
              {i18n.balances_hidden}
            </Text>
          )}
        </View>

        {/* Right column: stats */}
        <View style={styles.rightPanel}>
          <View style={styles.statsSectionHeader}>
            <Text style={[styles.sectionLabel, { color: textColor, opacity: 0.5 }]}>{i18n.statistics_title?.toUpperCase()}</Text>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 32, paddingVertical: 20, borderBottomWidth: 1 },
  pageTitle: { fontSize: 26, fontWeight: "800" },
  pageSubtitle: { fontSize: 13, marginTop: 2 },
  topActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  topBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  twoColumn: { flex: 1, flexDirection: "row" },
  leftPanel: { width: 300, padding: 24, borderRightWidth: 1, borderRightColor: "rgba(128,128,128,0.1)", gap: 0 },
  rightPanel: { flex: 1, padding: 24, overflow: "scroll" as any },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 16 },
  statsSectionHeader: { marginBottom: 16 },
});
