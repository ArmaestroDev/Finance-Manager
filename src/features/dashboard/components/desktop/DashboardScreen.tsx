import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import { DateFilterModal } from "@/src/shared/components/DateFilterModal";
import {
  Balance,
  Button,
  Donut,
  IconAI,
  IconFilter,
  IconWarn,
  Label,
  Money,
  PrivacyHint,
  Spark,
  formatEUR,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import { useDateFilter } from "@/src/shared/context/DateFilterContext";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { useCategories } from "@/src/features/transactions/context/CategoriesContext";
import { CategoryBudgetModal } from "@/src/features/transactions/components/CategoryBudgetModal";
import { useCategoryBudgets } from "../../hooks/useCategoryBudgets";
import { DebtsSummaryCard } from "@/src/features/debts/components/desktop/DebtsSummaryCard";
import {
  getStableTxId,
  getTransactionAmount,
  pickTransactionTitle,
} from "@/src/features/transactions/utils/transactions";
import { useFinanceData } from "../../hooks/useFinanceData";
import { useFinanceStats } from "../../hooks/useFinanceStats";
import { buildFlowSeries } from "../../utils/flowSeries";
import { formatDate } from "@/src/shared/utils/date";

export function DashboardScreen() {
  const t = useFMTheme();
  const router = useRouter();
  const { isBalanceHidden, i18n, mainAccountId, language } = useSettings();
  const { categories, transactionCategoryMap } = useCategories();
  const { getEstimate, budgetableCategories } = useCategoryBudgets();
  const { setSelectedCategoryId } = useDateFilter();

  const {
    allTransactions,
    statsLoading,
    filterDateFrom,
    filterDateTo,
    accounts,
    cashBalance,
    refreshAccounts,
    loadAllTransactions,
    applyDateFilter,
  } = useFinanceData();

  const {
    totalAssets,
    totalLiabilities,
    totalIncome,
    totalExpenses,
    categoryBreakdown,
    monthlyBuckets,
  } = useFinanceStats({
    allTransactions,
    accounts,
    cashBalance,
    categories,
    transactionCategoryMap,
    filterDateFrom,
    filterDateTo,
  });

  const masked = isBalanceHidden;
  const netWorth = totalAssets - totalLiabilities;
  const heroParts = splitForHero(netWorth, masked);

  // Real trailing-30-day cumulative income / expense / net for the sparklines.
  const flow = useMemo(
    () =>
      buildFlowSeries(
        allTransactions,
        transactionCategoryMap,
        categories,
        filterDateFrom,
        filterDateTo,
      ),
    [
      allTransactions,
      transactionCategoryMap,
      categories,
      filterDateFrom,
      filterDateTo,
    ],
  );

  // ── View-mode selector for the "Where it went" panel ──
  // viewMode: "total" | "avg" | "<YYYY-MM>"
  const [viewMode, setViewMode] = useState<string>("total");
  const showSelector = monthlyBuckets.length > 1;
  const locale = language === "de" ? "de-DE" : "en-GB";

  const view = useMemo(() => {
    const N = monthlyBuckets.length;
    if (showSelector && viewMode === "avg" && N > 0) {
      return {
        income: totalIncome / N,
        expenses: totalExpenses / N,
        breakdown: categoryBreakdown.map((b) => ({ ...b, amount: b.amount / N })),
        donutLabel: i18n.avg_per_month,
        rangeText: i18n.avg_per_month,
      };
    }
    if (showSelector && viewMode !== "total" && viewMode !== "avg") {
      const bucket = monthlyBuckets.find((b) => b.key === viewMode);
      if (bucket) {
        const longLabel = new Date(bucket.year, bucket.month, 1).toLocaleDateString(locale, {
          month: "long",
          year: "numeric",
        });
        return {
          income: bucket.income,
          expenses: bucket.expenses,
          breakdown: bucket.categoryBreakdown,
          donutLabel: longLabel,
          rangeText: longLabel,
        };
      }
    }
    return {
      income: totalIncome,
      expenses: totalExpenses,
      breakdown: categoryBreakdown,
      donutLabel: i18n.total,
      rangeText: rangeLabel(filterDateFrom, filterDateTo),
    };
  }, [
    viewMode,
    showSelector,
    monthlyBuckets,
    totalIncome,
    totalExpenses,
    categoryBreakdown,
    locale,
    filterDateFrom,
    filterDateTo,
    i18n,
  ]);

  const netCashflow = view.income - view.expenses;

  const slices = view.breakdown.map((c) => ({
    id: c.categoryId,
    amount: c.amount,
    color: c.color,
  }));
  const totalExp = slices.reduce((s, x) => s + x.amount, 0);

  // The estimate is per-month; scale it to the period the panel is showing so
  // actual-vs-estimate is apples-to-apples. A single month or the avg view is
  // 1×; the "total" view spans every bucket in range.
  const periodMonths =
    showSelector && viewMode === "total"
      ? Math.max(1, monthlyBuckets.length)
      : 1;

  // Legend = spent categories ∪ categories with an estimate but no spend yet
  // (the latter would otherwise be invisible since breakdown is tx-derived).
  const legendRows = useMemo(() => {
    const rows = view.breakdown.map((b) => ({
      categoryId: b.categoryId,
      name: b.name,
      color: b.color,
      amount: b.amount,
      estimate: getEstimate(b.categoryId) * periodMonths,
    }));
    const present = new Set(rows.map((r) => r.categoryId));
    for (const c of budgetableCategories) {
      const est = getEstimate(c.id);
      if (est > 0 && !present.has(c.id)) {
        rows.push({
          categoryId: c.id,
          name: c.name,
          color: c.color,
          amount: 0,
          estimate: est * periodMonths,
        });
      }
    }
    return rows;
  }, [view.breakdown, getEstimate, periodMonths, budgetableCategories]);

  const uncategorized = allTransactions.filter(
    (tx) => !transactionCategoryMap[getStableTxId(tx)],
  );
  const uncategorizedAmount = uncategorized.reduce(
    (s, tx) => s + Math.abs(getTransactionAmount(tx)),
    0,
  );

  const recent = allTransactions.slice(0, 5);

  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [isBudgetModalVisible, setBudgetModalVisible] = useState(false);
  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");

  const openDateModal = () => {
    setTempFrom(filterDateFrom);
    setTempTo(filterDateTo);
    setDateModalVisible(true);
  };
  const handleApplyDateFilter = (from: string, to: string) => {
    applyDateFilter(from, to);
    setDateModalVisible(false);
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    let target = mainAccountId ? accounts.find((a) => a.id === mainAccountId) : null;
    if (!target) target = accounts.find((a) => a.category === "Giro") ?? accounts[0] ?? null;
    if (target) router.push({ pathname: `/account/${target.id}` as never, params: { name: target.name, type: target.type } } as never);
  };

  const onRefresh = () => {
    refreshAccounts();
    loadAllTransactions();
  };

  return (
    <DesktopShell onRefresh={onRefresh}>
      <View style={[styles.page, { backgroundColor: t.bg }]}>
        {masked ? (
          <View style={{ marginBottom: 12 }}>
            <PrivacyHint />
          </View>
        ) : null}

        <View style={styles.grid}>
          {/* Row 1: hero + cashflow */}
          <View style={[styles.hero, { backgroundColor: t.surface, borderColor: t.line }]}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: FMFonts.display,
                  fontSize: 20,
                  color: t.ink,
                  letterSpacing: -0.3,
                  lineHeight: 24,
                }}
              >
                {i18n.net_worth}
              </Text>
              <View style={styles.heroRow}>
                <Text
                  style={{
                    fontFamily: FMFonts.display,
                    fontSize: 56,
                    color: t.ink,
                    lineHeight: 58,
                    letterSpacing: -1,
                  }}
                >
                  {heroParts.sign}
                  {heroParts.integer}
                  <Text style={{ color: t.inkMuted }}>{heroParts.fraction}</Text>
                </Text>
                <Text
                  style={{
                    fontFamily: FMFonts.display,
                    fontSize: 26,
                    color: t.inkSoft,
                    marginLeft: 8,
                  }}
                >
                  €
                </Text>
              </View>

              <View style={styles.heroSplit}>
                <SplitItem label={i18n.total_assets} value={totalAssets} masked={masked} />
                <SplitItem label={i18n.total_liabilities} value={-totalLiabilities} masked={masked} />
                <SplitItem label="Cash on hand" value={cashBalance} masked={masked} />
              </View>
            </View>
          </View>

          <View style={styles.cashflowGrid}>
            <CashflowCard
              label={i18n.income_label}
              value={view.income}
              masked={masked}
              series={flow.income}
              days={flow.days}
            />
            <CashflowCard
              label={i18n.expenses_label}
              value={-view.expenses}
              masked={masked}
              series={flow.expenses}
              days={flow.days}
              negSpark
            />
            <CashflowCard
              label="Net"
              value={netCashflow}
              masked={masked}
              total
              series={flow.net}
              days={flow.days}
              zeroBaseline
            />
          </View>

          {/* Row 2: donut + midSide */}
          <View style={[styles.donutCard, { backgroundColor: t.surface, borderColor: t.line }]}>
            <View style={styles.donutHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: FMFonts.display, fontSize: 22, color: t.ink, letterSpacing: -0.3, lineHeight: 24 }}>
                  Where it went
                </Text>
                <Text style={{ fontFamily: FMFonts.sans, fontSize: 11, color: t.inkSoft, marginTop: 2 }}>
                  Categorized expenses
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Pressable
                  onPress={() => setBudgetModalVisible(true)}
                  style={({ pressed }) => [
                    styles.dateChip,
                    {
                      backgroundColor: t.accentSoft,
                      borderColor: t.accent,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: FMFonts.sansSemibold,
                      fontSize: 11,
                      color: t.accent,
                    }}
                  >
                    {i18n.budget}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={openDateModal}
                  style={({ pressed }) => [
                    styles.dateChip,
                    {
                      backgroundColor: t.surface,
                      borderColor: t.lineStrong,
                      flexDirection: "row",
                      alignItems: "center",
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <IconFilter size={11} color={t.inkSoft} />
                  <Text
                    style={{
                      fontFamily: FMFonts.sansMedium,
                      fontSize: 11,
                      color: t.inkSoft,
                      marginLeft: 6,
                    }}
                  >
                    {rangeLabel(filterDateFrom, filterDateTo)}
                  </Text>
                </Pressable>
              </View>
            </View>

            {showSelector ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectorRow}
                style={{ marginBottom: 14 }}
              >
                <ModeChip
                  label={i18n.total}
                  active={viewMode === "total"}
                  onPress={() => setViewMode("total")}
                />
                {monthlyBuckets.map((b) => {
                  const labelDate = new Date(b.year, b.month, 1);
                  const sameYear = monthlyBuckets.every((x) => x.year === b.year);
                  const label = labelDate.toLocaleDateString(locale, {
                    month: "short",
                    ...(sameYear ? {} : { year: "2-digit" }),
                  });
                  return (
                    <ModeChip
                      key={b.key}
                      label={label}
                      active={viewMode === b.key}
                      onPress={() => setViewMode(b.key)}
                    />
                  );
                })}
                <ModeChip
                  label={i18n.average}
                  active={viewMode === "avg"}
                  onPress={() => setViewMode("avg")}
                />
              </ScrollView>
            ) : null}

            {legendRows.length > 0 ? (
              <View style={styles.donutBody}>
                {slices.length > 0 ? (
                  <View style={{ position: "relative", width: 180, height: 180 }}>
                    <Donut slices={slices} size={180} thick={26} masked={masked} />
                    <View style={styles.donutCenter}>
                      <Label>{view.donutLabel}</Label>
                      <Text
                        style={{
                          fontFamily: FMFonts.monoSemibold,
                          fontSize: 18,
                          color: t.ink,
                          marginTop: 2,
                        }}
                      >
                        {formatEUR(totalExp, { masked })}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View
                  style={{
                    flex: 1,
                    marginLeft: slices.length > 0 ? 24 : 0,
                    gap: 6,
                  }}
                >
                  {legendRows.map((row) => {
                    const hasEstimate = row.estimate > 0;
                    const remaining = row.estimate - row.amount;
                    const over = hasEstimate && remaining < 0;
                    // With an estimate the bar is consumption of budget;
                    // otherwise it's share of total spend (legacy behavior).
                    const ratio = hasEstimate
                      ? row.estimate > 0
                        ? Math.min(1, row.amount / row.estimate)
                        : 0
                      : totalExp > 0
                        ? row.amount / totalExp
                        : 0;
                    const barColor = over ? t.neg : row.color;
                    return (
                      <Pressable
                        key={row.categoryId}
                        onPress={() => handleCategoryPress(row.categoryId)}
                        style={({ pressed }) => [
                          styles.legendRow,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 5,
                            backgroundColor: row.color,
                          }}
                        />
                        <Text
                          style={{
                            flex: 1,
                            marginLeft: 8,
                            fontFamily: FMFonts.sansMedium,
                            fontSize: 12,
                            color: t.ink,
                          }}
                          numberOfLines={1}
                        >
                          {row.name}
                        </Text>
                        <View
                          style={{
                            width: 80,
                            height: 4,
                            backgroundColor: t.surfaceAlt,
                            borderRadius: 2,
                            marginRight: 12,
                            overflow: "hidden",
                          }}
                        >
                          <View
                            style={{
                              width: `${ratio * 100}%` as `${number}%`,
                              height: "100%",
                              backgroundColor: barColor,
                              opacity: 0.7,
                            }}
                          />
                        </View>
                        <View style={{ width: 104, alignItems: "flex-end" }}>
                          <Balance
                            value={-row.amount}
                            masked={masked}
                            size={11.5}
                          />
                          {hasEstimate ? (
                            <Text
                              style={{
                                fontFamily: FMFonts.mono,
                                fontSize: 9.5,
                                marginTop: 2,
                                color: over ? t.neg : t.inkMuted,
                              }}
                              numberOfLines={1}
                            >
                              {masked
                                ? "··"
                                : `${formatEUR(Math.abs(remaining))} ${
                                    over ? i18n.over_budget : i18n.under_budget
                                  }`}
                            </Text>
                          ) : (
                            <Text
                              style={{
                                fontFamily: FMFonts.mono,
                                fontSize: 9.5,
                                marginTop: 2,
                                color: t.inkMuted,
                              }}
                            >
                              {masked ? "··" : `${Math.round(ratio * 100)}%`}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={{ paddingVertical: 36, alignItems: "center" }}>
                <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkMuted }}>
                  {statsLoading ? "Loading…" : "No categorized expenses for this range yet."}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.midSide}>
            {uncategorized.length > 0 ? (
              <View style={[styles.uncategorized, { backgroundColor: t.surface, borderColor: t.line }]}>
                <View style={[styles.uncategorizedIcon, { backgroundColor: t.warnSoft }]}>
                  <IconWarn size={15} color={t.warn} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13, color: t.ink }}>
                    {uncategorized.length} {i18n.uncategorized.toLowerCase()} · {formatEUR(uncategorizedAmount, { masked })}
                  </Text>
                  <Text style={{ fontFamily: FMFonts.sans, fontSize: 11.5, color: t.inkSoft, marginTop: 4, lineHeight: 17 }}>
                    These are excluded from totals and the chart. Categorize manually, or run AI auto-categorization.
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<IconAI size={11} />}
                      onPress={() => {
                        const target = accounts.find((a) => a.category === "Giro") ?? accounts[0];
                        if (target) router.push(`/account/${target.id}` as never);
                      }}
                    >
                      {i18n.auto_categorize}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => {
                        const target = accounts.find((a) => a.category === "Giro") ?? accounts[0];
                        if (target) router.push(`/account/${target.id}` as never);
                      }}
                    >
                      Review manually
                    </Button>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={[styles.recent, { backgroundColor: t.surface, borderColor: t.line }]}>
              <View style={styles.recentHeader}>
                <Label>Recent</Label>
                <Pressable
                  onPress={() => {
                    const target = accounts.find((a) => a.category === "Giro") ?? accounts[0];
                    if (target) router.push(`/account/${target.id}` as never);
                  }}
                >
                  <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.accent }}>View all</Text>
                </Pressable>
              </View>
              {recent.length === 0 ? (
                <Text style={{ fontFamily: FMFonts.sans, fontSize: 11.5, color: t.inkMuted, paddingVertical: 18 }}>
                  No recent transactions.
                </Text>
              ) : (
                recent.map((tx, i) => {
                  const catId = transactionCategoryMap[getStableTxId(tx)];
                  const cat = catId ? categories.find((c) => c.id === catId) : null;
                  const amount = getTransactionAmount(tx);
                  const title = pickTransactionTitle(tx);
                  const date = tx.booking_date || tx.value_date || "";
                  return (
                    <View
                      key={(tx.transaction_id ?? "") + i}
                      style={[
                        styles.recentRow,
                        i > 0 && { borderTopWidth: 1, borderTopColor: t.line },
                      ]}
                    >
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: cat ? cat.color : "transparent",
                          borderWidth: cat ? 0 : 1.5,
                          borderStyle: cat ? "solid" : "dashed",
                          borderColor: t.inkMuted,
                          marginRight: 10,
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontFamily: FMFonts.sansMedium, fontSize: 12, color: t.ink }}
                          numberOfLines={1}
                        >
                          {title}
                        </Text>
                        <Text style={{ fontFamily: FMFonts.sans, fontSize: 10, color: t.inkMuted, marginTop: 1 }}>
                          {formatDate(date)} ·{" "}
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
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Row 3: debts + accounts */}
          <DebtsSummaryCard
            masked={masked}
            onManage={() => router.push("/(tabs)/debts" as never)}
            style={styles.debtsCardOuter}
          />
          <View style={[styles.accountsStripHalf, { backgroundColor: t.surface, borderColor: t.line }]}>
            <View style={styles.accountsHeader}>
              <Label>{`Accounts · ${accounts.length}`}</Label>
              <Pressable onPress={() => router.push("/(tabs)/accounts" as never)}>
                <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.accent }}>Manage →</Text>
              </Pressable>
            </View>
            <View style={{ gap: 8, marginTop: 10 }}>
              {accounts.slice(0, 4).map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => router.push(`/account/${a.id}` as never)}
                  style={({ pressed }) => [
                    styles.accountRow,
                    { backgroundColor: t.surfaceAlt, borderColor: t.line, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: a.type === "connected" ? t.pos : t.inkMuted,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: FMFonts.sansMedium,
                      fontSize: 10,
                      color: t.inkMuted,
                      marginLeft: 8,
                      width: 70,
                    }}
                    numberOfLines={1}
                  >
                    {a.bankName || "Manual"}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: FMFonts.sansSemibold,
                      fontSize: 12,
                      color: t.ink,
                      marginLeft: 10,
                    }}
                    numberOfLines={1}
                  >
                    {a.name}
                  </Text>
                  <View style={{ alignItems: "flex-end" }}>
                    <Balance value={a.balance ?? 0} masked={masked} size={12} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
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
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
        i18n={i18n}
      />

      <CategoryBudgetModal
        visible={isBudgetModalVisible}
        onClose={() => setBudgetModalVisible(false)}
      />
    </DesktopShell>
  );
}

interface SplitItemProps {
  label: string;
  value: number;
  masked: boolean;
}

function SplitItem({ label, value, masked }: SplitItemProps) {
  return (
    <View style={{ marginRight: 28 }}>
      <Label>{label}</Label>
      <View style={{ marginTop: 4 }}>
        <Balance value={value} masked={masked} size={13} />
      </View>
    </View>
  );
}

interface CashflowCardProps {
  label: string;
  value: number;
  masked: boolean;
  total?: boolean;
  series: number[];
  days: string[];
  negSpark?: boolean;
  zeroBaseline?: boolean;
}

function CashflowCard({
  label,
  value,
  masked,
  total,
  series,
  days,
  negSpark,
  zeroBaseline,
}: CashflowCardProps) {
  const t = useFMTheme();
  return (
    <View style={[styles.cashflowCard, { backgroundColor: t.surface, borderColor: t.line }]}>
      <Text
        style={{
          fontFamily: FMFonts.display,
          fontSize: 18,
          color: t.ink,
          letterSpacing: -0.3,
          lineHeight: 22,
        }}
      >
        {label}
      </Text>
      <View style={{ marginTop: 8 }}>
        <Balance value={value} masked={masked} size={18} total={total} />
      </View>
      <View style={{ marginTop: 12 }}>
        <Spark
          data={series}
          labels={days}
          width={140}
          height={18}
          interactive
          neg={negSpark}
          zeroBaseline={zeroBaseline}
          formatValue={(v) => formatEUR(v, { masked })}
        />
      </View>
    </View>
  );
}

interface ModeChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function ModeChip({ label, active, onPress }: ModeChipProps) {
  const t = useFMTheme();
  const fg = active ? t.bg : t.inkSoft;
  const bg = active ? t.ink : t.surface;
  const border = active ? t.ink : t.lineStrong;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <View
        style={[
          styles.modeChip,
          { backgroundColor: bg, borderColor: border },
        ]}
      >
        <Text
          style={{
            fontFamily: FMFonts.sansMedium,
            fontSize: 11,
            color: fg,
            letterSpacing: -0.1,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function rangeLabel(from: string, to: string): string {
  if (!from || !to) return "All time";
  return `${from} → ${to}`;
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    flexGrow: 1,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
    gap: 16,
  } as unknown as ViewStyle,
  hero: {
    minWidth: 0,
    overflow: "hidden",
    paddingHorizontal: 30,
    paddingVertical: 28,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
  },
  heroSplit: {
    flexDirection: "row",
    marginTop: 14,
  },
  cashflowGrid: {
    minWidth: 0,
    overflow: "hidden",
    flexDirection: "row",
    gap: 8,
  },
  cashflowCard: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  donutCard: {
    minWidth: 0,
    overflow: "hidden",
    padding: 22,
    borderWidth: 1,
    borderRadius: 14,
  },
  donutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  donutBody: {
    flexDirection: "row",
    alignItems: "center",
  },
  donutCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  midSide: {
    minWidth: 0,
    overflow: "hidden",
    flexDirection: "column",
    gap: 12,
  },
  uncategorized: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  uncategorizedIcon: {
    width: 32,
    height: 32,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  recent: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
  },
  debtsCardOuter: {
    minWidth: 0,
    overflow: "hidden",
  },
  accountsStripHalf: {
    minWidth: 0,
    overflow: "hidden",
    padding: 22,
    borderWidth: 1,
    borderRadius: 14,
  },
  accountsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectorRow: {
    flexDirection: "row",
    gap: 6,
    paddingRight: 4,
  },
  modeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
});
