import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { formatAmount } from "../utils/financeHelpers";

interface TransactionStatsSummaryProps {
  income: number;
  expenses: number;
  isBalanceHidden: boolean;
  textColor: string;
  i18n: Record<string, string>;
  style?: any;
}

export function TransactionStatsSummary({
  income,
  expenses,
  isBalanceHidden,
  textColor,
  i18n,
  style,
}: TransactionStatsSummaryProps) {
  const net = income - expenses;
  const isMobile = Platform.OS !== "web";

  return (
    <View style={[styles.container, style]}>
      <View style={styles.statItem}>
        <Text style={[styles.statLabel, { color: textColor }]}>
          {i18n.income_label}
        </Text>
        <Text style={[styles.statValue, { color: "#2ecc71" }]}>
          {isBalanceHidden ? "*****" : formatAmount(income)}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: textColor + "20" }]} />

      <View style={styles.statItem}>
        <Text style={[styles.statLabel, { color: textColor }]}>
          {i18n.expenses_label}
        </Text>
        <Text style={[styles.statValue, { color: "#e74c3c" }]}>
          {isBalanceHidden ? "*****" : formatAmount(expenses)}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: textColor + "20" }]} />

      <View style={styles.statItem}>
        <Text style={[styles.statLabel, { color: textColor }]}>
          {i18n.net || "Net"}
        </Text>
        <Text
          style={[
            styles.statValue,
            { color: net >= 0 ? "#2ecc71" : "#e74c3c" },
          ]}
        >
          {isBalanceHidden ? "*****" : formatAmount(net)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Platform.OS === "web" ? 32 : 16,
    paddingVertical: 8,
  },
  statItem: {
    alignItems: "center",
    minWidth: Platform.OS === "web" ? 100 : 70,
  },
  statLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
    opacity: 0.6,
  },
  statValue: {
    fontSize: Platform.OS === "web" ? 16 : 14,
    fontWeight: "700",
  },
  divider: {
    width: 1,
    height: 20,
    borderRadius: 1,
  },
});
