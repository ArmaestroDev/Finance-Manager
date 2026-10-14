import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import { CategoryOverview, matchesCategoryFilter } from "../CategoryOverview";
import { DateFilterModal } from "@/src/shared/components/DateFilterModal";
import {
  Avatar,
  Balance,
  Button,
  Card,
  Chip,
  EmptyState,
  IconAI,
  IconButton,
  IconCalendar,
  IconChevD,
  IconDoc,
  IconEdit,
  IconPlus,
  IconSliders,
  IconTrash,
  Label,
  ListItem,
  Money,
  Pill,
  formatEUR,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
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
import { CategoryPickerModal } from "@/src/features/transactions/components/CategoryPickerModal";
import { EditTransactionModal } from "@/src/features/transactions/components/EditTransactionModal";
import { useAccountTransactions } from "@/src/features/transactions/hooks/useAccountTransactions";
import { useAutoCategorize } from "@/src/features/transactions/hooks/useAutoCategorize";
import {
  getStableTxId,
  pickTransactionTitle,
} from "@/src/features/transactions/utils/transactions";
import { useTransactionLinks } from "@/src/features/transactions/context/TransactionLinksContext";
import { useTransactionsContext } from "@/src/features/transactions/context/TransactionsContext";
import { LinkedInfo } from "@/src/features/transactions/components/LinkedInfo";
import { TransactionLinkPanel } from "@/src/features/transactions/components/TransactionLinkPanel";
import { RangeCoverageHint } from "@/src/features/transactions/components/RangeCoverageHint";
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
import { formatDate } from "@/src/shared/utils/date";

export function AccountDetailScreen() {
  const t = useFMTheme();
  // Wider detail pane on large screens so linked rows keep their titles.
  const { width: windowWidth } = useWindowDimensions();
  const { id, name, type: typeParam, qa, tx: txParam } = useLocalSearchParams<{
    qa?: string;
    /** Stable id of a transaction to select (links navigate here). */
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
  const isConnectedAccount = type === "connected";
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
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  // Keep the detail pane in sync after edits/deletes/reloads (it held a stale copy).
  useEffect(() => {
    if (!selectedTx) return;
    const id = getStableTxId(selectedTx);
    // Linked transactions opened from the panel may lie outside the range.
    const fresh = transactions.find((t) => getStableTxId(t) === id) ?? findTransaction(id)?.tx ?? null;
    if (fresh !== selectedTx) setSelectedTx(fresh);
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
  const [catPickerVisible, setCatPickerVisible] = useState(false);
  // ?tx=<id>: select a transaction (opened from a linked transaction).
  useEffect(() => {
    if (!txParam) return;
    const found = findTransaction(txParam);
    if (!found) return; // wait for storage to load
    setSelectedTx(found.tx);
    router.setParams({ tx: undefined } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txParam, findTransaction]);
  const openLinkedTransaction = (txId: string, accountId: string) => {
    if (accountId === id) {
      const found = findTransaction(txId);
      if (found) setSelectedTx(found.tx);
    } else {
      router.push({ pathname: `/account/${accountId}` as never, params: { tx: txId } } as never);
    }
  };

  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");

  const filteredTransactions = selectedCategoryId
    ? transactions.filter((tx) => matchesCategoryFilter(getCategoryForTransaction(getStableTxId(tx)), selectedCategoryId))
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
      .map((date) => ({ title: date, txns: groups[date] }));
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

  const { pickAndImport, currentCsv, cancelCsv, confirmCsv } = useAccountFileImport({
    accountId: id,
    accountType: type as "connected" | "manual",
    currency: currentCurrency,
    importTransactions: handleImportBankStatement,
  });

  const selectedCat = selectedTx ? getCategoryForTransaction(getStableTxId(selectedTx)) : null;

  if (loading && transactions.length === 0) {
    return (
      <DesktopShell title={accountName} activeId="accounts" onBack={() => router.back()}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={t.primary} accessibilityLabel={i18n.tx_loading} />
        </View>
      </DesktopShell>
    );
  }

  const headerActions = (
    <>
      <IconButton
        icon={<IconSliders size={18} />}
        label={i18n.categories}
        onPress={() => setCatManageModalVisible(true)}
      />
      {type === "manual" ? (
        <IconButton
          icon={<IconTrash size={18} />}
          label={i18n.delete}
          onPress={() => handleDeleteAccount(() => router.back())}
        />
      ) : null}
      {windowWidth < 1100 ? (
        // Narrow windows: icon only, so the top bar fits.
        <IconButton
          icon={<IconDoc size={18} />}
          label={i18n.acct_statements_short}
          onPress={() => setStatementsModalVisible(true)}
        />
      ) : (
        <Button
          variant="outlined"
          icon={<IconDoc size={16} />}
          onPress={() => setStatementsModalVisible(true)}
        >
          {i18n.acct_statements_short}
        </Button>
      )}
      {windowWidth < 960 ? (
        <IconButton icon={<IconAI size={18} />} label={i18n.auto_categorize} onPress={() => setAICatModalVisible(true)} />
      ) : (
        <Button variant="tonal" icon={<IconAI size={16} />} onPress={() => setAICatModalVisible(true)}>
          {i18n.auto_categorize}
        </Button>
      )}
      {type === "manual" ? (
        <Button icon={<IconPlus size={16} />} onPress={() => setTxModalVisible(true)}>
          {i18n.acct_add_transaction}
        </Button>
      ) : null}
    </>
  );

  return (
    <DesktopShell
      title={accountName}
      activeId="accounts"
      onBack={() => router.back()}
      onRefresh={() => loadTransactions()}
      actions={headerActions}
      scrollable={false}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.page}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.main}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary */}
          <Card padding={24}>
            <View style={styles.summaryRow}>
              <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 260 }}>
                <Label>{i18n.acct_balance_label}</Label>
                <View style={styles.balanceHero}>
                  <Text
                    style={{
                      fontFamily: FMFonts.display,
                      fontSize: 40,
                      lineHeight: 48,
                      color: t.ink,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {heroParts.sign}
                    {heroParts.integer}
                    <Text style={{ color: t.inkSoft }}>{heroParts.fraction}</Text>
                  </Text>
                  <Text style={{ fontFamily: FMFonts.display, fontSize: 22, color: t.inkSoft, marginLeft: 6 }}>
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
                      {currentIban}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.statsRow}>
                <StatBlock label={i18n.income_label}>
                  <Balance value={accountIncome} masked={masked} size={FMType.h2} />
                </StatBlock>
                <StatBlock label={i18n.expenses_label}>
                  <Balance value={-accountExpenses} masked={masked} size={FMType.h2} />
                </StatBlock>
                <StatBlock label={i18n.net}>
                  <Balance value={net} masked={masked} size={FMType.h2} total />
                </StatBlock>
              </View>
            </View>
      <UncategorizedHint count={uncategorizedCount} onPress={() => setAICatModalVisible(true)} />
          </Card>

          {/* Filters */}
          <View style={styles.filters}>
            <Chip
              onPress={openDateModal}
              icon={<IconCalendar size={16} />}
              iconRight={<IconChevD size={14} />}
              accessibilityLabel={i18n.filter_by_date}
            >
              {dateRangeLabel(filterDateFrom, filterDateTo, i18n)}
            </Chip>
          </View>

          <CategoryOverview
            transactions={transactions}
            categories={categories}
            getCategoryForTransaction={getCategoryForTransaction}
            selected={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            masked={masked}
          />

          <RangeCoverageHint accountId={id} style={{ paddingHorizontal: 16, marginTop: -8 }} />

          {/* Transactions grouped by day */}
          {groupedTransactions.length === 0 ? (
            <Card>
              <EmptyState
                icon={<IconDoc />}
                title={i18n.tx_none}
                body={dateRangeLabel(filterDateFrom, filterDateTo, i18n)}
              />
            </Card>
          ) : (
            groupedTransactions.map((group) => {
              // Net subtotal: linked children excluded, reimbursed
              // expenses at the user's share.
              const subtotal = group.txns.reduce((s, x) => s + (getStatAmount(x) ?? 0), 0);
              return (
                <View key={group.title}>
                  <View style={styles.dateHead}>
                    <Label>{formatGroupHeader(group.title, i18n, language)}</Label>
                    <Text
                      style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.caption, color: t.inkSoft, fontVariant: ["tabular-nums"] }}
                    >
                      {formatEUR(subtotal, { showSign: true, masked })}
                    </Text>
                  </View>
                  <Card padding={0} style={{ overflow: "hidden" }}>
                    {group.txns.map((tx, i) => {
                      const txId = getStableTxId(tx);
                      const cat = getCategoryForTransaction(txId);
                      const isSelected = !!selectedTx && getStableTxId(selectedTx) === txId;
                      const title = pickTransactionTitle(tx);
                      // Imported rows carry `source` (pdf/csv); live bank rows
                      // have none. Manual entries get no source label.
                      const source =
                        transactionSource(tx)?.slice(0, 4).toUpperCase() ??
                        (isConnectedAccount ? i18n.tx_source_bank : null);
                      return (
                        <ListItem
                          key={txId + i}
                          onPress={() => setSelectedTx(tx)}
                          selected={isSelected}
                          background={t.surface}
                          accessibilityLabel={title}
                          leading={<Avatar label={title} color={cat?.color} />}
                          title={title}
                          subtitle={
                            <Text style={{ fontFamily: FMFonts.sans, fontSize: FMType.body, color: t.inkSoft }} numberOfLines={1}>
                              {cat ? (
                                cat.name
                              ) : (
                                <Text style={{ color: t.warn, fontFamily: FMFonts.sansMedium }}>{i18n.uncategorized}</Text>
                              )}
                              {source ? ` · ${source}` : ""}
                            </Text>
                          }
                          trailing={
                            <View style={{ alignItems: "flex-end" }}>
                              <Money value={getDisplayAmount(tx)} masked={masked} size={FMType.bodyLg} />
                              <LinkedInfo txId={txId} masked={masked} />
                            </View>
                          }
                        />
                      );
                    })}
                  </Card>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Detail pane: selected transaction */}
        <Card padding={20} style={[styles.sidePanel, windowWidth >= 1440 && { width: 380 }]}>
          {(() => {
            if (!selectedTx) {
              return (
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <EmptyState icon={<IconDoc />} title={i18n.tx_select_hint} />
                </View>
              );
            }
            const selDisplayAmount = getDisplayAmount(selectedTx);
            return (
              <>
                <View>
                  <Text
                    style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.subhead, lineHeight: 24, color: t.ink }}
                    numberOfLines={2}
                    accessibilityRole="header"
                  >
                    {pickTransactionTitle(selectedTx)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: FMFonts.display,
                      fontSize: 32,
                      lineHeight: 40,
                      marginTop: 4,
                      color: selDisplayAmount < 0 ? t.neg : selDisplayAmount > 0 ? t.pos : t.inkMuted,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatEUR(selDisplayAmount, { masked, showSign: true })}
                  </Text>
                  <Text style={{ fontFamily: FMFonts.sans, fontSize: FMType.small, color: t.inkSoft, marginTop: 2 }}>
                    {formatDate(selectedTx.booking_date || selectedTx.value_date || "") || "—"} ·{" "}
                    {transactionSource(selectedTx) ??
                      (isConnectedAccount ? i18n.tx_source_connected : i18n.tx_source_manual)}
                  </Text>
                </View>

                <ScrollView
                  style={{ flex: 1, marginTop: 20 }}
                  contentContainerStyle={{ gap: 20 }}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={{ gap: 8 }}>
                    <Label>{i18n.category_label}</Label>
                    <Chip
                      onPress={() => setCatPickerVisible(true)}
                      icon={
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: selectedCat?.color ?? "transparent",
                            borderWidth: selectedCat ? 0 : 1.5,
                            borderColor: t.inkSoft,
                          }}
                        />
                      }
                      iconRight={<IconChevD size={14} />}
                      accessibilityLabel={i18n.category_label}
                    >
                      {selectedCat?.name ?? i18n.uncategorized}
                    </Chip>
                  </View>
                  <View style={{ gap: 4 }}>
                    <Label>{i18n.desc_label}</Label>
                    <Text style={{ fontFamily: FMFonts.sans, fontSize: FMType.body, lineHeight: 20, color: t.ink }}>
                      {(selectedTx.remittance_information ?? []).join(" · ") || "—"}
                    </Text>
                  </View>

                  <TransactionLinkPanel
                    transaction={selectedTx}
                    accountId={id}
                    onOpenTransaction={openLinkedTransaction}
                  />
                </ScrollView>

                {type === "manual" ? (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
                    <Button
                      variant="outlined"
                      size="sm"
                      icon={<IconEdit size={14} />}
                      onPress={() => {
                        setEditingTx(selectedTx);
                        setEditModalVisible(true);
                      }}
                    >
                      {i18n.edit}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<IconTrash size={14} />}
                      onPress={() => {
                        if (selectedTx) {
                          handleDeleteTransaction(selectedTx);
                          setSelectedTx(null);
                        }
                      }}
                    >
                      {i18n.delete}
                    </Button>
                  </View>
                ) : null}
              </>
            );
          })()}
        </Card>
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
    </DesktopShell>
  );
}

interface StatBlockProps {
  label: string;
  children: React.ReactNode;
}

function StatBlock({ label, children }: StatBlockProps) {
  return (
    <View style={{ minWidth: 120 }}>
      <Label>{label}</Label>
      <View style={{ marginTop: 4 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 16,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  main: {
    paddingBottom: 32,
    gap: 16,
  },
  // Wraps: on narrower desktop windows the stats drop below the balance.
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    columnGap: 24,
    rowGap: 16,
  },
  balanceHero: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 32,
    rowGap: 12,
    // RN items don't shrink by default; without this the row overflows the
    // card on narrow windows instead of wrapping.
    flexShrink: 1,
    maxWidth: "100%",
  },
  filters: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateHead: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sidePanel: {
    width: 320,
    alignSelf: "stretch",
    marginBottom: 24,
  },
});
