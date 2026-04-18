import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PieChart } from "react-native-gifted-charts";
import type { CategoryBreakdownItem, PieDataItem } from "../hooks/useFinanceStats";
import { formatAmount } from "../../../shared/utils/financeHelpers";
import { Colors } from "../../../constants/theme";
import { useColorScheme } from "../../../shared/hooks/use-color-scheme";

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
  i18n: {
    pull_to_refresh: string;
    income_label: string;
    expenses_label: string;
  };
}

export function StatsOverview({
  statsLoading,
  hasTransactions,
  totalIncome,
  totalExpenses,
  categoryBreakdown,
  pieData,
  isBalanceHidden,
  onCategoryPress,
  i18n,
}: StatsOverviewProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const enhancedPieData = pieData.map((item, index) => ({
    ...item,
    onPress: () => {
      const breakdownItem = categoryBreakdown[index];
      if (breakdownItem && onCategoryPress) {
        onCategoryPress(breakdownItem.categoryId);
      }
    },
  }));

  return (
    <View
      style={[styles.statsCard, { backgroundColor: theme.surface }]}
    >
      {statsLoading ? (
        <View style={styles.statsLoading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : !hasTransactions ? (
        <View style={styles.statsLoading}>
          <Text style={{ color: theme.textSecondary, fontSize: 15 }}>
            {i18n.pull_to_refresh}
          </Text>
        </View>
      ) : (
        <>
          {/* Pie + Income/Expenses row */}
          <View style={styles.chartRow}>
            {/* Pie Chart */}
            <View style={styles.pieContainer}>
              {enhancedPieData.length > 0 ? (
                <PieChart
                  data={enhancedPieData}
                  donut
                  radius={70}
                  innerRadius={45}
                  innerCircleColor={theme.surface}
                  centerLabelComponent={() => (
                    <View style={styles.pieCenterLabel}>
                      <Text
                        style={[
                          styles.pieCenterAmount,
                          { color: theme.text },
                        ]}
                      >
                        {isBalanceHidden
                          ? "***"
                          : formatAmount(totalExpenses)}
                      </Text>
                    </View>
                  )}
                />
              ) : (
                <View
                  style={[
                    styles.emptyPie,
                    { borderColor: theme.border },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 12,
                    }}
                  >
                    —
                  </Text>
                </View>
              )}
            </View>

            {/* Income / Expenses */}
            <View style={styles.incomeExpenseCol}>
              <View style={styles.incExpItem}>
                <Text
                  style={[
                    styles.incExpLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  {i18n.income_label}
                </Text>
                <Text style={[styles.incExpAmount, { color: theme.income }]}>
                  {isBalanceHidden ? "*****" : "+" + formatAmount(totalIncome)}
                </Text>
              </View>

              <View
                style={[
                  styles.incExpDivider,
                  { backgroundColor: theme.border },
                ]}
              />

              <View style={styles.incExpItem}>
                <Text
                  style={[
                    styles.incExpLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  {i18n.expenses_label}
                </Text>
                <Text style={[styles.incExpAmount, { color: theme.expense }]}>
                  {isBalanceHidden
                    ? "*****"
                    : "-" + formatAmount(totalExpenses)}
                </Text>
              </View>
            </View>
          </View>

          {/* Category Legend */}
          {categoryBreakdown.length > 0 && (
            <View style={styles.legendContainer}>
              {categoryBreakdown.map((item) => (
                <TouchableOpacity 
                  key={item.categoryId} 
                  style={styles.legendRow}
                  onPress={() => onCategoryPress?.(item.categoryId)}
                  activeOpacity={0.6}
                >
                  <View style={styles.legendLeft}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text
                      style={[styles.legendName, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.legendAmount,
                      { color: theme.text },
                    ]}
                  >
                    {isBalanceHidden
                      ? "*****"
                      : formatAmount(item.amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: "#8E1E5E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 24,
  },
  statsLoading: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  pieContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  pieCenterLabel: {
    alignItems: "center",
    justifyContent: "center",
  },
  pieCenterAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyPie: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  incomeExpenseCol: {
    flex: 1,
    gap: 16,
  },
  incExpItem: {
    gap: 4,
  },
  incExpLabel: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  incExpAmount: {
    fontSize: 22,
    fontWeight: "700",
  },
  incExpDivider: {
    height: 1,
    borderRadius: 1,
  },
  legendContainer: {
    marginTop: 32,
    gap: 16,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 16,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendName: {
    fontSize: 15,
    fontWeight: "500",
    flexShrink: 1,
  },
  legendAmount: {
    fontSize: 15,
    fontWeight: "600",
  },
});
