import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Transaction } from "../../../../services/enableBanking";
import { useDateFilter } from "../../../../shared/context/DateFilterContext";
import { useSettings } from "../../../../shared/context/SettingsContext";
import { useThemeColor } from "../../../../shared/hooks/use-theme-color";
import { useImportQueue } from "../../../import/context/ImportQueueContext";
import { StatementsModal } from "../../../import/components/StatementsModal";
import { CsvMappingModal } from "../../../import/components/CsvMappingModal";
import {
  CATEGORY_COLORS,
  useCategories,
} from "../../../transactions/context/CategoriesContext";
import { useAccounts } from "../../context/AccountsContext";

// ── Hooks ──
import { useAccountTransactions } from "../../../transactions/hooks/useAccountTransactions";
import { useAutoCategorize } from "../../../transactions/hooks/useAutoCategorize";
import { useAccountStats } from "../../hooks/useAccountStats";

// ── Components ──
import { CategoryFilterBar } from "../../../../shared/components/CategoryFilterBar";
import { DateFilterModal } from "../../../../shared/components/DateFilterModal";
import { TransactionStatsSummary } from "../../../../shared/components/TransactionStatsSummary";
import { AddTransactionModal } from "../../../transactions/components/AddTransactionModal";
import { CategoryManageModal } from "../../../transactions/components/CategoryManageModal";
import { EditTransactionModal } from "../../../transactions/components/EditTransactionModal";
import { TransactionDetailModal } from "../../../transactions/components/TransactionDetailModal";
import { TransactionItem } from "../../../transactions/components/TransactionItem";
import { AccountCategoryModal } from "../AccountCategoryModal";

// ── Utils ──
import { getStableTxId } from "../../../transactions/utils/transactions";

export function AccountDetailScreen() {
  const { id, name, type } = useLocalSearchParams<{
    id: string;
    name: string;
    type: "connected" | "manual";
  }>();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const surfaceColor = useThemeColor({}, "surface");
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
    transactionCategoryMap,
  } = useCategories();

  const {
    filterDateFrom,
    filterDateTo,
    applyDateFilter,
    applyPreset,
    selectedCategoryId,
    setSelectedCategoryId,
  } = useDateFilter();

  const {
    transactions,
    loading,
    setLoading,
    refreshing,
    error,
    category,
    loadTransactions,
    handleAddTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleImportBankStatement,
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

  const { accountIncome, accountExpenses } = useAccountStats({
    transactions,
    getCategoryForTransaction,
  });

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
    onFinish: () => setAICatModalVisible(false),
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
  const [isAICatModalVisible, setAICatModalVisible] = useState(false);
  const [isStatementsModalVisible, setStatementsModalVisible] = useState(false);
  const [csvQueue, setCsvQueue] = useState<
    { fileName: string; content: string }[]
  >([]);

  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");

  const categoriesScrollRef = useRef<ScrollView>(null);

  const filteredTransactions = selectedCategoryId
    ? transactions.filter((tx) => {
        const txId = getStableTxId(tx);
        const cat = getCategoryForTransaction(txId);
        return cat?.id === selectedCategoryId;
      })
    : transactions;

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach((tx) => {
      const dateStr = tx.booking_date || tx.value_date || "";
      const date = dateStr
        ? new Date(dateStr).toLocaleDateString()
        : "Unknown Date";
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
    });
    return Object.keys(groups).map((date) => ({
      title: date,
      data: groups[date],
    }));
  }, [filteredTransactions]);

  const currentAccount = accounts.find((a) => a.id === id);
  const currentBalance = currentAccount?.balance || 0;
  const currentCurrency = currentAccount?.currency || "EUR";
  const currentBankName = currentAccount?.bankName || name || "Account";
  const currentIban = currentAccount?.iban;

  const openDateModal = () => {
    setTempFrom(filterDateFrom);
    setTempTo(filterDateTo);
    setFilterModalVisible(true);
  };

  const handleApplyDateFilter = (from: string, to: string) => {
    applyDateFilter(from, to);
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

  // ── Import Queue ──
  const { addFiles } = useImportQueue();

  const handleImportPress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "application/pdf"],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) return;

      const pdfAssets = result.assets.filter(
        (a) =>
          a.uri.toLowerCase().endsWith(".pdf") ||
          a.mimeType === "application/pdf",
      );
      const csvAssets = result.assets.filter(
        (a) =>
          !a.uri.toLowerCase().endsWith(".pdf") &&
          a.mimeType !== "application/pdf",
      );

      if (pdfAssets.length > 0) {
        addFiles(
          pdfAssets.map((asset) => ({
            uri: asset.uri,
            name: asset.name,
            mimeType: asset.mimeType || "application/pdf",
            file: asset.file,
            accountId: id,
            accountType: type as "connected" | "manual",
            currency: currentCurrency,
          })),
        );
      }

      const csvItems: { fileName: string; content: string }[] = [];
      for (const csvAsset of csvAssets) {
        try {
          let fileContent = "";
          if (Platform.OS === "web") {
            const file = csvAsset.file;
            if (!file) throw new Error("File object not found on web");
            fileContent = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsText(file);
            });
          } else {
            fileContent = await FileSystem.readAsStringAsync(csvAsset.uri);
          }
          if (fileContent.trim()) {
            csvItems.push({ fileName: csvAsset.name, content: fileContent });
          } else {
            Alert.alert("Empty file", `${csvAsset.name} has no content.`);
          }
        } catch (csvErr) {
          console.error(csvErr);
          Alert.alert("Error", `Failed to read CSV: ${csvAsset.name}`);
        }
      }
      if (csvItems.length > 0) setCsvQueue((prev) => [...prev, ...csvItems]);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to open file picker.");
    }
  };

  // ── Loading State ──
  if (loading && transactions.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={tintColor} />
        <Text
          style={{
            color: textColor,
            opacity: 0.5,
            marginTop: 12,
            fontSize: 14,
          }}
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
        title={i18n.filter_by_date}
        tempFrom={tempFrom}
        tempTo={tempTo}
        onTempFromChange={setTempFrom}
        onTempToChange={setTempTo}
        onApply={handleApplyDateFilter}
        onCancel={() => setFilterModalVisible(false)}
        backgroundColor={backgroundColor}
        textColor={textColor}
        tintColor={tintColor}
        i18n={i18n}
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
        onAdd={async (catName, color) => {
          await addCategory(catName, color);
        }}
        onUpdate={async (catId, updates) => updateCategoryCtx(catId, updates)}
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

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { borderBottomColor: textColor + "10" }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text
              style={[styles.pageTitle, { color: textColor }]}
              numberOfLines={1}
            >
              {currentBankName}
            </Text>
            {currentIban && (
              <Text
                style={{
                  color: textColor,
                  opacity: 0.4,
                  fontSize: 12,
                  fontFamily: "monospace",
                }}
              >
                {currentIban}
              </Text>
            )}
          </View>
        </View>

        <TransactionStatsSummary
          income={accountIncome}
          expenses={accountExpenses}
          isBalanceHidden={isBalanceHidden}
          textColor={textColor}
          i18n={i18n}
        />

        <View style={styles.topBarActions}>
          <TouchableOpacity
            onPress={() => loadTransactions()}
            style={[styles.topBtn, { backgroundColor: textColor + "10" }]}
          >
            <Ionicons name="reload" size={16} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStatementsModalVisible(true)}
            style={[styles.topBtn, { backgroundColor: textColor + "10" }]}
          >
            <Ionicons
              name="folder-open-outline"
              size={16}
              color={textColor}
            />
            <Text style={{ color: textColor, fontSize: 13, fontWeight: "600" }}>
              {i18n.stmt_title || "Statements"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCatManageModalVisible(true)}
            style={[styles.topBtn, { backgroundColor: textColor + "10" }]}
          >
            <Ionicons name="pricetags-outline" size={16} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAutoCategorizePress}
            style={[styles.topBtn, { backgroundColor: tintColor + "15" }]}
          >
            <Ionicons name="sparkles" size={16} color={tintColor} />
            <Text style={{ color: tintColor, fontSize: 13, fontWeight: "600" }}>
              {i18n.auto_categorize}
            </Text>
          </TouchableOpacity>
          {type === "manual" && (
            <>
              <TouchableOpacity
                onPress={() => setTxModalVisible(true)}
                style={[styles.topBtn, { backgroundColor: tintColor }]}
              >
                <Ionicons name="add" size={16} color={backgroundColor} />
                <Text
                  style={{
                    color: backgroundColor,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Add
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  handleDeleteAccount(deleteManualAccount, () => router.back())
                }
                style={[styles.topBtn, { backgroundColor: "#FF6B6B20" }]}
              >
                <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ── Two-Column Layout ── */}
      <View style={styles.twoColumn}>
        {/* Left: Account Summary */}
        <View
          style={[styles.leftPanel, { borderRightColor: textColor + "10" }]}
        >
          <View style={[styles.balanceCard, { backgroundColor: surfaceColor }]}>
            <Text
              style={[styles.balanceLabel, { color: textColor, opacity: 0.6 }]}
            >
              {i18n.balance_label}
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
              style={[
                styles.categoryBadge,
                { backgroundColor: tintColor + "15" },
              ]}
            >
              <Text
                style={{ color: tintColor, fontSize: 12, fontWeight: "700" }}
              >
                {category}
              </Text>
              <Ionicons name="chevron-down" size={12} color={tintColor} />
            </TouchableOpacity>
          </View>

          {/* Date presets */}
          <Text style={[styles.sectionLabel, { color: textColor }]}>
            {i18n.date_range_title || "DATE RANGE"}
          </Text>
          <View style={styles.datePresets}>
            <TouchableOpacity
              onPress={openDateModal}
              style={[styles.presetBtn, { backgroundColor: tintColor + "15" }]}
            >
              <Ionicons name="calendar-outline" size={14} color={tintColor} />
              <Text
                style={{ color: tintColor, fontSize: 13, fontWeight: "600" }}
              >
                {i18n.date_range || "Date range"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Category filter */}
          <Text
            style={[styles.sectionLabel, { color: textColor, marginTop: 24 }]}
          >
            {i18n.categories.toUpperCase()}
          </Text>
          <CategoryFilterBar
            categories={categories}
            transactions={transactions}
            getCategoryForTransaction={getCategoryForTransaction}
            selectedFilter={selectedCategoryId}
            onSelectFilter={setSelectedCategoryId}
            accountIncome={accountIncome}
            accountExpenses={accountExpenses}
            isBalanceHidden={isBalanceHidden}
            textColor={textColor}
            tintColor={tintColor}
            i18n={i18n}
            showStats={false}
          />
        </View>

        {/* Right: Transaction List */}
        <SectionList
          style={styles.rightPanel}
          contentContainerStyle={styles.rightContent}
          sections={groupedTransactions}
          renderItem={({ item }) => (
            <TransactionItem
              item={item}
              textColor={textColor}
              getCategoryForTransaction={getCategoryForTransaction}
              onPress={handleTransactionPress}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor }]}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                {title}
              </Text>
            </View>
          )}
          keyExtractor={(item) =>
            item.transaction_id ||
            `gen_${item.booking_date || ""}_${item.transaction_amount?.amount ?? ""}_${item.creditor?.name || item.debtor?.name || ""}`
          }
          stickySectionHeadersEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTransactions()}
              tintColor={tintColor}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>📋</Text>
              <Text
                style={[styles.emptyText, { color: textColor, opacity: 0.5 }]}
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
                paddingVertical: 32,
              }}
            >
              {filteredTransactions.length} transaction
              {filteredTransactions.length !== 1 ? "s" : ""}
            </Text>
          }
        />
      </View>

      {/* ── AI Categorization Modal ── */}
      <Modal visible={isAICatModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.aiModal, { backgroundColor }]}>
            {isCategorizing ? (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <ActivityIndicator size="large" color={tintColor} />
                <Text
                  style={{
                    color: textColor,
                    fontSize: 16,
                    fontWeight: "600",
                    marginTop: 24,
                    textAlign: "center",
                  }}
                >
                  {i18n?.ai_processing ||
                    "Categorizing...\nThis might take a few moments."}
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 24,
                    color: textColor,
                    fontWeight: "800",
                    marginBottom: 12,
                  }}
                >
                  {i18n?.ai_categorization_title || "Categorization"}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: textColor,
                    opacity: 0.7,
                    marginBottom: 32,
                  }}
                >
                  {i18n?.ai_categorization_desc ||
                    "Which transactions would you like to process?"}
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: tintColor,
                    paddingVertical: 16,
                    borderRadius: 999,
                    marginBottom: 16,
                  }}
                  onPress={() => autoCategorizeTransactions(false)}
                >
                  <Text
                    style={{
                      color: backgroundColor,
                      fontWeight: "600",
                      textAlign: "center",
                      fontSize: 16,
                    }}
                  >
                    {i18n?.uncategorized_only || "Uncategorized Only"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#F43F5E",
                    paddingVertical: 16,
                    borderRadius: 999,
                    marginBottom: 24,
                  }}
                  onPress={() => autoCategorizeTransactions(true)}
                >
                  <Text
                    style={{
                      color: "#FFF",
                      fontWeight: "600",
                      textAlign: "center",
                      fontSize: 16,
                    }}
                  >
                    {i18n?.recategorize_all || "Recategorize All"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ paddingVertical: 16, borderRadius: 999 }}
                  onPress={() => setAICatModalVisible(false)}
                >
                  <Text
                    style={{
                      color: textColor,
                      opacity: 0.6,
                      fontWeight: "600",
                      textAlign: "center",
                      fontSize: 16,
                    }}
                  >
                    {i18n?.cancel || "Cancel"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <StatementsModal
        visible={isStatementsModalVisible}
        accountId={id}
        accountType={type as "connected" | "manual"}
        onClose={() => setStatementsModalVisible(false)}
        onImport={handleImportPress}
      />

      {csvQueue.length > 0 && (
        <CsvMappingModal
          visible
          fileName={csvQueue[0].fileName}
          fileContent={csvQueue[0].content}
          currency={currentCurrency}
          onCancel={() => setCsvQueue((q) => q.slice(1))}
          onConfirm={async (transactions) => {
            const fileName = csvQueue[0].fileName;
            setCsvQueue((q) => q.slice(1));
            if (transactions.length > 0) {
              await handleImportBankStatement(transactions);
              Alert.alert(
                "Imported",
                `Added ${transactions.length} transaction${transactions.length === 1 ? "" : "s"} from ${fileName}.`,
              );
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
  topBarActions: { flexDirection: "row", gap: 10 },
  backBtn: { padding: 8 },
  pageTitle: { fontSize: 22, fontWeight: "800" },
  topBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  twoColumn: { flex: 1, flexDirection: "row" },
  leftPanel: {
    width: 320,
    padding: 24,
    borderRightWidth: 1,
  },
  rightPanel: { flex: 1 },
  rightContent: { padding: 24, paddingBottom: 64 },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 11,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "500",
  },
  balanceAmount: { fontSize: 32, fontWeight: "800", marginBottom: 12 },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    opacity: 0.5,
    marginBottom: 10,
  },
  datePresets: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  sectionHeader: { paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyState: {
    marginTop: 64,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: { fontSize: 18, fontWeight: "600" },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 999,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  aiModal: {
    padding: 32,
    borderRadius: 24,
    width: 420,
    maxWidth: "90%",
  },
});
