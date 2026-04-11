import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PieChart } from "react-native-gifted-charts";
import type { CategoryBreakdownItem, PieDataItem } from "../hooks/useFinanceStats";
import { formatAmount } from "../app/utils/financeHelpers";

interface StatsOverviewProps {
  statsLoading: boolean;
  hasTransactions: boolean;
  totalIncome: number;
  totalExpenses: number;
  categoryBreakdown: CategoryBreakdownItem[];
  pieData: PieDataItem[];
  isBalanceHidden: boolean;
  backgroundColor: string;
  textColor: string;
  tintColor: string;
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
  backgroundColor,
  textColor,
  tintColor,
  i18n,
}: StatsOverviewProps) {
  return (
    <View
      style={[styles.statsCard, { backgroundColor: tintColor + "0A" }]}
    >
      {statsLoading ? (
        <View style={styles.statsLoading}>
          <ActivityIndicator size="large" color={tintColor} />
        </View>
      ) : !hasTransactions ? (
        <View style={styles.statsLoading}>
          <Text style={{ color: textColor, opacity: 0.5, fontSize: 14 }}>
            {i18n.pull_to_refresh}
          </Text>
        </View>
      ) : (
        <>
          {/* Pie + Income/Expenses row */}
          <View style={styles.chartRow}>
            {/* Pie Chart */}
            <View style={styles.pieContainer}>
              {pieData.length > 0 ? (
                <PieChart
                  data={pieData}
                  donut
                  radius={70}
                  innerRadius={40}
                  innerCircleColor={backgroundColor}
                  centerLabelComponent={() => (
                    <View style={styles.pieCenterLabel}>
                      <Text
                        style={[
                          styles.pieCenterAmount,
                          { color: textColor },
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
                    { borderColor: tintColor + "30" },
                  ]}
                >
                  <Text
                    style={{
                      color: textColor,
                      opacity: 0.4,
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
                <View style={styles.incExpHeader}>
                  <View
                    style={[
                      styles.incExpDot,
                      { backgroundColor: "#2ecc71" },
                    ]}
                  />
                  <Text
                    style={[
                      styles.incExpLabel,
                      { color: textColor, opacity: 0.7 },
                    ]}
                  >
                    {i18n.income_label}
                  </Text>
                </View>
                <Text style={[styles.incExpAmount, { color: "#2ecc71" }]}>
                  {isBalanceHidden ? "*****" : formatAmount(totalIncome)}
                </Text>
              </View>

              <View
                style={[
                  styles.incExpDivider,
                  { backgroundColor: textColor + "15" },
                ]}
              />

              <View style={styles.incExpItem}>
                <View style={styles.incExpHeader}>
                  <View
                    style={[
                      styles.incExpDot,
                      { backgroundColor: "#FF6B6B" },
                    ]}
                  />
                  <Text
                    style={[
                      styles.incExpLabel,
                      { color: textColor, opacity: 0.7 },
                    ]}
                  >
                    {i18n.expenses_label}
                  </Text>
                </View>
                <Text style={[styles.incExpAmount, { color: "#FF6B6B" }]}>
                  {isBalanceHidden
                    ? "*****"
                    : formatAmount(totalExpenses)}
                </Text>
              </View>
            </View>
          </View>

          {/* Category Legend */}
          {categoryBreakdown.length > 0 && (
            <View style={styles.legendContainer}>
              {categoryBreakdown.map((item) => (
                <View key={item.categoryId} style={styles.legendRow}>
                  <View style={styles.legendLeft}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text
                      style={[styles.legendName, { color: textColor }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.legendAmount,
                      { color: textColor, opacity: 0.8 },
                    ]}
                  >
                    {isBalanceHidden
                      ? "*****"
                      : formatAmount(item.amount)}
                  </Text>
                </View>
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
    borderRadius: 16,
    padding: 20,
  },
  statsLoading: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
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
    fontSize: 12,
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
    gap: 12,
  },
  incExpItem: {
    gap: 4,
  },
  incExpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  incExpDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  incExpLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  incExpAmount: {
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 18,
  },
  incExpDivider: {
    height: 1,
    borderRadius: 1,
  },
  legendContainer: {
    marginTop: 20,
    gap: 10,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendName: {
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: "600",
  },
});
