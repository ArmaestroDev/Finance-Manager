import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FMFonts } from "@/src/constants/theme";
import {
  Balance,
  Button,
  IconAI,
  IconBack,
  IconChevD,
  IconDoc,
  IconMore,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconUpload,
  Label,
  Money,
  Pill,
  formatEUR,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import { CategoryFilterBar } from "@/src/shared/components/CategoryFilterBar";
import { DateFilterModal } from "@/src/shared/components/DateFilterModal";
import { useDateFilter } from "@/src/shared/context/DateFilterContext";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { useImportQueue } from "@/src/features/import/context/ImportQueueContext";
import { StatementsModal } from "@/src/features/import/components/StatementsModal";
import { CsvMappingModal } from "@/src/features/import/components/CsvMappingModal";
import {
  CATEGORY_COLORS,
  useCategories,
} from "@/src/features/transactions/context/CategoriesContext";
import { AddTransactionModal } from "@/src/features/transactions/components/AddTransactionModal";
import { CategoryManageModal } from "@/src/features/transactions/components/CategoryManageModal";
import { EditTransactionModal } from "@/src/features/transactions/components/EditTransactionModal";
import { TransactionDetailModal } from "@/src/features/transactions/components/TransactionDetailModal";
import { useAccountTransactions } from "@/src/features/transactions/hooks/useAccountTransactions";
import { useAutoCategorize } from "@/src/features/transactions/hooks/useAutoCategorize";
import { getStableTxId, getTransactionAmount, pickTransactionTitle } from "@/src/features/transactions/utils/transactions";
import type { Transaction } from "@/src/services/enableBanking";
import { useAccounts } from "../../context/AccountsContext";
import { useAccountStats } from "../../hooks/useAccountStats";
import { AccountCategoryModal } from "../AccountCategoryModal";

export function AccountDetailScreen() {
  const t = useFMTheme();
  const insets = useSafeAreaInsets();
  const { id, name, type } = useLocalSearchParams<{
    id: string;
    name: string;
    type: "connected" | "manual";
  }>();
  const router = useRouter();
  const { isBalanceHidden, geminiApiKey, i18n, language } = useSettings();
  const { deleteManualAccount, refreshAccounts, updateAccount, accounts } = useAccounts();
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
  const {
    filterDateFrom,
    filterDateTo,
    applyDateFilter,
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
  const [csvQueue, setCsvQueue] = useState<{ fileName: string; content: string }[]>([]);

  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");

  const filteredTransactions = selectedCategoryId
    ? transactions.filter((tx) => {
        const txId = getStableTxId(tx);
        const cat = getCategoryForTransaction(txId);
        return cat?.id === selectedCategoryId;
      })
    : transactions;

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach((tx) => {
      const dateStr = tx.booking_date || tx.value_date || "";
      const date = dateStr || "Unknown";
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
    });
    return Object.keys(groups)
      .sort()
      .reverse()
      .map((date) => ({ title: date, data: groups[date] }));
  }, [filteredTransactions]);

  const currentAccount = accounts.find((a) => a.id === id);
  const currentBalance = currentAccount?.balance ?? 0;
  const currentCurrency = currentAccount?.currency || "EUR";
  const currentBankName = currentAccount?.bankName || (typeof name === "string" ? name : "Account");
  const currentIban = currentAccount?.iban;
  const accountName = currentAccount?.name || (typeof name === "string" ? name : "Account");
  const masked = isBalanceHidden;
  const heroParts = splitForHero(currentBalance, masked);
  const net = accountIncome - accountExpenses;

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
        (a) => a.uri.toLowerCase().endsWith(".pdf") || a.mimeType === "application/pdf",
      );
      const csvAssets = result.assets.filter(
        (a) => !a.uri.toLowerCase().endsWith(".pdf") && a.mimeType !== "application/pdf",
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

  if (loading && transactions.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={t.accent} />
        <Text style={{ fontFamily: FMFonts.sans, fontSize: 13, color: t.inkSoft, marginTop: 12 }}>
          Loading transactions…
        </Text>
      </View>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 16, color: t.ink, textAlign: "center" }}>
          {error}
        </Text>
        <View style={{ marginTop: 16 }}>
          <Button variant="primary" onPress={() => loadTransactions()}>Retry</Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingTop: insets.top + 12 }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Back row */}
      <View style={styles.backRow}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
        >
          <IconBack size={15} color={t.inkSoft} />
        </Pressable>
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 12, color: t.inkSoft, marginLeft: 4 }}>
          Accounts
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => loadTransactions()}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
        >
          <IconRefresh size={15} color={t.inkSoft} />
        </Pressable>
        {type === "manual" ? (
          <Pressable
            onPress={() => handleDeleteAccount(deleteManualAccount, () => router.back())}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <IconTrash size={15} color={t.neg} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => setCatManageModalVisible(true)}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
        >
          <IconMore size={15} color={t.inkSoft} />
        </Pressable>
      </View>

      <SectionList
        sections={groupedTransactions}
        keyExtractor={(item, i) => getStableTxId(item) + i}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadTransactions()} tintColor={t.accent} />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 10 }}>
            {/* Title + pills */}
            <Text
              style={{
                fontFamily: FMFonts.display,
                fontSize: 28,
                color: t.ink,
                lineHeight: 30,
                letterSpacing: -0.4,
                marginBottom: 8,
              }}
              numberOfLines={1}
            >
              {accountName}
            </Text>
            <View style={styles.pillRow}>
              <Pill onPress={() => setCatModalVisible(true)}>{currentBankName}</Pill>
              <Pill onPress={() => setCatModalVisible(true)}>{category}</Pill>
              {currentIban ? (
                <Text
                  style={{
                    fontFamily: FMFonts.sans,
                    fontSize: 10,
                    color: t.inkMuted,
                    fontVariant: ["tabular-nums"],
                  }}
                  numberOfLines={1}
                >
                  ·· {currentIban.slice(-9)}
                </Text>
              ) : null}
            </View>

            {/* Balance card with stats */}
            <View style={[styles.balanceCard, { backgroundColor: t.surface, borderColor: t.line }]}>
              <Label>Current balance</Label>
              <View style={styles.balanceHero}>
                <Text
                  style={{
                    fontFamily: FMFonts.display,
                    fontSize: 30,
                    color: t.ink,
                    lineHeight: 32,
                    letterSpacing: -0.4,
                  }}
                >
                  {heroParts.sign}
                  {heroParts.integer}
                  <Text style={{ color: t.inkMuted }}>{heroParts.fraction}</Text>
                </Text>
                <Text style={{ fontFamily: FMFonts.display, fontSize: 18, color: t.inkSoft, marginLeft: 4 }}>
                  {currencySymbol(currentCurrency)}
                </Text>
              </View>
              <View style={styles.statsRow}>
                <StatCell label={i18n.income_label} value={accountIncome} masked={masked} />
                <StatCell label={i18n.expenses_label} value={-accountExpenses} masked={masked} />
                <StatCell label="Net" value={net} masked={masked} total />
              </View>
            </View>

            {/* Action chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.actionsRow}
            >
              {type === "manual" ? (
                <ActionChip icon={<IconPlus size={11} />} label="Add" onPress={() => setTxModalVisible(true)} />
              ) : null}
              <ActionChip icon={<IconUpload size={11} />} label="Import" onPress={handleImportPress} />
              <ActionChip
                icon={<IconAI size={11} />}
                label={i18n.auto_categorize}
                onPress={() => setAICatModalVisible(true)}
              />
              <ActionChip
                icon={<IconDoc size={11} />}
                label={i18n.stmt_title ?? "Statements"}
                onPress={() => setStatementsModalVisible(true)}
              />
              <ActionChip label={dateRangeLabel(filterDateFrom, filterDateTo)} onPress={openDateModal} />
            </ScrollView>

            {/* Category filter strip — keep existing component */}
            <View style={{ marginTop: 8 }}>
              <CategoryFilterBar
                categories={categories}
                transactions={transactions}
                getCategoryForTransaction={getCategoryForTransaction}
                selectedFilter={selectedCategoryId}
                onSelectFilter={setSelectedCategoryId}
                accountIncome={accountIncome}
                accountExpenses={accountExpenses}
                isBalanceHidden={isBalanceHidden}
                textColor={t.ink}
                tintColor={t.accent}
                i18n={i18n}
                showStats={false}
              />
            </View>
          </View>
        }
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: t.bg }]}>
            <Text style={[styles.sectionTitle, { color: t.inkMuted }]}>{formatGroupHeader(title)}</Text>
            <Text style={[styles.sectionSubtotal, { color: t.inkSoft }]}>
              {formatEUR(data.reduce((s, x) => s + getTransactionAmount(x), 0), { showSign: true, masked })}
            </Text>
          </View>
        )}
        renderItem={({ item, section, index }) => {
          const isFirst = index === 0;
          const isLast = index === section.data.length - 1;
          const txId = getStableTxId(item);
          const cat = getCategoryForTransaction(txId);
          const amount = getTransactionAmount(item);
          const title = pickTransactionTitle(item);
          return (
            <Pressable
              onPress={() => handleTransactionPress(item)}
              style={({ pressed }) => [
                styles.txRow,
                {
                  backgroundColor: t.surface,
                  borderColor: t.line,
                  borderTopLeftRadius: isFirst ? 10 : 0,
                  borderTopRightRadius: isFirst ? 10 : 0,
                  borderBottomLeftRadius: isLast ? 10 : 0,
                  borderBottomRightRadius: isLast ? 10 : 0,
                  borderTopWidth: isFirst ? 1 : 0,
                  borderBottomWidth: 1,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: cat ? cat.color : "transparent",
                  borderWidth: cat ? 0 : 1.5,
                  borderStyle: cat ? "solid" : "dashed",
                  borderColor: t.inkMuted,
                }}
              />
              <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
                <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 12, color: t.ink }} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={{ fontFamily: FMFonts.sans, fontSize: 10, color: t.inkMuted, marginTop: 1 }}>
                  {cat ? (
                    cat.name
                  ) : (
                    <Text style={{ color: t.warn, fontFamily: FMFonts.sansSemibold }}>
                      {i18n.uncategorized}
                    </Text>
                  )}
                </Text>
              </View>
              <Money value={amount} masked={masked} size={12} />
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 14, color: t.ink }}>
              No transactions
            </Text>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 11, color: t.inkSoft, marginTop: 4 }}>
              {filterDateFrom} – {filterDateTo}
            </Text>
          </View>
        }
        ListFooterComponent={
          <Text style={{ textAlign: "center", fontFamily: FMFonts.sans, color: t.inkMuted, fontSize: 11, paddingVertical: 24 }}>
            {filteredTransactions.length} transaction
            {filteredTransactions.length === 1 ? "" : "s"}
          </Text>
        }
        stickySectionHeadersEnabled
      />

      {/* ── Modals ── */}
      <DateFilterModal
        visible={isFilterModalVisible}
        title={i18n.filter_by_date}
        tempFrom={tempFrom}
        tempTo={tempTo}
        onTempFromChange={setTempFrom}
        onTempToChange={setTempTo}
        onApply={handleApplyDateFilter}
        onCancel={() => setFilterModalVisible(false)}
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
        i18n={i18n}
      />

      <TransactionDetailModal
        visible={isDetailModalVisible}
        transaction={detailTx}
        categories={categories}
        categoryColors={CATEGORY_COLORS}
        getCategoryForTransaction={getCategoryForTransaction}
        onAssignCategory={assignCategory}
        onCreateCategory={addCategory}
        onClose={() => setDetailModalVisible(false)}
        onEdit={type === "manual" ? openEditModal : undefined}
        type={type as "connected" | "manual"}
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
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
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
      />

      <AccountCategoryModal
        visible={isCatModalVisible}
        currentCategory={category}
        onSelect={updateCategoryValue}
        onClose={() => setCatModalVisible(false)}
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
      />

      <AddTransactionModal
        visible={isTxModalVisible}
        onAdd={(title, amount) => {
          handleAddTransaction(title, amount);
          setTxModalVisible(false);
        }}
        onClose={() => setTxModalVisible(false)}
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
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
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
        i18n={i18n}
      />

      {/* AI Categorization confirm */}
      <Modal visible={isAICatModalVisible} transparent animationType="fade">
        <View style={styles.modalScrim}>
          <View style={[styles.aiModal, { backgroundColor: t.surface, borderColor: t.lineStrong }]}>
            {isCategorizing ? (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <ActivityIndicator size="large" color={t.accent} />
                <Text style={{ fontFamily: FMFonts.sansMedium, color: t.ink, fontSize: 14, textAlign: "center", marginTop: 18 }}>
                  {i18n.ai_processing ?? "Categorizing…\nThis might take a few moments."}
                </Text>
              </View>
            ) : (
              <>
                <Text style={{ fontFamily: FMFonts.display, fontSize: 22, color: t.ink, letterSpacing: -0.3 }}>
                  {i18n.ai_categorization_title ?? "Auto-categorize"}
                </Text>
                <Text style={{ fontFamily: FMFonts.sans, fontSize: 13, color: t.inkSoft, marginTop: 8, lineHeight: 19 }}>
                  {i18n.ai_categorization_desc ??
                    "Pick which transactions to send to Gemini for categorization."}
                </Text>
                <View style={{ marginTop: 18, gap: 8 }}>
                  <Button variant="primary" full onPress={() => autoCategorizeTransactions(false)}>
                    {i18n.uncategorized_only}
                  </Button>
                  <Button variant="secondary" full onPress={() => autoCategorizeTransactions(true)}>
                    {i18n.recategorize_all}
                  </Button>
                  <Button variant="ghost" full onPress={() => setAICatModalVisible(false)}>
                    {i18n.cancel ?? "Cancel"}
                  </Button>
                </View>
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

      {csvQueue.length > 0 ? (
        <CsvMappingModal
          visible
          fileName={csvQueue[0].fileName}
          fileContent={csvQueue[0].content}
          currency={currentCurrency}
          onCancel={() => setCsvQueue((q) => q.slice(1))}
          onConfirm={async (txns) => {
            const fileName = csvQueue[0].fileName;
            setCsvQueue((q) => q.slice(1));
            if (txns.length > 0) {
              await handleImportBankStatement(txns);
              Alert.alert(
                "Imported",
                `Added ${txns.length} transaction${txns.length === 1 ? "" : "s"} from ${fileName}.`,
              );
            }
          }}
        />
      ) : null}
    </View>
  );
}

interface StatCellProps {
  label: string;
  value: number;
  masked: boolean;
  total?: boolean;
}

function StatCell({ label, value, masked, total }: StatCellProps) {
  const t = useFMTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 10, color: t.inkMuted, letterSpacing: 0.4, textTransform: "uppercase" }}>
        {label}
      </Text>
      <View style={{ marginTop: 4 }}>
        <Balance value={value} masked={masked} size={12} total={total} />
      </View>
    </View>
  );
}

interface ActionChipProps {
  icon?: React.ReactNode;
  label: string;
  onPress: () => void;
}

function ActionChip({ icon, label, onPress }: ActionChipProps) {
  const t = useFMTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionChip,
        {
          backgroundColor: t.surface,
          borderColor: t.lineStrong,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {icon ? <View style={{ marginRight: 5 }}>{icon}</View> : null}
      <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.inkSoft, letterSpacing: -0.1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function dateRangeLabel(from: string, to: string): string {
  if (!from || !to) return "All time";
  return `${from} → ${to}`;
}

function formatGroupHeader(iso: string): string {
  if (!iso || iso === "Unknown") return "Unknown date";
  try {
    const d = new Date(iso);
    const dayMonth = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
    return `${dayMonth} · ${weekday}`;
  } catch {
    return iso;
  }
}

function currencySymbol(currency: string): string {
  if (currency === "EUR") return "€";
  if (currency === "USD") return "$";
  if (currency === "GBP") return "£";
  return currency;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  backRow: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: { padding: 6 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 96,
  },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  balanceCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  balanceHero: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 4,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  sectionHeader: {
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sectionTitle: {
    fontFamily: FMFonts.sansSemibold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionSubtotal: {
    fontFamily: FMFonts.sansMedium,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  txRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  empty: {
    padding: 24,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
  },
  modalScrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  aiModal: {
    width: "85%",
    maxWidth: 400,
    padding: 22,
    borderRadius: 14,
    borderWidth: 1,
  },
});
