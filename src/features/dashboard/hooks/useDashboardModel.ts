import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { useCategories } from "@/src/features/transactions/context/CategoriesContext";
import { useTransactionLinks } from "@/src/features/transactions/context/TransactionLinksContext";
import {
  getStableTxId,
  getTransactionAmount,
} from "@/src/features/transactions/utils/transactions";
import { useDateFilter } from "@/src/shared/context/DateFilterContext";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { splitForHero } from "@/src/shared/design";
import { localeFor } from "@/src/shared/utils/date";
import { buildFlowSeries } from "../utils/flowSeries";
import { useCategoryBudgets } from "./useCategoryBudgets";
import { useFinanceData } from "./useFinanceData";
import { useFinanceStats } from "./useFinanceStats";

/** "total" | "avg" | "<YYYY-MM>" — what the "Where it went" panel shows. */
export type DashboardViewMode = string;

const RECENT_COUNT = 5;

/**
 * Everything the desktop and mobile dashboards compute in common: totals,
 * sparkline series, the month/avg/total view switch, budget legend rows,
 * the uncategorized banner, recent transactions, the date-filter modal state
 * and navigation. The two screens only differ in layout.
 */
export function useDashboardModel() {
  const router = useRouter();
  const { isBalanceHidden, i18n, mainAccountId, language } = useSettings();
  const { categories, transactionCategoryMap } = useCategories();
  const { getEstimate, budgetableCategories } = useCategoryBudgets();
  const { setSelectedCategoryId } = useDateFilter();
  const { linkIndex } = useTransactionLinks();

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
    monthlyBuckets,
  } = useFinanceStats({
    allTransactions,
    accounts,
    categories,
    transactionCategoryMap,
    filterDateFrom,
    filterDateTo,
    linkIndex,
  });

  const masked = isBalanceHidden;
  const netWorth = totalAssets - totalLiabilities;
  const heroParts = splitForHero(netWorth, masked);
  const locale = localeFor(language);

  // Real trailing-30-day cumulative income / expense / net for the sparklines.
  const flow = useMemo(
    () =>
      buildFlowSeries(
        allTransactions,
        transactionCategoryMap,
        categories,
        filterDateFrom,
        filterDateTo,
        linkIndex,
      ),
    [allTransactions, transactionCategoryMap, categories, filterDateFrom, filterDateTo, linkIndex],
  );

  const rangeText =
    filterDateFrom && filterDateTo
      ? `${filterDateFrom} → ${filterDateTo}`
      : i18n.range_all_time;

  const [viewMode, setViewMode] = useState<DashboardViewMode>("total");
  const showSelector = monthlyBuckets.length > 1;

  const view = useMemo(() => {
    const n = monthlyBuckets.length;
    if (showSelector && viewMode === "avg" && n > 0) {
      return {
        income: totalIncome / n,
        expenses: totalExpenses / n,
        breakdown: categoryBreakdown.map((b) => ({ ...b, amount: b.amount / n })),
        donutLabel: i18n.avg_per_month,
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
        };
      }
    }
    return {
      income: totalIncome,
      expenses: totalExpenses,
      breakdown: categoryBreakdown,
      donutLabel: i18n.total,
    };
  }, [viewMode, showSelector, monthlyBuckets, totalIncome, totalExpenses, categoryBreakdown, locale, i18n]);

  // Short chip label per month bucket; adds the year only when the range
  // spans more than one year.
  const monthChips = useMemo(() => {
    const sameYear = monthlyBuckets.every((x) => x.year === monthlyBuckets[0]?.year);
    return monthlyBuckets.map((b) => ({
      key: b.key,
      label: new Date(b.year, b.month, 1).toLocaleDateString(locale, {
        month: "short",
        ...(sameYear ? {} : { year: "2-digit" }),
      }),
    }));
  }, [monthlyBuckets, locale]);

  const netCashflow = view.income - view.expenses;

  const slices = view.breakdown.map((c) => ({
    id: c.categoryId,
    amount: c.amount,
    color: c.color,
  }));
  const totalExp = slices.reduce((s, x) => s + x.amount, 0);

  // The estimate is per-month; scale it to the period the panel shows so
  // actual-vs-estimate is apples-to-apples (1× for a single month / avg,
  // ×bucket-count for the total-over-range view).
  const periodMonths =
    showSelector && viewMode === "total" ? Math.max(1, monthlyBuckets.length) : 1;

  // Legend = spent categories ∪ categories with an estimate but no spend yet
  // (the latter would otherwise be invisible since breakdown is tx-derived).
  const legendRows = useMemo(() => {
    const rows = view.breakdown.map((b) => {
      const estimate = getEstimate(b.categoryId) * periodMonths;
      return {
        categoryId: b.categoryId,
        name: b.name,
        color: b.color,
        amount: b.amount,
        estimate,
      };
    });
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
    // With an estimate the bar is consumption of budget; otherwise it's the
    // share of total spend.
    return rows.map((row) => {
      const hasEstimate = row.estimate > 0;
      const remaining = row.estimate - row.amount;
      const ratio = hasEstimate
        ? Math.min(1, row.amount / row.estimate)
        : totalExp > 0
          ? row.amount / totalExp
          : 0;
      return { ...row, hasEstimate, remaining, over: hasEstimate && remaining < 0, ratio };
    });
  }, [view.breakdown, getEstimate, periodMonths, budgetableCategories, totalExp]);

  const uncategorized = useMemo(
    () => allTransactions.filter((tx) => !transactionCategoryMap[getStableTxId(tx)]),
    [allTransactions, transactionCategoryMap],
  );
  const uncategorizedAmount = uncategorized.reduce(
    (s, tx) => s + Math.abs(getTransactionAmount(tx)),
    0,
  );

  const recent = allTransactions.slice(0, RECENT_COUNT);
  const categoryFor = (txId: string) => {
    const catId = transactionCategoryMap[txId];
    return catId ? categories.find((c) => c.id === catId) ?? null : null;
  };

  // ── Date filter modal ──
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

  // ── Navigation ──
  // The account whose transactions the dashboard analyses (same selection
  // rule as useFinanceData): main account → first Giro → first account.
  const dashboardAccount =
    (mainAccountId ? accounts.find((a) => a.id === mainAccountId) : undefined) ??
    accounts.find((a) => a.category === "Giro") ??
    accounts[0];

  const openDashboardAccount = () => {
    if (!dashboardAccount) return;
    router.push({
      pathname: `/account/${dashboardAccount.id}` as never,
      params: { name: dashboardAccount.name, type: dashboardAccount.type },
    } as never);
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    openDashboardAccount();
  };

  const openAccount = (id: string) => router.push(`/account/${id}` as never);
  const openDebts = () => router.push("/(tabs)/debts" as never);
  const openAccounts = () => router.push("/(tabs)/accounts" as never);
  const openSettings = () => router.push("/settings" as never);

  const onRefresh = () => {
    refreshAccounts();
    loadAllTransactions();
  };

  return {
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
    // modals
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
    // navigation
    handleCategoryPress,
    openDashboardAccount,
    openAccount,
    openDebts,
    openAccounts,
    openSettings,
    onRefresh,
  };
}
