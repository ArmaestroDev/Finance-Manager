import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import { CategoryFilterBar } from "@/src/shared/components/CategoryFilterBar";
import { DateFilterModal } from "@/src/shared/components/DateFilterModal";
import {
  Balance,
  Button,
  Chip,
  IconAI,
  IconChevD,
  IconDoc,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUpload,
  Label,
  Money,
  Pill,
  Rule,
  formatEUR,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
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
import { CategoryPickerModal } from "@/src/features/transactions/components/CategoryPickerModal";
import { EditTransactionModal } from "@/src/features/transactions/components/EditTransactionModal";
import { useAccountTransactions } from "@/src/features/transactions/hooks/useAccountTransactions";
import { useAutoCategorize } from "@/src/features/transactions/hooks/useAutoCategorize";
import {
  getStableTxId,
  getTransactionAmount,
  pickTransactionTitle,
} from "@/src/features/transactions/utils/transactions";
import type { Transaction } from "@/src/services/enableBanking";
import { useAccounts } from "../../context/AccountsContext";
import { useAccountStats } from "../../hooks/useAccountStats";
import { AccountCategoryModal } from "../AccountCategoryModal";

export function AccountDetailScreen() {
  const t = useFMTheme();
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
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isCatManageModalVisible, setCatManageModalVisible] = useState(false);
  const [isAICatModalVisible, setAICatModalVisible] = useState(false);
  const [isStatementsModalVisible, setStatementsModalVisible] = useState(false);
  const [catPickerVisible, setCatPickerVisible] = useState(false);
  const [csvQueue, setCsvQueue] = useState<{ fileName: string; content: string }[]>([]);

  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerPaddingTop = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [20, 10],
    extrapolate: "clamp",
  });
  const headerPaddingBottom = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [18, 8],
    extrapolate: "clamp",
  });
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false },
  );

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
      .map((date) => ({ title: date, txns: groups[date] }));
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

  const selectedCat = selectedTx ? getCategoryForTransaction(getStableTxId(selectedTx)) : null;

  if (loading && transactions.length === 0) {
    return (
      <DesktopShell breadcrumb={accountName} activeId="accounts">
        <View style={[styles.center, { backgroundColor: t.bg }]}>
          <Stack.Screen options={{ headerShown: false }} />
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={{ fontFamily: FMFonts.sans, fontSize: 13, color: t.inkSoft, marginTop: 12 }}>
            Loading transactions…
          </Text>
        </View>
      </DesktopShell>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <DesktopShell breadcrumb={accountName} activeId="accounts">
        <View style={[styles.center, { backgroundColor: t.bg }]}>
          <Stack.Screen options={{ headerShown: false }} />
          <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 16, color: t.ink, textAlign: "center" }}>
            {error}
          </Text>
          <View style={{ marginTop: 16 }}>
            <Button variant="primary" onPress={() => loadTransactions()}>Retry</Button>
          </View>
        </View>
      </DesktopShell>
    );
  }

  return (
    <DesktopShell breadcrumb={accountName} activeId="accounts" onRefresh={() => loadTransactions()} scrollable={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.page, { backgroundColor: t.bg }]}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              backgroundColor: t.surface,
              borderBottomColor: t.line,
              paddingTop: headerPaddingTop,
              paddingBottom: headerPaddingBottom,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
              <Text style={{ fontFamily: FMFonts.sans, fontSize: 11, color: t.inkMuted, marginBottom: 6 }}>
                ← Accounts
              </Text>
            </Pressable>
            <View style={styles.titleRow}>
              <Text
                style={{
                  fontFamily: FMFonts.display,
                  fontSize: 30,
                  color: t.ink,
                  letterSpacing: -0.5,
                  lineHeight: 32,
                }}
                numberOfLines={1}
              >
                {accountName}
              </Text>
              <Pill onPress={() => setCatModalVisible(true)}>{currentBankName}</Pill>
              <Pill onPress={() => setCatModalVisible(true)}>{category}</Pill>
              {currentIban ? (
                <Text
                  style={{
                    fontFamily: FMFonts.sans,
                    fontSize: 11,
                    color: t.inkMuted,
                    fontVariant: ["tabular-nums"],
                  }}
                  numberOfLines={1}
                >
                  {currentIban}
                </Text>
              ) : null}
            </View>
            <View style={styles.statsRow}>
              <StatBlock label="Balance">
                <View style={styles.balanceHero}>
                  <Text
                    style={{
                      fontFamily: FMFonts.display,
                      fontSize: 28,
                      color: t.ink,
                      letterSpacing: -0.4,
                      lineHeight: 30,
                    }}
                  >
                    {heroParts.sign}
                    {heroParts.integer}
                    <Text style={{ color: t.inkMuted }}>{heroParts.fraction}</Text>
                  </Text>
                  <Text
                    style={{
                      fontFamily: FMFonts.display,
                      fontSize: 16,
                      color: t.inkSoft,
                      marginLeft: 4,
                    }}
                  >
                    {currencySymbol(currentCurrency)}
                  </Text>
                </View>
              </StatBlock>
              <Rule vertical style={{ marginHorizontal: 16 }} />
              <StatBlock label={`${i18n.income_label}`}>
                <Balance value={accountIncome} masked={masked} size={14} />
              </StatBlock>
              <StatBlock label={`${i18n.expenses_label}`}>
                <Balance value={-accountExpenses} masked={masked} size={14} />
              </StatBlock>
              <StatBlock label="Net">
                <Balance value={net} masked={masked} size={14} total />
              </StatBlock>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-end" }}>
            <Button variant="secondary" icon={<IconUpload size={12} color={t.ink} />} onPress={handleImportPress}>
              Import
            </Button>
            <Button
              variant="secondary"
              icon={<IconAI size={12} color={t.ink} />}
              onPress={() => setAICatModalVisible(true)}
            >
              {i18n.auto_categorize}
            </Button>
            {type === "manual" ? (
              <Button
                variant="primary"
                icon={<IconPlus size={12} color={t.bg} />}
                onPress={() => setTxModalVisible(true)}
              >
                Add transaction
              </Button>
            ) : null}
            <Button
              variant="secondary"
              icon={<IconRefresh size={12} color={t.ink} />}
              onPress={() => loadTransactions()}
            >
              Refresh
            </Button>
            {type === "manual" ? (
              <Button
                variant="danger"
                icon={<IconTrash size={12} color={t.neg} />}
                onPress={() => handleDeleteAccount(deleteManualAccount, () => router.back())}
              >
                Delete
              </Button>
            ) : null}
          </View>
        </Animated.View>

        {/* Filters */}
        <View style={[styles.filters, { backgroundColor: t.surface, borderBottomColor: t.line }]}>
          <Chip
            onPress={openDateModal}
            icon={<View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.accent }} />}
          >
            {dateRangeLabel(filterDateFrom, filterDateTo)}
          </Chip>
          <Rule vertical style={{ marginHorizontal: 8, height: 14 }} />
          <View style={{ flex: 1 }}>
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
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Chip onPress={() => setStatementsModalVisible(true)} icon={<IconDoc size={11} color={t.inkSoft} />}>
              All statements
            </Chip>
            <Chip onPress={() => setCatManageModalVisible(true)} icon={<IconSearch size={11} color={t.inkSoft} />}>
              Categories
            </Chip>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Animated.ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.txList}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleScroll}
          >
            {groupedTransactions.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: t.surface, borderColor: t.line }]}>
                <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 14, color: t.ink }}>
                  No transactions
                </Text>
                <Text style={{ fontFamily: FMFonts.sans, fontSize: 11.5, color: t.inkSoft, marginTop: 4 }}>
                  {filterDateFrom} – {filterDateTo}
                </Text>
              </View>
            ) : (
              groupedTransactions.map((group) => {
                const subtotal = group.txns.reduce((s, x) => s + getTransactionAmount(x), 0);
                return (
                  <View key={group.title} style={{ marginBottom: 14 }}>
                    <View style={styles.dateHead}>
                      <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 10, color: t.inkMuted, letterSpacing: 1, textTransform: "uppercase" }}>
                        {formatGroupHeader(group.title)}
                      </Text>
                      <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.inkSoft, fontVariant: ["tabular-nums"] }}>
                        {formatEUR(subtotal, { showSign: true, masked })}
                      </Text>
                    </View>
                    <View style={[styles.txGroup, { backgroundColor: t.surface, borderColor: t.line }]}>
                      {group.txns.map((tx, i) => {
                        const txId = getStableTxId(tx);
                        const cat = getCategoryForTransaction(txId);
                        const amount = getTransactionAmount(tx);
                        const isSelected = selectedTx && getStableTxId(selectedTx) === txId;
                        return (
                          <Pressable
                            key={txId + i}
                            onPress={() => setSelectedTx(tx)}
                            style={({ pressed }) => [
                              styles.txRow,
                              {
                                borderTopColor: i === 0 ? "transparent" : t.line,
                                borderTopWidth: i === 0 ? 0 : 1,
                                backgroundColor: isSelected ? t.accentSoft : "transparent",
                                opacity: pressed ? 0.85 : 1,
                              },
                            ]}
                          >
                            <View
                              style={{
                                width: 9,
                                height: 9,
                                borderRadius: 5,
                                backgroundColor: cat ? cat.color : "transparent",
                                borderWidth: cat ? 0 : 1.5,
                                borderStyle: cat ? "solid" : "dashed",
                                borderColor: t.inkMuted,
                              }}
                            />
                            <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                              <Text
                                style={{ fontFamily: FMFonts.sansMedium, fontSize: 13, color: t.ink }}
                                numberOfLines={1}
                              >
                                {pickTransactionTitle(tx)}
                              </Text>
                            </View>
                            {cat ? (
                              <Text
                                style={[
                                  styles.tag,
                                  {
                                    backgroundColor: t.surfaceAlt,
                                    color: t.inkSoft,
                                  },
                                ]}
                              >
                                {cat.name}
                              </Text>
                            ) : (
                              <Text
                                style={[
                                  styles.tag,
                                  {
                                    backgroundColor: t.warnSoft,
                                    color: t.warn,
                                    fontFamily: FMFonts.sansSemibold,
                                  },
                                ]}
                              >
                                {i18n.uncategorized}
                              </Text>
                            )}
                            <Text
                              style={[
                                styles.sourceTag,
                                {
                                  backgroundColor: t.surfaceAlt,
                                  color: t.inkMuted,
                                  fontVariant: ["tabular-nums"],
                                },
                              ]}
                            >
                              {(tx as any)?.source?.toString().slice(0, 4).toUpperCase() ?? "BANK"}
                            </Text>
                            <View style={{ width: 110, alignItems: "flex-end" }}>
                              <Money value={amount} masked={masked} size={13} />
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
          </Animated.ScrollView>

          {/* Side panel: selected transaction (floating, fixed size) */}
          <View style={[styles.sidePanel, { backgroundColor: t.surface, borderColor: t.line }]}>
            {selectedTx ? (
              <>
                <View>
                  <Label>Selected transaction</Label>
                  <Text
                    style={{
                      fontFamily: FMFonts.sansSemibold,
                      fontSize: 14,
                      color: t.ink,
                      marginTop: 8,
                    }}
                    numberOfLines={2}
                  >
                    {pickTransactionTitle(selectedTx)}
                  </Text>
                  <View style={styles.sideHero}>
                    <Text
                      style={{
                        fontFamily: FMFonts.display,
                        fontSize: 28,
                        color: getTransactionAmount(selectedTx) < 0 ? t.neg : t.pos,
                        letterSpacing: -0.4,
                        lineHeight: 30,
                      }}
                    >
                      {formatEUR(getTransactionAmount(selectedTx), { masked, showSign: true })}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: FMFonts.sans, fontSize: 11, color: t.inkMuted, marginTop: 2 }}>
                    {selectedTx.booking_date || selectedTx.value_date || "—"} ·{" "}
                    {(selectedTx as any).source ?? "Connected"}
                  </Text>

                  <Rule style={{ marginVertical: 14 }} />
                </View>

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ gap: 12 }}
                  showsVerticalScrollIndicator={false}
                >
                  <View>
                    <Label>Category</Label>
                    <Pressable
                      onPress={() => setCatPickerVisible(true)}
                      style={({ pressed }) => [
                        styles.catRow,
                        {
                          borderColor: t.line,
                          backgroundColor: t.surfaceAlt,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: selectedCat?.color ?? "transparent",
                          borderWidth: selectedCat ? 0 : 1.5,
                          borderStyle: selectedCat ? "solid" : "dashed",
                          borderColor: t.inkMuted,
                          marginRight: 6,
                        }}
                      />
                      <Text
                        style={{ fontFamily: FMFonts.sansMedium, fontSize: 12, color: t.ink, flex: 1 }}
                        numberOfLines={1}
                      >
                        {selectedCat?.name ?? i18n.uncategorized}
                      </Text>
                      <IconChevD size={10} color={t.inkMuted} />
                    </Pressable>
                  </View>
                  <View>
                    <Label>Description</Label>
                    <Text
                      style={{
                        fontFamily: FMFonts.sans,
                        fontSize: 11.5,
                        color: t.inkSoft,
                        marginTop: 4,
                        lineHeight: 17,
                      }}
                    >
                      {(selectedTx.remittance_information ?? []).join(" · ") || "—"}
                    </Text>
                  </View>
                </ScrollView>

                {type === "manual" ? (
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 14 }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<IconEdit size={11} color={t.ink} />}
                      onPress={() => {
                        setEditingTx(selectedTx);
                        setEditModalVisible(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<IconTrash size={11} color={t.neg} />}
                      onPress={() => {
                        if (selectedTx) {
                          handleDeleteTransaction(selectedTx);
                          setSelectedTx(null);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkMuted, textAlign: "center" }}>
                  Click a transaction to see details here.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

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

      <CategoryPickerModal
        visible={catPickerVisible}
        onClose={() => setCatPickerVisible(false)}
        categories={categories}
        categoryColors={CATEGORY_COLORS}
        activeCategoryId={selectedCat?.id ?? null}
        onSelect={(catId) => {
          if (selectedTx) assignCategory(getStableTxId(selectedTx), catId);
        }}
        onCreate={async (catName, color) => addCategory(catName, color)}
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

      <Modal visible={isAICatModalVisible} transparent animationType="fade">
        <View style={styles.modalScrim}>
          <View style={[styles.aiModal, { backgroundColor: t.surface, borderColor: t.lineStrong }]}>
            {isCategorizing ? (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <ActivityIndicator size="large" color={t.accent} />
                <Text style={{ fontFamily: FMFonts.sansMedium, color: t.ink, fontSize: 14, textAlign: "center", marginTop: 18 }}>
                  {i18n.ai_processing ?? "Categorizing…"}
                </Text>
              </View>
            ) : (
              <>
                <Text style={{ fontFamily: FMFonts.display, fontSize: 22, color: t.ink, letterSpacing: -0.3 }}>
                  {i18n.ai_categorization_title ?? "Auto-categorize"}
                </Text>
                <Text style={{ fontFamily: FMFonts.sans, fontSize: 13, color: t.inkSoft, marginTop: 8, lineHeight: 19 }}>
                  {i18n.ai_categorization_desc ?? "Pick which transactions to send to Gemini for categorization."}
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
    </DesktopShell>
  );
}

interface StatBlockProps {
  label: string;
  children: React.ReactNode;
}

function StatBlock({ label, children }: StatBlockProps) {
  const t = useFMTheme();
  return (
    <View style={{ marginRight: 32 }}>
      <Text
        style={{
          fontFamily: FMFonts.sansSemibold,
          fontSize: 10,
          color: t.inkMuted,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <View style={{ marginTop: 4 }}>{children}</View>
    </View>
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
    const dayMonth = d.toLocaleDateString("en-GB", { day: "2-digit", month: "long" });
    const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
    return `${iso} · ${weekday}`;
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
  page: {
    flex: 1,
    flexDirection: "column",
    minHeight: "100%" as unknown as number,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  header: {
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  balanceHero: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  filters: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  body: {
    flex: 1,
    flexDirection: "row",
    position: "relative",
  },
  txList: {
    paddingLeft: 24,
    paddingRight: 348,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  dateHead: {
    paddingHorizontal: 4,
    paddingBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  txGroup: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tag: {
    fontFamily: FMFonts.sansMedium,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginRight: 8,
    overflow: "hidden",
  },
  sourceTag: {
    fontFamily: FMFonts.sansMedium,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.4,
    marginRight: 8,
    overflow: "hidden",
  },
  sidePanel: {
    position: "absolute",
    top: 16,
    right: 24,
    width: 300,
    height: 520,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  sideHero: {
    marginTop: 6,
  },
  catRow: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  empty: {
    padding: 32,
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
    width: 420,
    padding: 22,
    borderRadius: 14,
    borderWidth: 1,
  },
});
