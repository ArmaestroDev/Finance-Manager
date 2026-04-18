import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSettings } from "../../../../shared/context/SettingsContext";
import { useThemeColor } from "../../../../shared/hooks/use-theme-color";
import { useDateFilter } from "../../../../shared/context/DateFilterContext";
import { useCategories } from "../../context/CategoriesContext";
import { useFinanceData } from "../../../dashboard/hooks/useFinanceData";
import { useFinanceStats } from "../../../dashboard/hooks/useFinanceStats";
import { CategoryFilterBar } from "../../../../shared/components/CategoryFilterBar";
import { TransactionItem } from "../TransactionItem";
import { DateFilterModal } from "../../../../shared/components/DateFilterModal";
import { getStableTxId } from "../../utils/transactions";

export function TransactionsScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const router = useRouter();
  const { isBalanceHidden, i18n } = useSettings();
  const { categories, getCategoryForTransaction, transactionCategoryMap } = useCategories();
  const { filterDateFrom, filterDateTo, applyDateFilter, selectedCategoryId, setSelectedCategoryId } = useDateFilter();

  const { allTransactions, statsLoading, refreshAccounts, isRefreshing, loadAllTransactions } = useFinanceData();

  const { totalIncome, totalExpenses } = useFinanceStats({
    allTransactions,
    accounts: [],
    cashBalance: 0,
    categories,
    transactionCategoryMap,
  });

  const [isDateModalVisible, setDateModalVisible] = useState(false);

  const filteredTransactions = useMemo(() => {
    if (!selectedCategoryId) return allTransactions;
    return allTransactions.filter((tx) => {
      const txId = getStableTxId(tx);
      const cat = getCategoryForTransaction(txId);
      return cat?.id === selectedCategoryId;
    });
  }, [allTransactions, selectedCategoryId, getCategoryForTransaction]);

  const handleTransactionPress = (tx: any) => {};

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: textColor }]}>{i18n.tab_transactions}</Text>
          <Text style={[styles.subtitle, { color: textColor, opacity: 0.6 }]}>
            {filterDateFrom} – {filterDateTo}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setDateModalVisible(true)}>
          <Ionicons name="calendar-outline" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

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
      />

      {statsLoading && allTransactions.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tintColor} />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={({ item }) => (
            <TransactionItem
              item={item}
              getCategoryForTransaction={getCategoryForTransaction}
              onPress={handleTransactionPress}
            />
          )}
          keyExtractor={(item) => getStableTxId(item)}
          contentContainerStyle={styles.listContent}
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
              <Text style={[styles.emptyText, { color: textColor, opacity: 0.5 }]}>
                No transactions found
              </Text>
            </View>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80, paddingHorizontal: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 14, marginTop: 4 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingBottom: 40 },
  emptyState: { marginTop: 80, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 16, fontWeight: "600" },
});
