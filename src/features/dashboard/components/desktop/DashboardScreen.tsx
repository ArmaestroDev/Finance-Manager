import React from "react";
import { StyleSheet, Text, useWindowDimensions, View, ViewStyle } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import { DateFilterModal } from "@/src/shared/components/DateFilterModal";
import {
  Balance,
  Card,
  Chip,
  IconCalendar,
  IconSliders,
  Label,
  PrivacyHint,
  Spark,
  formatEUR,
  useFMTheme,
} from "@/src/shared/design";
import { CategoryBudgetModal } from "@/src/features/transactions/components/CategoryBudgetModal";
import { DebtsSummaryCard } from "@/src/features/debts/components/desktop/DebtsSummaryCard";
import { RangeCoverageHint } from "@/src/features/transactions/components/RangeCoverageHint";
import { useDashboardModel } from "../../hooks/useDashboardModel";
import {
  AccountsCard,
  CardHeader,
  CategoryBreakdown,
  ModeChips,
  NetWorthHero,
  RecentCard,
  UncategorizedCard,
} from "../DashboardParts";

export function DashboardScreen() {
  const {
    i18n,
    masked,
    accounts,
    cashBalance,
    statsLoading,
    totalAssets,
    totalLiabilities,
    heroParts,
    flow,
    rangeText,
    viewMode,
    setViewMode,
    showSelector,
    monthChips,
    view,
    netCashflow,
    slices,
    totalExp,
    legendRows,
    uncategorized,
    uncategorizedAmount,
    recent,
    categoryFor,
    isDateModalVisible,
    setDateModalVisible,
    isBudgetModalVisible,
    setBudgetModalVisible,
    tempFrom,
    setTempFrom,
    tempTo,
    setTempTo,
    openDateModal,
    handleApplyDateFilter,
    handleCategoryPress,
    openDashboardAccount,
    openAccount,
    openDebts,
    openAccounts,
    onRefresh,
  } = useDashboardModel();

  // Two-column grid only when the side column can fit three cash-flow cards
  // side by side; below that, stack everything in one column.
  const { width: winW } = useWindowDimensions();
  const singleColumn = winW < 1280;

  return (
    <DesktopShell
      title={i18n.overview_title}
      onRefresh={onRefresh}
      actions={
        <Chip onPress={openDateModal} icon={<IconCalendar size={16} />} accessibilityLabel={i18n.filter_by_date}>
          {rangeText}
        </Chip>
      }
    >
      <View style={styles.page}>
        <RangeCoverageHint style={{ marginBottom: 12 }} />
        {masked ? (
          <View style={{ marginBottom: 16 }}>
            <PrivacyHint />
          </View>
        ) : null}

        <View style={[styles.grid, singleColumn && styles.gridSingle]}>
          {/* Row 1: hero + cash flow */}
          <Card padding={24} style={styles.cell}>
            <NetWorthHero i18n={i18n} heroParts={heroParts} size={45}>
              <View style={styles.heroSplit}>
                <SplitItem label={i18n.total_assets} value={totalAssets} masked={masked} />
                <SplitItem label={i18n.total_liabilities} value={-totalLiabilities} masked={masked} />
                <SplitItem label={i18n.cash_on_hand} value={cashBalance} masked={masked} />
              </View>
            </NetWorthHero>
          </Card>

          <View style={[styles.cell, styles.cashflowGrid]}>
            <CashflowCard label={i18n.income_label} value={view.income} masked={masked} series={flow.income} days={flow.days} />
            <CashflowCard
              label={i18n.expenses_label}
              value={-view.expenses}
              masked={masked}
              series={flow.expenses}
              days={flow.days}
              negSpark
            />
            <CashflowCard
              label={i18n.net}
              value={netCashflow}
              masked={masked}
              total
              series={flow.net}
              days={flow.days}
              zeroBaseline
            />
          </View>

          {/* Row 2: category breakdown + side column */}
          <Card padding={24} style={styles.cell}>
            <CardHeader
              title={i18n.dash_where_it_went}
              right={
                <Chip onPress={() => setBudgetModalVisible(true)} icon={<IconSliders size={16} />}>
                  {i18n.budget}
                </Chip>
              }
            />
            {showSelector ? (
              <ModeChips i18n={i18n} viewMode={viewMode} setViewMode={setViewMode} monthChips={monthChips} />
            ) : null}
            <CategoryBreakdown
              i18n={i18n}
              masked={masked}
              slices={slices}
              totalExp={totalExp}
              donutLabel={view.donutLabel}
              legendRows={legendRows}
              statsLoading={statsLoading}
              onCategoryPress={handleCategoryPress}
            />
          </Card>

          <View style={[styles.cell, styles.midSide]}>
            {uncategorized.length > 0 ? (
              <UncategorizedCard
                i18n={i18n}
                count={uncategorized.length}
                amount={uncategorizedAmount}
                masked={masked}
                onPress={openDashboardAccount}
              />
            ) : null}
            <RecentCard
              i18n={i18n}
              recent={recent}
              masked={masked}
              categoryFor={categoryFor}
              onViewAll={openDashboardAccount}
              style={{ flex: 1 }}
            />
          </View>

          {/* Row 3: debts + accounts */}
          <DebtsSummaryCard masked={masked} onManage={openDebts} style={styles.cell} />
          <AccountsCard
            i18n={i18n}
            accounts={accounts}
            masked={masked}
            limit={4}
            onManage={openAccounts}
            onOpen={openAccount}
            style={styles.cell}
          />
        </View>
      </View>

      <DateFilterModal
        visible={isDateModalVisible}
        title={i18n.filter_by_date}
        tempFrom={tempFrom}
        tempTo={tempTo}
        onTempFromChange={setTempFrom}
        onTempToChange={setTempTo}
        onApply={handleApplyDateFilter}
        onCancel={() => setDateModalVisible(false)}
      />

      <CategoryBudgetModal visible={isBudgetModalVisible} onClose={() => setBudgetModalVisible(false)} />
    </DesktopShell>
  );
}

function SplitItem({ label, value, masked }: { label: string; value: number; masked: boolean }) {
  return (
    <View style={{ marginRight: 32 }}>
      <Label>{label}</Label>
      <View style={{ marginTop: 4 }}>
        <Balance value={value} masked={masked} size={16} />
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

function CashflowCard({ label, value, masked, total, series, days, negSpark, zeroBaseline }: CashflowCardProps) {
  const t = useFMTheme();
  return (
    <Card style={styles.cashflowCard}>
      <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 14, lineHeight: 20, color: t.inkSoft }} numberOfLines={1}>
        {label}
      </Text>
      <View style={{ marginTop: 4 }}>
        <Balance value={value} masked={masked} size={22} total={total} />
      </View>
      <View style={{ marginTop: 16 }}>
        <Spark
          data={series}
          labels={days}
          width={140}
          height={24}
          interactive
          neg={negSpark}
          zeroBaseline={zeroBaseline}
          formatValue={(v) => formatEUR(v, { masked })}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    flexGrow: 1,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
    gap: 16,
  } as unknown as ViewStyle,
  gridSingle: {
    gridTemplateColumns: "minmax(0, 1fr)",
  } as unknown as ViewStyle,
  cell: {
    minWidth: 0,
    overflow: "hidden",
  },
  heroSplit: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
    marginTop: 20,
  },
  cashflowGrid: {
    flexDirection: "row",
    gap: 16,
  },
  cashflowCard: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },
  midSide: {
    flexDirection: "column",
    gap: 16,
  },
});
