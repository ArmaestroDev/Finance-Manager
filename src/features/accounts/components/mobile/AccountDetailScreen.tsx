import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { MobileShell } from "@/src/shared/components/MobileShell";
import {
  Avatar,
  Balance,
  Card,
  Chip,
  EmptyState,
  Fab,
  IconAI,
  IconButton,
  IconCalendar,
  IconDoc,
  IconPlus,
  IconRefresh,
  IconSliders,
  IconTrash,
  IconUpload,
  Label,
  ListItem,
  Money,
  Pill,
  formatEUR,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import { useTransactionLinks } from "@/src/features/transactions/context/TransactionLinksContext";
import { CategoryFilterBar } from "@/src/shared/components/CategoryFilterBar";
import { DateFilterModal } from "@/src/shared/components/DateFilterModal";
import { useDateFilter } from "@/src/shared/context/DateFilterContext";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { StatementsModal } from "@/src/features/import/components/StatementsModal";
import { CsvMappingModal } from "@/src/features/import/components/CsvMappingModal";
import {
  CATEGORY_COLORS,
  useCategories,
} from "@/src/features/transactions/context/CategoriesContext";
import { AddTransactionModal } from "@/src/features/transactions/components/AddTransactionModal";
import { AiCategorizeSheet } from "@/src/features/transactions/components/AiCategorizeSheet";
import { CategoryManageModal } from "@/src/features/transactions/components/CategoryManageModal";
import { EditTransactionModal } from "@/src/features/transactions/components/EditTransactionModal";
import { TransactionDetailModal } from "@/src/features/transactions/components/TransactionDetailModal";
import { useAccountTransactions } from "@/src/features/transactions/hooks/useAccountTransactions";
import { useAutoCategorize } from "@/src/features/transactions/hooks/useAutoCategorize";
import { LinkedInfo } from "@/src/features/transactions/components/LinkedInfo";
import { RangeCoverageHint } from "@/src/features/transactions/components/RangeCoverageHint";
import { useTransactionsContext } from "@/src/features/transactions/context/TransactionsContext";
import {
  getStableTxId,
  pickTransactionTitle,
} from "@/src/features/transactions/utils/transactions";
import type { Transaction } from "@/src/services/enableBanking";
import { useAccounts } from "../../context/AccountsContext";
import { useAccountStats } from "../../hooks/useAccountStats";
import { UncategorizedHint } from "../UncategorizedHint";
import { useAccountFileImport } from "../../hooks/useAccountFileImport";
import { AccountCategoryModal } from "../AccountCategoryModal";
import {
  accountBankLabel,
  accountCategoryLabel,
  currencySymbol,
  dateRangeLabel,
  formatGroupHeader,
  transactionSource,
  accountDisplayName,
} from "../../utils/accountDisplay";

export function AccountDetailScreen() {
  const t = useFMTheme();
  const insets = useSafeAreaInsets();
  const { id, name, type: typeParam, qa, tx: txParam } = useLocalSearchParams<{
    qa?: string;
    /** Stable id of a transaction to open (links navigate here). */
    tx?: string;
    id: string;
    name: string;
    type: "connected" | "manual";
  }>();
  const router = useRouter();
  const {
    isBalanceHidden,
    i18n,
    language,
  } = useSettings();
  const { accounts } = useAccounts();
  // The `type` route param is only set when navigating from the Accounts
  // list; links from the dashboard/search pass just the id. Resolve the type
  // from the loaded account so manual-only actions (Add transaction, edit)
  // don't silently disappear.
  const type: "connected" | "manual" | undefined =
    accounts.find((a) => a.id === id)?.type ?? typeParam;
  const {
    categories,
    addCategory,
    updateCategory: updateCategoryCtx,
    deleteCategory: deleteCategoryCtx,
    assignCategory,
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
  });

  // Row amounts / subtotals follow the shared link rules (utils/links.ts).
  const { getDisplayAmount, getStatAmount } = useTransactionLinks();
  const { findTransaction } = useTransactionsContext();

  const { accountIncome, accountExpenses, uncategorizedCount } = useAccountStats({
    transactions,
    getCategoryForTransaction,
  });

  const { autoCategorizeTransactions, isCategorizing, progress: aiProgress } = useAutoCategorize({
    transactions,
    categoryColors: CATEGORY_COLORS,
    setLoading,
    onFinish: () => setAICatModalVisible(false),
  });

  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isTxModalVisible, setTxModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isCatModalVisible, setCatModalVisible] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  // Keep the open detail sheet in sync after edits / re-categorization /
  // deletion (mirrors the desktop side panel); otherwise it showed the stale
  // transaction object captured when the row was tapped.
  useEffect(() => {
    if (!detailTx) return;
    const txKey = getStableTxId(detailTx);
    // Linked transactions opened from the sheet may lie outside the range.
    const fresh = transactions.find((tx) => getStableTxId(tx) === txKey) ?? findTransaction(txKey)?.tx ?? null;
    if (fresh !== detailTx) setDetailTx(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);
  const [isCatManageModalVisible, setCatManageModalVisible] = useState(false);
  const [isAICatModalVisible, setAICatModalVisible] = useState(false);
  const [isStatementsModalVisible, setStatementsModalVisible] = useState(false);

  // Quick-add deep links: ?qa=tx opens "Add transaction" (manual accounts
  // only), ?qa=import opens the statements/import modal. Fired once, then
  // the param is cleared so going back doesn't reopen the modal.
  useEffect(() => {
    if (!qa) return;
    if (qa === "tx" && type === "manual") setTxModalVisible(true);
    else if (qa === "import") setStatementsModalVisible(true);
    else if (qa === "tx" && !type) return; // wait for accounts to load
    router.setParams({ qa: undefined } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qa, type]);

  // ?tx=<id>: open a transaction (navigated to from a linked transaction).
  useEffect(() => {
    if (!txParam) return;
    const found = findTransaction(txParam);
    if (!found) return; // wait for storage to load
    setDetailTx(found.tx);
    setDetailModalVisible(true);
    router.setParams({ tx: undefined } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txParam, findTransaction]);
  const openLinkedTransaction = (txId: string, accountId: string) => {
    if (accountId === id) {
      const found = findTransaction(txId);
      if (found) setDetailTx(found.tx);
    } else {
      setDetailModalVisible(false);
      router.push({ pathname: `/account/${accountId}` as never, params: { tx: txId } } as never);
    }
  };

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
      const date = dateStr;
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
  const fallbackName = typeof name === "string" && name ? name : i18n.acct_fallback_name;
  const currentBankName =
    (currentAccount ? accountBankLabel(currentAccount, i18n) : undefined) || fallbackName;
  const currentIban = currentAccount?.iban;
  const accountName = currentAccount ? accountDisplayName(currentAccount, i18n) : fallbackName;
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

  const { pickAndImport, currentCsv, cancelCsv, confirmCsv } = useAccountFileImport({
    accountId: id,
    accountType: type as "connected" | "manual",
    currency: currentCurrency,
    importTransactions: handleImportBankStatement,
  });

  if (loading && transactions.length === 0) {
    return (
      <MobileShell title={accountName} onBack={() => router.back()} tabBar={false} scrollable={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={t.primary} accessibilityLabel={i18n.tx_loading} />
        </View>
      </MobileShell>
    );
  }

  const headerRight = (
    <>
      <IconButton
        icon={<IconAI size={20} />}
        label={i18n.auto_categorize}
        onPress={() => setAICatModalVisible(true)}
      />
      <IconButton icon={<IconRefresh size={20} />} label={i18n.shared_refresh} onPress={() => loadTransactions()} />
    </>
  );

  // Balance hero + Income / Expenses / Net.
  const heroCard = (
    <Card padding={20}>
      <Label>{i18n.acct_current_balance}</Label>
      <View style={styles.balanceHero}>
        <Text
          style={{
            fontFamily: FMFonts.display,
            fontSize: 36,
            lineHeight: 44,
            color: t.ink,
            fontVariant: ["tabular-nums"],
          }}
        >
          {heroParts.sign}
          {heroParts.integer}
          <Text style={{ color: t.inkSoft }}>{heroParts.fraction}</Text>
        </Text>
        <Text style={{ fontFamily: FMFonts.display, fontSize: FMType.h2, color: t.inkSoft, marginLeft: 4 }}>
          {currencySymbol(currentCurrency)}
        </Text>
      </View>
      <View style={styles.pillRow}>
        <Pill onPress={() => setCatModalVisible(true)}>{currentBankName}</Pill>
        <Pill onPress={() => setCatModalVisible(true)}>{accountCategoryLabel(category, i18n)}</Pill>
        {currentIban ? (
          <Text
            style={{ fontFamily: FMFonts.sans, fontSize: FMType.small, color: t.inkSoft, fontVariant: ["tabular-nums"] }}
            numberOfLines={1}
          >
            ·· {currentIban.slice(-9)}
          </Text>
        ) : null}
      </View>
      <View style={styles.statsRow}>
        <StatCell label={i18n.income_label} value={accountIncome} masked={masked} />
        <StatCell label={i18n.expenses_label} value={-accountExpenses} masked={masked} />
        <StatCell label={i18n.net} value={net} masked={masked} total />
      </View>
      <UncategorizedHint count={uncategorizedCount} onPress={() => setAICatModalVisible(true)} />
    </Card>
  );

  // Secondary actions as M3 assist chips (Add transaction is the FAB).
  const actions = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsRow}>
      <Chip icon={<IconDoc size={16} />} onPress={() => setStatementsModalVisible(true)}>
        {i18n.acct_statements_short}
      </Chip>
      <Chip icon={<IconUpload size={16} />} onPress={pickAndImport}>
        {i18n.import}
      </Chip>
      <Chip icon={<IconSliders size={16} />} onPress={() => setCatManageModalVisible(true)}>
        {i18n.categories}
      </Chip>
      {type === "manual" ? (
        <Chip icon={<IconTrash size={16} />} onPress={() => handleDeleteAccount(() => router.back())}>
          {i18n.delete}
        </Chip>
      ) : null}
    </ScrollView>
  );

  return (
    <MobileShell
      scrollable={false}
      tabBar={false}
      title={accountName}
      onBack={() => router.back()}
      right={headerRight}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <SectionList
        sections={groupedTransactions}
        keyExtractor={(item, i) => getStableTxId(item) + i}
        contentContainerStyle={[styles.scrollContent, type === "manual" && { paddingBottom: 104 }]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTransactions()}
            tintColor={t.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            {heroCard}
            {actions}
            {/* Date + category filter bar */}
            <View style={styles.filterBar}>
              <Chip
                onPress={openDateModal}
                icon={<IconCalendar size={16} />}
                accessibilityLabel={i18n.filter_by_date}
              >
                {dateRangeLabel(filterDateFrom, filterDateTo, i18n)}
              </Chip>
              <View style={{ flex: 1, minWidth: 0 }}>
                <CategoryFilterBar
                  categories={categories}
                  transactions={transactions}
                  getCategoryForTransaction={getCategoryForTransaction}
                  selectedFilter={selectedCategoryId}
                  onSelectFilter={setSelectedCategoryId}
                  i18n={i18n}
                />
              </View>
            </View>
            <RangeCoverageHint accountId={id} />
          </View>
        }
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: t.bg }]}>
            <Label>{formatGroupHeader(title, i18n, language)}</Label>
            <Text style={[styles.sectionSubtotal, { color: t.inkSoft }]}>
              {formatEUR(
                // Net: linked children excluded, reimbursed expenses at the user's share.
                data.reduce((s, x) => s + (getStatAmount(x) ?? 0), 0),
                { showSign: true, masked },
              )}
            </Text>
          </View>
        )}
        renderItem={({ item, section, index }) => {
          const isFirst = index === 0;
          const isLast = index === section.data.length - 1;
          const txId = getStableTxId(item);
          const cat = getCategoryForTransaction(txId);
          const title = pickTransactionTitle(item);
          // No source label for manual entries (it used to wrongly say BANK).
          const source =
            transactionSource(item)?.slice(0, 4).toUpperCase() ??
            (type === "connected" ? i18n.tx_source_bank : null);
          const rowDisplayAmount = getDisplayAmount(item);
          return (
            <View
              style={{
                backgroundColor: t.surface,
                overflow: "hidden",
                borderTopLeftRadius: isFirst ? 16 : 0,
                borderTopRightRadius: isFirst ? 16 : 0,
                borderBottomLeftRadius: isLast ? 16 : 0,
                borderBottomRightRadius: isLast ? 16 : 0,
              }}
            >
              <ListItem
                onPress={() => handleTransactionPress(item)}
                background={t.surface}
                accessibilityLabel={title}
                leading={<Avatar label={title} color={cat?.color} />}
                title={title}
                subtitle={
                  <View>
                    <Text style={{ fontFamily: FMFonts.sans, fontSize: FMType.body, color: t.inkSoft }} numberOfLines={1}>
                      {cat ? (
                        cat.name
                      ) : (
                        <Text style={{ color: t.warn, fontFamily: FMFonts.sansMedium }}>{i18n.uncategorized}</Text>
                      )}
                      {source ? ` · ${source}` : ""}
                    </Text>
                    <LinkedInfo txId={txId} masked={masked} align="flex-start" />
                  </View>
                }
                trailing={<Money value={rowDisplayAmount} masked={masked} size={FMType.bodyLg} />}
              />
            </View>
          );
        }}
        SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <Card>
            <EmptyState
              icon={<IconDoc />}
              title={i18n.tx_none}
              body={dateRangeLabel(filterDateFrom, filterDateTo, i18n)}
            />
          </Card>
        }
      />

      {type === "manual" ? (
        <Fab
          icon={<IconPlus size={22} />}
          label={i18n.acct_add_transaction}
          onPress={() => setTxModalVisible(true)}
          style={[styles.fab, { bottom: 16 + insets.bottom }]}
        />
      ) : null}

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
        accountId={id}
        onOpenTransaction={openLinkedTransaction}
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
      />

      <AccountCategoryModal
        visible={isCatModalVisible}
        currentCategory={category}
        onSelect={updateCategoryValue}
        onClose={() => setCatModalVisible(false)}
      />

      <AddTransactionModal
        visible={isTxModalVisible}
        onAdd={(title, amount) => {
          handleAddTransaction(title, amount);
          setTxModalVisible(false);
        }}
        onClose={() => setTxModalVisible(false)}
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
        i18n={i18n}
      />

      <AiCategorizeSheet
        visible={isAICatModalVisible}
        busy={isCategorizing}
        progress={aiProgress}
        onRun={autoCategorizeTransactions}
        onClose={() => setAICatModalVisible(false)}
      />

      <StatementsModal
        visible={isStatementsModalVisible}
        accountId={id}
        accountType={type as "connected" | "manual"}
        onClose={() => setStatementsModalVisible(false)}
        onImport={pickAndImport}
      />

      {currentCsv ? (
        <CsvMappingModal
          visible
          fileName={currentCsv.fileName}
          fileContent={currentCsv.content}
          currency={currentCurrency}
          onCancel={cancelCsv}
          onConfirm={confirmCsv}
        />
      ) : null}
    </MobileShell>
  );
}

interface StatCellProps {
  label: string;
  value: number;
  masked: boolean;
  total?: boolean;
}

function StatCell({ label, value, masked, total }: StatCellProps) {
  return (
    // Content-sized columns (flexBasis auto) so the wider signed Net figure
    // isn't squeezed into a third and wrapped onto two lines.
    <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "auto", minWidth: 0 }}>
      <Label>{label}</Label>
      <View style={{ marginTop: 4 }}>
        <Balance value={value} masked={masked} size={FMType.bodyLg} total={total} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  balanceHero: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sectionSubtotal: {
    fontFamily: FMFonts.sansMedium,
    fontSize: FMType.caption,
    fontVariant: ["tabular-nums"],
  },
  fab: {
    position: "absolute",
    right: 16,
  },
});
