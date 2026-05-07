import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
import { DateFilterModal } from "@/src/shared/components/DateFilterModal";
import {
  Balance,
  Chip,
  Donut,
  IconChevR,
  IconCog,
  IconWarn,
  Label,
  PrivacyHint,
  formatEUR,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import { useDateFilter } from "@/src/shared/context/DateFilterContext";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { useCategories } from "@/src/features/transactions/context/CategoriesContext";
import {
  getStableTxId,
  getTransactionAmount,
} from "@/src/features/transactions/utils/transactions";
import { useFinanceData } from "../../hooks/useFinanceData";
import { useFinanceStats } from "../../hooks/useFinanceStats";

export function DashboardScreen() {
  const t = useFMTheme();
  const router = useRouter();
  const { isBalanceHidden, i18n, mainAccountId } = useSettings();
  const { categories, transactionCategoryMap } = useCategories();
  const { setSelectedCategoryId } = useDateFilter();

  const {
    allTransactions,
    statsLoading,
    filterDateFrom,
    filterDateTo,
    accounts,
    cashBalance,
    refreshAccounts,
    isRefreshing,
    loadAllTransactions,
    applyDateFilter,
  } = useFinanceData();

  const {
    totalAssets,
    totalLiabilities,
    totalIncome,
    totalExpenses,
    categoryBreakdown,
  } = useFinanceStats({
    allTransactions,
    accounts,
    cashBalance,
    categories,
    transactionCategoryMap,
  });

  const masked = isBalanceHidden;
  const netWorth = totalAssets - totalLiabilities;
  const netCashflow = totalIncome - totalExpenses;

  // Uncategorized count + amount over the active range — visible only when there are some.
  const uncategorized = allTransactions.filter((tx) => !transactionCategoryMap[getStableTxId(tx)]);
  const uncategorizedAmount = uncategorized.reduce(
    (s, tx) => s + Math.abs(getTransactionAmount(tx)),
    0,
  );

  const slices = categoryBreakdown.map((c) => ({
    id: c.categoryId,
    amount: c.amount,
    color: c.color,
  }));
  const totalExp = slices.reduce((s, x) => s + x.amount, 0);
  const top = slices.slice(0, 5);

  const [isDateModalVisible, setDateModalVisible] = useState(false);
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

  const onRefresh = () => {
    refreshAccounts();
    loadAllTransactions();
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    let target = mainAccountId ? accounts.find((a) => a.id === mainAccountId) : null;
    if (!target) target = accounts.find((a) => a.category === "Giro") ?? accounts[0] ?? null;
    if (target) {
      router.push({
        pathname: `/account/${target.id}` as never,
        params: { name: target.name, type: target.type },
      } as never);
    }
  };

  const heroParts = splitForHero(netWorth, masked);

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <MobileHeader
        title={i18n.overview_title}
        sub={i18n.overview_subtitle}
        right={
          <>
            <Chip onPress={openDateModal}>{rangeChipLabel(filterDateFrom, filterDateTo)}</Chip>
            <Pressable onPress={() => router.push("/settings" as never)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}>
              <IconCog size={18} color={t.inkSoft} />
            </Pressable>
          </>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefreshing || statsLoading} onRefresh={onRefresh} tintColor={t.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {masked ? (
          <View style={{ marginBottom: 10 }}>
            <PrivacyHint />
          </View>
        ) : null}

        {/* Net worth hero card */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Label>{i18n.net_worth}</Label>
          <View style={styles.heroRow}>
            <Text
              style={{
                fontFamily: FMFonts.display,
                fontSize: 38,
                color: t.ink,
                lineHeight: 40,
                letterSpacing: -0.6,
              }}
            >
              {heroParts.sign}
              {heroParts.integer}
              <Text style={{ color: t.inkMuted }}>{heroParts.fraction}</Text>
            </Text>
            <Text
              style={{
                fontFamily: FMFonts.display,
                fontSize: 20,
                color: t.inkSoft,
                marginLeft: 4,
              }}
            >
              €
            </Text>
          </View>
          <View style={styles.heroSplit}>
            <View style={{ flex: 1 }}>
              <Label>{i18n.total_assets}</Label>
              <View style={{ marginTop: 4 }}>
                <Balance value={totalAssets} masked={masked} size={13} />
              </View>
            </View>
            <View style={{ width: 1, backgroundColor: t.line }} />
            <View style={{ flex: 1, paddingLeft: 16 }}>
              <Label>{i18n.total_liabilities}</Label>
              <View style={{ marginTop: 4 }}>
                <Balance value={-totalLiabilities} masked={masked} size={13} />
              </View>
            </View>
          </View>
        </View>

        {/* Cashflow row */}
        <View style={styles.cashflowRow}>
          <CashflowCard label={i18n.income_label} value={totalIncome} masked={masked} />
          <CashflowCard label={i18n.expenses_label} value={-totalExpenses} masked={masked} />
          <CashflowCard label="Net" value={netCashflow} masked={masked} total />
        </View>

        {/* Donut */}
        {slices.length > 0 ? (
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line, marginTop: 12 }]}>
            <View style={styles.cardHeader}>
              <Label>Spending by category</Label>
              <Text style={{ fontFamily: FMFonts.sans, fontSize: 10, color: t.inkMuted }}>
                {rangeChipLabel(filterDateFrom, filterDateTo)}
              </Text>
            </View>
            <View style={[styles.donutRow, { marginTop: 8 }]}>
              <Donut slices={slices} size={108} thick={16} masked={masked} />
              <View style={{ flex: 1, marginLeft: 14, gap: 5 }}>
                {top.map((s) => {
                  const cat = categoryBreakdown.find((c) => c.categoryId === s.id);
                  if (!cat) return null;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => handleCategoryPress(s.id)}
                      style={({ pressed }) => [styles.legendRow, pressed && { opacity: 0.7 }]}
                    >
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: s.color }} />
                      <Text
                        style={{
                          flex: 1,
                          marginLeft: 6,
                          fontFamily: FMFonts.sans,
                          fontSize: 11,
                          color: t.inkSoft,
                        }}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: FMFonts.monoMedium,
                          fontSize: 10.5,
                          color: t.ink,
                        }}
                      >
                        {masked ? "··" : `${Math.round((s.amount / totalExp) * 100)}%`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}

        {/* Uncategorized notice */}
        {uncategorized.length > 0 ? (
          <View
            style={[
              styles.uncategorized,
              { backgroundColor: t.warnSoft, borderColor: t.line },
            ]}
          >
            <View style={{ marginTop: 1 }}>
              <IconWarn size={14} color={t.warn} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 12, color: t.ink }}>
                {uncategorized.length} {i18n.uncategorized.toLowerCase()}
              </Text>
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  fontSize: 11,
                  color: t.inkSoft,
                  marginTop: 2,
                  lineHeight: 15,
                }}
              >
                {formatEUR(uncategorizedAmount, { masked })} excluded from the totals above.
              </Text>
            </View>
            <Pressable
              onPress={() => {
                const target = accounts.find((a) => a.category === "Giro") ?? accounts[0];
                if (target) router.push(`/account/${target.id}` as never);
              }}
              style={({ pressed }) => [
                styles.uncategorizedBtn,
                { backgroundColor: t.surface, borderColor: t.lineStrong, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 11, color: t.ink }}>
                {i18n.auto_categorize}
              </Text>
              <View style={{ marginLeft: 4 }}>
                <IconChevR size={11} color={t.inkSoft} />
              </View>
            </Pressable>
          </View>
        ) : null}

        <Text style={[styles.foot, { color: t.inkMuted }]}>
          {masked ? i18n.balances_hidden : i18n.pull_to_refresh}
        </Text>
      </ScrollView>

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
    </View>
  );
}

interface CashflowCardProps {
  label: string;
  value: number;
  masked: boolean;
  total?: boolean;
}

function CashflowCard({ label, value, masked, total }: CashflowCardProps) {
  const t = useFMTheme();
  return (
    <View style={[styles.cashflowCard, { backgroundColor: t.surface, borderColor: t.line }]}>
      <Label>{label}</Label>
      <View style={{ marginTop: 6 }}>
        <Balance value={value} masked={masked} size={13} total={total} />
      </View>
    </View>
  );
}

function rangeChipLabel(from: string, to: string): string {
  if (!from || !to) return "All time";
  // Quick preset detection — fall through to from→to abbreviation otherwise.
  return `${from} → ${to}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 96, // Extra space for floating tab bar.
  },
  card: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
  },
  heroSplit: {
    flexDirection: "row",
    marginTop: 14,
    gap: 16,
  },
  cashflowRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 0,
  },
  cashflowCard: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  uncategorized: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
  },
  uncategorizedBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  foot: {
    textAlign: "center",
    fontFamily: FMFonts.sans,
    fontSize: 11,
    marginTop: 14,
  },
});
