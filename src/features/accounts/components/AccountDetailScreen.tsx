import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAccounts } from "../context/AccountsContext";
import {
  CATEGORY_COLORS,
  useCategories,
} from "../../transactions/context/CategoriesContext";
import { useSettings } from "../../../shared/context/SettingsContext";
import { useThemeColor } from "../../../shared/hooks/use-theme-color";
import type { Transaction } from "../../../services/enableBanking";

// ── Hooks ──
import { useAccountStats } from "../hooks/useAccountStats";
import { useAccountTransactions } from "../../transactions/hooks/useAccountTransactions";
import { useAutoCategorize } from "../../transactions/hooks/useAutoCategorize";

// ── Components ──
import { AccountCategoryModal } from "./AccountCategoryModal";
import { AddTransactionModal } from "../../transactions/components/AddTransactionModal";
import { CategoryFilterBar } from "../../../shared/components/CategoryFilterBar";
import { CategoryManageModal } from "../../transactions/components/CategoryManageModal";
import { DateFilterModal } from "../../../shared/components/DateFilterModal";
import { EditTransactionModal } from "../../transactions/components/EditTransactionModal";
import { TransactionDetailModal } from "../../transactions/components/TransactionDetailModal";
import { TransactionItem } from "../../transactions/components/TransactionItem";

// ── Utils ──
import { formatAmount } from "../../../shared/utils/financeHelpers";
import { getStableTxId } from "../../transactions/utils/transactions";

export function AccountDetailScreen() {
  const { id, name, type } = useLocalSearchParams<{
    id: string;
    name: string;
    type: "connected" | "manual";
  }>();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const router = useRouter();
  const { isBalanceHidden, geminiApiKey, i18n, language } = useSettings();
  const { deleteManualAccount, refreshAccounts, updateAccount, accounts } =
    useAccounts();
  const {
    categories,
    addCategory,
    updateCategory: updateCategoryCtx,
    deleteCategory: deleteCategoryCtx,
    assignCategory,
    bulkAssignCategories,
    bulkAddCategories,
    getCategoryForTransaction,
  } = useCategories();

  // ── Data hook ──
  const {
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
  } = useAccountTransactions({
    id,
    type: type as "connected" | "manual",
    accounts,
    updateAccount,
    refreshAccounts,
    i18n,
  });

  // ── Stats hook ──
  const { accountIncome, accountExpenses } = useAccountStats({
    transactions,
    getCategoryForTransaction,
  });

  // ── Auto-categorize hook ──
  const { autoCategorizeTransactions, isCategorizing } = useAutoCategorize({
    transactions,
    categories,
    geminiApiKey,
    language,
    getCategoryForTransaction,
    assignCategory,
    bulkAssignCategories,
    bulkAddCategories,
    categoryColors: CATEGORY_COLORS,
    setLoading,
    router,
    i18n,
  });

  // ── UI-only modal state ──
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isTxModalVisible, setTxModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isCatModalVisible, setCatModalVisible] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [isCatManageModalVisible, setCatManageModalVisible] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | null
  >(null);
  const [isAICatModalVisible, setAICatModalVisible] = useState(false);

  // ── Date filter modal temp state ──
  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");

  const categoriesScrollRef = useRef<ScrollView>(null);

  // ── Filtered transactions for display ──
  const filteredTransactions = selectedCategoryFilter
    ? transactions.filter((tx) => {
        const txId = getStableTxId(tx);
        const cat = getCategoryForTransaction(txId);
        return cat?.id === selectedCategoryFilter;
      })
    : transactions;

  // ── Current account details ──
  const currentAccount = accounts.find((a) => a.id === id);
  const currentBalance = currentAccount?.balance || 0;
  const currentCurrency = currentAccount?.currency || "EUR";
  const currentBankName = currentAccount?.bankName || name || "Account";
  const currentIban = currentAccount?.iban;

  // ── Event handlers ──

  const openDateModal = () => {
    setTempFrom(filterDateFrom);
    setTempTo(filterDateTo);
    setFilterModalVisible(true);
  };

  const handleApplyDateFilter = () => {
    setFilterDateFrom(tempFrom);
    setFilterDateTo(tempTo);
    setFilterModalVisible(false);
  };

  const handleTransactionPress = (tx: Transaction) => {
    setDetailTx(tx);
    setDetailModalVisible(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setEditModalVisible(true);
  };

  const handleAutoCategorizePress = () => {
    setAICatModalVisible(true);
  };

  // ── Loading State ──
  if (loading && transactions.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={tintColor} />
        <Text
          style={{ color: textColor, opacity: 0.5, marginTop: 12, fontSize: 14 }}
        >
          Loading transactions...
        </Text>
      </View>
    );
  }

  // ── Error State ──
  if (error && transactions.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ fontSize: 48 }}>⚠️</Text>
        <Text
          style={{
            color: textColor,
            fontSize: 16,
            marginTop: 12,
            textAlign: "center",
          }}
        >
          {error}
        </Text>
        <TouchableOpacity
          onPress={() => loadTransactions()}
          style={[styles.retryButton, { backgroundColor: tintColor }]}
        >
          <Text style={{ color: backgroundColor, fontWeight: "600" }}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── All Modals ── */}
      <DateFilterModal
        visible={isFilterModalVisible}
        title="Filter by Date"
        tempFrom={tempFrom}
        tempTo={tempTo}
        onTempFromChange={setTempFrom}
        onTempToChange={setTempTo}
        onApply={handleApplyDateFilter}
        onCancel={() => setFilterModalVisible(false)}
        backgroundColor={backgroundColor}
        textColor={textColor}
        tintColor={tintColor}
      />

      <TransactionDetailModal
        visible={isDetailModalVisible}
        transaction={detailTx}
        categories={categories}
        getCategoryForTransaction={getCategoryForTransaction}
        onAssignCategory={assignCategory}
        onClose={() => setDetailModalVisible(false)}
        onEdit={type === "manual" ? openEditModal : undefined}
        type={type as "connected" | "manual"}
        backgroundColor={backgroundColor}
        textColor={textColor}
        tintColor={tintColor}
      />

      <CategoryManageModal
        visible={isCatManageModalVisible}
        categories={categories}
        categoryColors={CATEGORY_COLORS}
        onAdd={async (catName, color) => { await addCategory(catName, color); }}
        onUpdate={async (catId, updates) =>
          updateCategoryCtx(catId, updates)
        }
        onDelete={async (catId) => deleteCategoryCtx(catId)}
        onClose={() => setCatManageModalVisible(false)}
        backgroundColor={backgroundColor}
        textColor={textColor}
        tintColor={tintColor}
      />

      <AccountCategoryModal
        visible={isCatModalVisible}
        currentCategory={category}
        onSelect={updateCategoryValue}
        onClose={() => setCatModalVisible(false)}
        backgroundColor={backgroundColor}
        textColor={textColor}
        tintColor={tintColor}
      />

      <AddTransactionModal
        visible={isTxModalVisible}
        onAdd={(title, amount) => {
          handleAddTransaction(title, amount);
          setTxModalVisible(false);
        }}
        onClose={() => setTxModalVisible(false)}
        backgroundColor={backgroundColor}
        textColor={textColor}
        tintColor={tintColor}
        i18n={i18n}
      />

      <EditTransactionModal
        visible={isEditModalVisible}
        transaction={editingTx}
        onUpdate={(tx, title, amount) => {
          handleUpdateTransaction(tx, title, amount);
          setEditModalVisible(false);
        }}
        onDelete={(tx) => {
          handleDeleteTransaction(tx);
          setEditModalVisible(false);
        }}
        onClose={() => setEditModalVisible(false)}
        backgroundColor={backgroundColor}
        textColor={textColor}
        tintColor={tintColor}
        i18n={i18n}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.headerTitle, { color: textColor }]}
            numberOfLines={1}
          >
            {currentBankName}
          </Text>
          {currentIban && (
            <Text
              style={[styles.headerIban, { color: textColor, opacity: 0.5 }]}
            >
              {currentIban}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setCatManageModalVisible(true)}
            style={styles.headerBtn}
          >
            <Ionicons name="pricetags-outline" size={20} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAutoCategorizePress}
            style={styles.headerBtn}
          >
            <Ionicons name="sparkles" size={20} color={tintColor} />
          </TouchableOpacity>
          {type === "manual" && (
            <TouchableOpacity
              onPress={() =>
                handleDeleteAccount(deleteManualAccount, () => router.back())
              }
              style={styles.headerBtn}
            >
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Balance Card ── */}
      <View
        style={[
          styles.balanceCard,
          { backgroundColor: tintColor + "12" },
        ]}
      >
        <Text style={[styles.balanceLabel, { color: textColor, opacity: 0.6 }]}>
          Balance
        </Text>
        <Text style={[styles.balanceAmount, { color: textColor }]}>
          {isBalanceHidden
            ? "*****"
            : new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: currentCurrency,
              }).format(currentBalance)}
        </Text>
        <TouchableOpacity
          onPress={() => setCatModalVisible(true)}
          style={[styles.categoryBadge, { backgroundColor: tintColor + "20" }]}
        >
          <Text style={{ color: tintColor, fontSize: 12, fontWeight: "600" }}>
            {category}
          </Text>
          <Ionicons name="chevron-down" size={12} color={tintColor} />
        </TouchableOpacity>
      </View>

      {/* ── Date Presets ── */}
      <View style={styles.presetsRow}>
        {[
          { label: "30D", value: 30 },
          { label: "90D", value: 90 },
          { label: "YTD", value: "year" as const },
        ].map((preset) => (
          <TouchableOpacity
            key={preset.label}
            onPress={() => applyPreset(preset.value)}
            style={[styles.presetBtn, { borderColor: tintColor }]}
          >
            <Text style={{ color: tintColor, fontSize: 12, fontWeight: "600" }}>
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={openDateModal}
          style={[styles.presetBtn, { borderColor: tintColor }]}
        >
          <Ionicons name="calendar-outline" size={14} color={tintColor} />
          <Text style={{ color: tintColor, fontSize: 12, fontWeight: "600" }}>
            Custom
          </Text>
        </TouchableOpacity>
        {type === "manual" && (
          <TouchableOpacity
            onPress={() => setTxModalVisible(true)}
            style={[styles.presetBtn, { backgroundColor: tintColor }]}
          >
            <Ionicons name="add" size={16} color={backgroundColor} />
            <Text
              style={{
                color: backgroundColor,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              Add
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category Filter Bar ── */}
      <CategoryFilterBar
        categories={categories}
        transactions={transactions}
        getCategoryForTransaction={getCategoryForTransaction}
        selectedFilter={selectedCategoryFilter}
        onSelectFilter={setSelectedCategoryFilter}
        accountIncome={accountIncome}
        accountExpenses={accountExpenses}
        isBalanceHidden={isBalanceHidden}
        textColor={textColor}
        tintColor={tintColor}
        i18n={i18n}
      />

      {/* ── Transaction List ── */}
      <FlatList
        data={filteredTransactions}
        renderItem={({ item }) => (
          <TransactionItem
            item={item}
            textColor={textColor}
            getCategoryForTransaction={getCategoryForTransaction}
            onPress={handleTransactionPress}
          />
        )}
        keyExtractor={(item) =>
          item.transaction_id ||
          `gen_${item.booking_date || ""}_${item.transaction_amount.amount}_${item.creditor?.name || item.debtor?.name || ""}`
        }
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTransactions(false)}
            tintColor={tintColor}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>📋</Text>
            <Text
              style={[
                styles.emptyText,
                { color: textColor, opacity: 0.5 },
              ]}
            >
              No transactions found
            </Text>
            <Text
              style={{
                color: textColor,
                opacity: 0.4,
                fontSize: 14,
                marginTop: 4,
              }}
            >
              {filterDateFrom} – {filterDateTo}
            </Text>
          </View>
        }
        ListFooterComponent={
          <Text
            style={{
              textAlign: "center",
              color: textColor,
              opacity: 0.4,
              fontSize: 12,
              paddingVertical: 16,
            }}
          >
            {filteredTransactions.length} transaction
            {filteredTransactions.length !== 1 ? "s" : ""}
          </Text>
        }
      />

      {/* ── AI Processing Overlay ── */}
      {isCategorizing && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9999, justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color={tintColor} />
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600", marginTop: 16 }}>
            {i18n?.ai_processing || "AI is assigning magic..."}
          </Text>
        </View>
      )}

      {/* ── AI Categorization Modal ── */}
      <Modal visible={isAICatModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor, padding: 24, borderRadius: 16, width: "80%", maxWidth: 400 }}>
            <Text style={{ fontSize: 18, color: textColor, fontWeight: "bold", marginBottom: 8 }}>
              AI Categorization
            </Text>
            <Text style={{ fontSize: 14, color: textColor, opacity: 0.8, marginBottom: 20 }}>
              Which transactions would you like the AI to process?
            </Text>
            <TouchableOpacity 
              style={{ backgroundColor: tintColor, paddingVertical: 12, borderRadius: 12, marginBottom: 12 }} 
              onPress={() => { setAICatModalVisible(false); autoCategorizeTransactions(false); }}
            >
              <Text style={{ color: backgroundColor, fontWeight: "600", textAlign: "center" }}>Uncategorized Only</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: "#FF6B6B", paddingVertical: 12, borderRadius: 12, marginBottom: 16 }} 
              onPress={() => { setAICatModalVisible(false); autoCategorizeTransactions(true); }}
            >
              <Text style={{ color: "#FFF", fontWeight: "600", textAlign: "center" }}>Recategorize All (Overwrite)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: "transparent", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: tintColor }} 
              onPress={() => setAICatModalVisible(false)}
            >
              <Text style={{ color: tintColor, fontWeight: "600", textAlign: "center" }}>{i18n?.cancel || "Cancel"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerIban: {
    fontSize: 12,
    fontFamily: "monospace",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerBtn: {
    padding: 4,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  presetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyState: {
    marginTop: 40,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});
