import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, SectionList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSettings } from "../../../../shared/context/SettingsContext";
import { useThemeColor } from "../../../../shared/hooks/use-theme-color";
import { useDateFilter } from "../../../../shared/context/DateFilterContext";
import { useCategories } from "../../context/CategoriesContext";
import { useFinanceData } from "../../../dashboard/hooks/useFinanceData";
import { useFinanceStats } from "../../../dashboard/hooks/useFinanceStats";
import { CategoryFilterBar } from "../../../../shared/components/CategoryFilterBar";
import { TransactionStatsSummary } from "../../../../shared/components/TransactionStatsSummary";
import { TransactionItem } from "./TransactionItem";
import { DateFilterModal } from "../../../../shared/components/DateFilterModal";
import { getStableTxId } from "../../utils/transactions";
import { formatDate } from "../../../../shared/utils/date";

export function TransactionsScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const { isBalanceHidden, i18n } = useSettings();
  const { categories, getCategoryForTransaction, transactionCategoryMap } = useCategories();
  const { filterDateFrom, filterDateTo, applyDateFilter, selectedCategoryId, setSelectedCategoryId } = useDateFilter();
  const { allTransactions, statsLoading, refreshAccounts, isRefreshing, loadAllTransactions } = useFinanceData();
  const { totalIncome, totalExpenses } = useFinanceStats({ allTransactions, accounts: [], cashBalance: 0, categories, transactionCategoryMap });

  const [isDateModalVisible, setDateModalVisible] = useState(false);

  const filteredTransactions = useMemo(() => {
    if (!selectedCategoryId) return allTransactions;
    return allTransactions.filter((tx) => {
      const txId = getStableTxId(tx);
      const cat = getCategoryForTransaction(txId);
      return cat?.id === selectedCategoryId;
    });
  }, [allTransactions, selectedCategoryId, getCategoryForTransaction]);

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredTransactions.forEach((tx) => {
      const dateStr = tx.booking_date || tx.value_date || "";
      const date = dateStr ? formatDate(dateStr) : "Unknown Date";
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
    });
    return Object.keys(groups).map((date) => ({
      title: date,
      data: groups[date],
    }));
  }, [filteredTransactions]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: textColor + "10" }]}>
        <View>
          <Text style={[styles.pageTitle, { color: textColor }]}>{i18n.tab_transactions}</Text>
          <Text style={{ color: textColor, opacity: 0.4, fontSize: 12, marginTop: 2 }}>
            {filterDateFrom} – {filterDateTo}
          </Text>
        </View>

        <TransactionStatsSummary
          income={totalIncome}
          expenses={totalExpenses}
          isBalanceHidden={isBalanceHidden}
          textColor={textColor}
          i18n={i18n}
        />

        <TouchableOpacity style={[styles.dateBtn, { backgroundColor: textColor + "10" }]} onPress={() => setDateModalVisible(true)}>
          <Ionicons name="calendar-outline" size={18} color={textColor} />
          <Text style={{ color: textColor, fontSize: 13, fontWeight: "600" }}>Date Range</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter — compact on desktop */}
      <View style={[styles.filterBar, { borderBottomColor: textColor + "08" }]}>
        <CategoryFilterBar
          categories={categories}
          transactions={allTransactions}
          getCategoryForTransaction={getCategoryForTransaction}
          selectedFilter={selectedCategoryId}
          onSelectFilter={setSelectedCategoryId}
          accountIncome={totalIncome}
          accountExpenses={totalExpenses}
          isBalanceHidden={isBalanceHidden}
          textColor={textColor}
          tintColor={tintColor}
          i18n={i18n}
          showStats={false}
        />
      </View>

      {/* Table header */}
      <View style={[styles.tableHeader, { borderBottomColor: textColor + "15" }]}>
        <Text style={[styles.th, { color: textColor, width: 140 }]}>Category</Text>
        <Text style={[styles.th, { color: textColor, flex: 1 }]}>Merchant</Text>
        <Text style={[styles.thRight, { color: textColor }]}>Amount</Text>
      </View>

      {statsLoading && allTransactions.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tintColor} />
        </View>
      ) : (
        <SectionList
          sections={groupedTransactions}
          renderItem={({ item }) => (
            <TransactionItem
              item={item}
              getCategoryForTransaction={getCategoryForTransaction}
              onPress={() => {}}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor }]}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
            </View>
          )}
          keyExtractor={(item) => getStableTxId(item)}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { refreshAccounts(); loadAllTransactions(); }}
              tintColor={tintColor}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>📋</Text>
              <Text style={[styles.emptyText, { color: textColor, opacity: 0.5 }]}>No transactions found</Text>
            </View>
          }
          ListFooterComponent={
            filteredTransactions.length > 0 ? (
              <Text style={{ textAlign: "center", color: textColor, opacity: 0.3, fontSize: 12, paddingVertical: 20 }}>
                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
              </Text>
            ) : null
          }
        />
      )}

      <DateFilterModal
        visible={isDateModalVisible}
        title={i18n.statistics_title}
        tempFrom={filterDateFrom}
        tempTo={filterDateTo}
        onTempFromChange={() => {}}
        onTempToChange={() => {}}
        onApply={(from, to) => { applyDateFilter(from, to); setDateModalVisible(false); }}
        onCancel={() => setDateModalVisible(false)}
        backgroundColor={backgroundColor}
        textColor={textColor}
        tintColor={tintColor}
        i18n={i18n}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 32, paddingVertical: 20, borderBottomWidth: 1 },
  pageTitle: { fontSize: 26, fontWeight: "800" },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  filterBar: { paddingHorizontal: 24, paddingVertical: 8, borderBottomWidth: 1 },
  tableHeader: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, marginBottom: 0 },
  th: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.5 },
  thRight: { width: 120, textAlign: "right", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.5 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingBottom: 40 },
  emptyState: { marginTop: 80, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  sectionHeader: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "rgba(128,128,128,0.1)", marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.6 },
});
