import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { MobileShell } from "@/src/shared/components/MobileShell";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
import { DateFilterModal } from "@/src/shared/components/DateFilterModal";
import {
  Balance,
  Card,
  Chip,
  IconButton,
  IconCalendar,
  IconCog,
  IconSliders,
  PrivacyHint,
  Spark,
  formatEUR,
  useFMTheme,
} from "@/src/shared/design";
import { CategoryBudgetModal } from "@/src/features/transactions/components/CategoryBudgetModal";
import { DebtsSummaryCard } from "@/src/features/debts/components/mobile/DebtsSummaryCard";
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
    isRefreshing,
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
    openSettings,
    onRefresh,
  } = useDashboardModel();

  return (
    <MobileShell
      headerOverride={
        <MobileHeader
          title={i18n.overview_title}
          right={
            <IconButton icon={<IconCog size={20} />} label={i18n.settings_title} onPress={openSettings} />
          }
        />
      }
      onRefresh={onRefresh}
      refreshing={isRefreshing || statsLoading}
      contentStyle={{ gap: 12 }}
    >
      <Chip onPress={openDateModal} icon={<IconCalendar size={16} />} accessibilityLabel={i18n.filter_by_date}>
        {rangeText}
      </Chip>
      <RangeCoverageHint />

      {masked ? <PrivacyHint /> : null}

      {/* Net-worth hero */}
      <Card padding={20}>
        <NetWorthHero i18n={i18n} heroParts={heroParts} size={36}>
          <View style={{ marginTop: 12 }}>
            <SplitItem label={i18n.total_assets} value={totalAssets} masked={masked} />
            <SplitItem label={i18n.total_liabilities} value={-totalLiabilities} masked={masked} />
            <SplitItem label={i18n.cash_on_hand} value={cashBalance} masked={masked} />
          </View>
        </NetWorthHero>
      </Card>

      {/* Cash flow */}
      <Card padding={0} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
        <CashflowRow label={i18n.income_label} value={view.income} masked={masked} series={flow.income} days={flow.days} />
        <CashflowRow
          label={i18n.expenses_label}
          value={-view.expenses}
          masked={masked}
          series={flow.expenses}
          days={flow.days}
          negSpark
        />
        <CashflowRow
          label={i18n.net}
          value={netCashflow}
          masked={masked}
          total
          series={flow.net}
          days={flow.days}
          zeroBaseline
        />
      </Card>

      {/* Where it went */}
      <Card padding={16}>
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
          stacked
        />
      </Card>

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
      />

      <DebtsSummaryCard masked={masked} onManage={openDebts} />

      <AccountsCard
        i18n={i18n}
        accounts={accounts}
        masked={masked}
        limit={5}
        onManage={openAccounts}
        onOpen={openAccount}
      />

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
    </MobileShell>
  );
}

// One row per figure (label left, value right) — three columns don't fit a phone.
function SplitItem({ label, value, masked }: { label: string; value: number; masked: boolean }) {
  const t = useFMTheme();
  return (
    <View style={styles.splitRow}>
      <Text style={{ flex: 1, fontFamily: FMFonts.sans, fontSize: 14, color: t.inkSoft }} numberOfLines={1}>
        {label}
      </Text>
      <Balance value={value} masked={masked} size={15} />
    </View>
  );
}

interface CashflowRowProps {
  label: string;
  value: number;
  masked: boolean;
  total?: boolean;
  series: number[];
  days: string[];
  negSpark?: boolean;
  zeroBaseline?: boolean;
}

// Label · spark · amount, as list rows inside one card.
function CashflowRow({ label, value, masked, total, series, days, negSpark, zeroBaseline }: CashflowRowProps) {
  const t = useFMTheme();
  return (
    <View style={styles.cashflowRow}>
      <Text style={{ width: 96, fontFamily: FMFonts.sans, fontSize: 16, color: t.ink }} numberOfLines={1}>
        {label}
      </Text>
      <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>
        <Spark
          data={series}
          labels={days}
          width={84}
          height={20}
          interactive
          neg={negSpark}
          zeroBaseline={zeroBaseline}
          formatValue={(v) => formatEUR(v, { masked })}
        />
      </View>
      <Balance value={value} masked={masked} size={16} total={total} />
    </View>
  );
}

const styles = StyleSheet.create({
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 36,
  },
  cashflowRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
  },
});
