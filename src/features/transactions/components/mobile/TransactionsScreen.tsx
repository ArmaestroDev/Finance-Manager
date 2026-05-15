import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
import { MobileShell, MOBILE_TAB_SPACE } from "@/src/shared/components/MobileShell";
import { CategoryFilterBar } from "@/src/shared/components/CategoryFilterBar";
import { DateFilterModal } from "@/src/shared/components/DateFilterModal";
import { useDateFilter } from "@/src/shared/context/DateFilterContext";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  Balance,
  Button,
  Chip,
  IconCog,
  IconPlus,
  Label,
  Rule,
  useFMTheme,
} from "@/src/shared/design";
import { formatDate } from "@/src/shared/utils/date";
import type { Transaction } from "@/src/services/enableBanking";

import {
  CATEGORY_COLORS,
  useCategories,
} from "@/src/features/transactions/context/CategoriesContext";
import { useTransactionsContext } from "@/src/features/transactions/context/TransactionsContext";
import { AddTransactionModal } from "@/src/features/transactions/components/AddTransactionModal";
import { CategoryManageModal } from "@/src/features/transactions/components/CategoryManageModal";
import { EditTransactionModal } from "@/src/features/transactions/components/EditTransactionModal";
import { TransactionDetailModal } from "@/src/features/transactions/components/TransactionDetailModal";
import { useFinanceData } from "@/src/features/dashboard/hooks/useFinanceData";
import { useFinanceStats } from "@/src/features/dashboard/hooks/useFinanceStats";
import { getStableTxId } from "../../utils/transactions";
import { TransactionItem } from "./TransactionItem";

export function TransactionsScreen() {
  const t = useFMTheme();
  const router = useRouter();
  const { isBalanceHidden, i18n, mainAccountId } = useSettings();
  const {
    categories,
    getCategoryForTransaction,
    transactionCategoryMap,
    assignCategory,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();
  const {
    filterDateFrom,
    filterDateTo,
    applyDateFilter,
    selectedCategoryId,
    setSelectedCategoryId,
  } = useDateFilter();
  const {
    addManualTransaction,
    updateManualTransaction,
    deleteManualTransaction,
  } = useTransactionsContext();

  const {
    allTransactions,
    statsLoading,
    refreshAccounts,
    isRefreshing,
    loadAllTransactions,
    accounts,
  } = useFinanceData();

  const { totalIncome, totalExpenses } = useFinanceStats({
    allTransactions,
    accounts: [],
    cashBalance: 0,
    categories,
    transactionCategoryMap,
  });

  const masked = isBalanceHidden;

  // The aggregated list comes from one account (main → first Giro → first
  // account); manual add/edit/delete need that same owning account id.
  const targetAccount = useMemo(() => {
    if (mainAccountId) {
      const found = accounts.find((a) => a.id === mainAccountId);
      if (found) return found;
    }
    return accounts.find((a) => a.category === "Giro") ?? accounts[0] ?? null;
  }, [accounts, mainAccountId]);

  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");
  const [isDetailVisible, setDetailVisible] = useState(false);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [isAddVisible, setAddVisible] = useState(false);
  const [isEditVisible, setEditVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isCatManageVisible, setCatManageVisible] = useState(false);

  const filteredTransactions = useMemo(() => {
    if (!selectedCategoryId) return allTransactions;
    return allTransactions.filter((tx) => {
      const cat = getCategoryForTransaction(getStableTxId(tx));
      return cat?.id === selectedCategoryId;
    });
  }, [allTransactions, selectedCategoryId, getCategoryForTransaction]);

  const sections = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach((tx) => {
      const dateStr = tx.booking_date || tx.value_date || "";
      const date = dateStr ? formatDate(dateStr) : "Unknown date";
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
    });
    return Object.keys(groups).map((date) => ({
      title: date,
      data: groups[date],
    }));
  }, [filteredTransactions]);

  const openDateModal = () => {
    setTempFrom(filterDateFrom);
    setTempTo(filterDateTo);
    setDateModalVisible(true);
  };

  const handleTransactionPress = (tx: Transaction) => {
    setDetailTx(tx);
    setDetailVisible(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setEditVisible(true);
  };

  const onRefresh = () => {
    refreshAccounts();
    loadAllTransactions();
  };

  const rangeText =
    filterDateFrom && filterDateTo
      ? `${filterDateFrom} → ${filterDateTo}`
      : "All time";

  return (
    <MobileShell
      scrollable={false}
      headerOverride={
        <MobileHeader
          title={i18n.tab_transactions}
          sub={rangeText}
          right={
            <>
              <Chip onPress={openDateModal}>{i18n.date_range}</Chip>
              <Pressable
                onPress={() => router.push("/settings" as never)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  padding: 4,
                })}
              >
                <IconCog size={18} color={t.inkSoft} />
              </Pressable>
            </>
          }
        />
      }
    >
      {/* Stats summary card */}
      <View style={styles.headerArea}>
        <View
          style={[
            styles.statsCard,
            { backgroundColor: t.surface, borderColor: t.line },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Label>{i18n.income_label}</Label>
            <View style={{ marginTop: 5 }}>
              <Balance value={totalIncome} masked={masked} size={15} />
            </View>
          </View>
          <Rule vertical />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Label>{i18n.expenses_label}</Label>
            <View style={{ marginTop: 5 }}>
              <Balance value={-totalExpenses} masked={masked} size={15} />
            </View>
          </View>
          <Rule vertical />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Label>Net</Label>
            <View style={{ marginTop: 5 }}>
              <Balance
                value={totalIncome - totalExpenses}
                masked={masked}
                size={15}
                total
              />
            </View>
          </View>
        </View>

        {/* Category filter + manage */}
        <View style={styles.filterRow}>
          <CategoryFilterBar
            categories={categories}
            transactions={allTransactions}
            getCategoryForTransaction={getCategoryForTransaction}
            selectedFilter={selectedCategoryId}
            onSelectFilter={setSelectedCategoryId}
            accountIncome={totalIncome}
            accountExpenses={totalExpenses}
            isBalanceHidden={masked}
            i18n={i18n}
            showStats={false}
          />
          <Pressable
            onPress={() => setCatManageVisible(true)}
            style={({ pressed }) => [
              styles.manageBtn,
              {
                backgroundColor: t.surface,
                borderColor: t.lineStrong,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            hitSlop={6}
          >
            <IconCog size={13} color={t.inkSoft} />
          </Pressable>
        </View>
      </View>

      {statsLoading && allTransactions.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={({ item }) => (
            <View style={styles.itemWrap}>
              <TransactionItem
                item={item}
                masked={masked}
                getCategoryForTransaction={getCategoryForTransaction}
                onPress={handleTransactionPress}
              />
            </View>
          )}
          renderSectionHeader={({ section: { title, data } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: t.bg }]}>
              <Label>{title}</Label>
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  fontSize: 10,
                  color: t.inkMuted,
                }}
              >
                {data.length}
              </Text>
            </View>
          )}
          keyExtractor={(item, i) => getStableTxId(item) + i}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  fontSize: 12,
                  color: t.inkMuted,
                }}
              >
                No transactions found.
              </Text>
            </View>
          }
          ListFooterComponent={
            filteredTransactions.length > 0 ? (
              <Text style={[styles.footer, { color: t.inkMuted }]}>
                {filteredTransactions.length}{" "}
                {filteredTransactions.length === 1
                  ? "transaction"
                  : "transactions"}
              </Text>
            ) : null
          }
        />
      )}

      {/* Floating add button */}
      {targetAccount ? (
        <Pressable
          onPress={() => setAddVisible(true)}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: t.accent,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <IconPlus size={20} color={t.bg} />
        </Pressable>
      ) : null}

      {/* ── Modals ── */}
      <DateFilterModal
        visible={isDateModalVisible}
        title={i18n.statistics_title}
        tempFrom={tempFrom}
        tempTo={tempTo}
        onTempFromChange={setTempFrom}
        onTempToChange={setTempTo}
        onApply={(from, to) => {
          applyDateFilter(from, to);
          setDateModalVisible(false);
        }}
        onCancel={() => setDateModalVisible(false)}
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
        i18n={i18n}
      />

      <TransactionDetailModal
        visible={isDetailVisible}
        transaction={detailTx}
        categories={categories}
        categoryColors={CATEGORY_COLORS}
        getCategoryForTransaction={getCategoryForTransaction}
        onAssignCategory={assignCategory}
        onCreateCategory={addCategory}
        onClose={() => setDetailVisible(false)}
        onEdit={openEditModal}
        type={detailTx?.transaction_id ? "connected" : "manual"}
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
      />

      <CategoryManageModal
        visible={isCatManageVisible}
        categories={categories}
        categoryColors={CATEGORY_COLORS}
        onAdd={async (catName, color) => {
          await addCategory(catName, color);
        }}
        onUpdate={async (catId, updates) => updateCategory(catId, updates)}
        onDelete={async (catId) => deleteCategory(catId)}
        onClose={() => setCatManageVisible(false)}
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
      />

      <AddTransactionModal
        visible={isAddVisible}
        onAdd={(title, amount) => {
          if (targetAccount) {
            addManualTransaction(targetAccount.id, title, amount);
          }
          setAddVisible(false);
        }}
        onClose={() => setAddVisible(false)}
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
        i18n={i18n}
      />

      <EditTransactionModal
        visible={isEditVisible}
        transaction={editingTx}
        onUpdate={(tx, title, amount) => {
          if (targetAccount) {
            updateManualTransaction(targetAccount.id, tx, title, amount);
          }
          setEditVisible(false);
        }}
        onDelete={(tx) => {
          if (targetAccount) {
            deleteManualTransaction(targetAccount.id, tx);
          }
          setEditVisible(false);
        }}
        onClose={() => setEditVisible(false)}
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
        i18n={i18n}
      />
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  manageBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: MOBILE_TAB_SPACE,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 4,
  },
  itemWrap: {
    marginBottom: 8,
  },
  emptyState: {
    marginTop: 80,
    alignItems: "center",
  },
  footer: {
    textAlign: "center",
    fontFamily: FMFonts.sans,
    fontSize: 11,
    paddingVertical: 20,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: MOBILE_TAB_SPACE + 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
});
