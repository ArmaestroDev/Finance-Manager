import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import type { CategoryBreakdownItem, PieDataItem } from "../../hooks/useFinanceStats";
import { formatAmount } from "../../../../shared/utils/financeHelpers";
import { Colors } from "../../../../constants/theme";
import { useColorScheme } from "../../../../shared/hooks/use-color-scheme";

interface StatsOverviewProps {
  statsLoading: boolean;
  hasTransactions: boolean;
  totalIncome: number;
  totalExpenses: number;
  categoryBreakdown: CategoryBreakdownItem[];
  pieData: PieDataItem[];
  isBalanceHidden: boolean;
  backgroundColor?: string;
  textColor?: string;
  tintColor?: string;
  onCategoryPress?: (categoryId: string) => void;
  i18n: { pull_to_refresh: string; income_label: string; expenses_label: string };
}

export function StatsOverview({ statsLoading, hasTransactions, totalIncome, totalExpenses, categoryBreakdown, pieData, isBalanceHidden, onCategoryPress, i18n }: StatsOverviewProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const enhancedPieData = pieData.map((item, index) => ({
    ...item,
    onPress: () => {
      const breakdownItem = categoryBreakdown[index];
      if (breakdownItem && onCategoryPress) onCategoryPress(breakdownItem.categoryId);
    },
  }));

  if (statsLoading) {
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, height: 200 }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!hasTransactions) {
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, height: 200, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: theme.textSecondary }}>{i18n.pull_to_refresh}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      {/* Desktop: three-column layout */}
      <View style={styles.row}>
        {/* Left: Pie chart */}
        <View style={styles.pieCol}>
          {enhancedPieData.length > 0 ? (
            <PieChart
              data={enhancedPieData}
              donut
              radius={90}
              innerRadius={58}
              innerCircleColor={theme.surface}
              centerLabelComponent={() => (
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 2 }}>Expenses</Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>
                    {isBalanceHidden ? "***" : formatAmount(totalExpenses)}
                  </Text>
                </View>
              )}
            />
          ) : (
            <View style={[styles.emptyPie, { borderColor: theme.border }]}>
              <Text style={{ color: theme.textSecondary }}>—</Text>
            </View>
          )}
        </View>

        {/* Center: Income / Expenses */}
        <View style={styles.incExpCol}>
          <View style={styles.incExpItem}>
            <Text style={[styles.incExpLabel, { color: theme.textSecondary }]}>{i18n.income_label}</Text>
            <Text style={[styles.incExpAmount, { color: theme.income }]}>
              {isBalanceHidden ? "*****" : "+" + formatAmount(totalIncome)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.incExpItem}>
            <Text style={[styles.incExpLabel, { color: theme.textSecondary }]}>{i18n.expenses_label}</Text>
            <Text style={[styles.incExpAmount, { color: theme.expense }]}>
              {isBalanceHidden ? "*****" : "-" + formatAmount(totalExpenses)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.incExpItem}>
            <Text style={[styles.incExpLabel, { color: theme.textSecondary }]}>Net</Text>
            <Text style={[styles.incExpAmount, { color: totalIncome - totalExpenses >= 0 ? theme.income : theme.expense }]}>
              {isBalanceHidden ? "*****" : (totalIncome - totalExpenses >= 0 ? "+" : "") + formatAmount(totalIncome - totalExpenses)}
            </Text>
          </View>
        </View>

        {/* Right: Category legend */}
        {categoryBreakdown.length > 0 && (
          <View style={styles.legendCol}>
            <Text style={[styles.legendTitle, { color: theme.textSecondary }]}>By Category</Text>
            {categoryBreakdown.map((item) => (
              <TouchableOpacity key={item.categoryId} style={styles.legendRow} onPress={() => onCategoryPress?.(item.categoryId)} activeOpacity={0.6}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={[styles.legendName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.legendAmount, { color: theme.text }]}>
                  {isBalanceHidden ? "*****" : formatAmount(item.amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: "row", gap: 32, alignItems: "flex-start" },
  pieCol: { alignItems: "center", justifyContent: "center" },
  emptyPie: { width: 180, height: 180, borderRadius: 90, borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  incExpCol: { width: 200, gap: 16 },
  incExpItem: { gap: 4 },
  incExpLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  incExpAmount: { fontSize: 24, fontWeight: "800" },
  divider: { height: 1, borderRadius: 1 },
  legendCol: { flex: 1, gap: 14 },
  legendTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: 14, fontWeight: "500" },
  legendAmount: { fontSize: 14, fontWeight: "600" },
});
