import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  getStableTxId,
  getTransactionAmount,
} from "../../../features/transactions/utils/transactions";
import type { Transaction } from "../../../services/enableBanking";
import { formatAmount } from "../../utils/financeHelpers";

interface TransactionCategory {
  id: string;
  name: string;
  color: string;
}

interface CategoryFilterBarProps {
  categories: TransactionCategory[];
  transactions: Transaction[];
  getCategoryForTransaction: (txId: string) => TransactionCategory | null;
  selectedFilter: string | null;
  onSelectFilter: (filterId: string | null) => void;
  accountIncome: number;
  accountExpenses: number;
  isBalanceHidden: boolean;
  textColor: string;
  tintColor: string;
  i18n: Record<string, string>;
}

export function CategoryFilterBar({
  categories,
  transactions,
  getCategoryForTransaction,
  selectedFilter,
  onSelectFilter,
  accountIncome,
  accountExpenses,
  isBalanceHidden,
  textColor,
  tintColor,
  i18n,
}: CategoryFilterBarProps) {
  const categorySummaries = useMemo(() => {
    const summaries: Record<string, { income: number; expenses: number }> = {};
    categories.forEach((cat) => {
      summaries[cat.id] = { income: 0, expenses: 0 };
    });
    transactions.forEach((tx) => {
      const txId = getStableTxId(tx);
      const cat = getCategoryForTransaction(txId);
      if (cat && summaries[cat.id]) {
        const amount = getTransactionAmount(tx);
        if (amount >= 0) summaries[cat.id].income += amount;
        else summaries[cat.id].expenses += Math.abs(amount);
      }
    });
    return summaries;
  }, [categories, transactions, getCategoryForTransaction]);

  return (
    <View style={styles.container}>
      {/* Stats row — horizontal on desktop, more spacious */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: textColor, opacity: 0.6 }]}>
            {i18n.income}
          </Text>
          <Text style={[styles.statValue, { color: "#2ecc71" }]}>
            {isBalanceHidden ? "*****" : formatAmount(accountIncome)}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: textColor + "20" }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: textColor, opacity: 0.6 }]}>
            {i18n.expenses}
          </Text>
          <Text style={[styles.statValue, { color: "#e74c3c" }]}>
            {isBalanceHidden ? "*****" : formatAmount(accountExpenses)}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: textColor + "20" }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: textColor, opacity: 0.6 }]}>
            {i18n.net}
          </Text>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  accountIncome - accountExpenses >= 0 ? "#2ecc71" : "#e74c3c",
              },
            ]}
          >
            {isBalanceHidden
              ? "*****"
              : formatAmount(accountIncome - accountExpenses)}
          </Text>
        </View>

        {/* Category filter pills — right side */}
        <View style={styles.pillsRow}>
          <TouchableOpacity
            onPress={() => onSelectFilter(null)}
            style={[
              styles.pill,
              {
                backgroundColor: !selectedFilter ? tintColor : textColor + "15",
              },
            ]}
          >
            <Text
              style={{
                color: !selectedFilter ? "#fff" : textColor,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => {
            const summary = categorySummaries[cat.id];
            const total = (summary?.income || 0) - (summary?.expenses || 0);
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() =>
                  onSelectFilter(selectedFilter === cat.id ? null : cat.id)
                }
                style={[
                  styles.pill,
                  {
                    backgroundColor:
                      selectedFilter === cat.id ? cat.color : cat.color + "20",
                  },
                ]}
              >
                <View
                  style={[
                    styles.pillDot,
                    {
                      backgroundColor:
                        selectedFilter === cat.id ? "#fff" : cat.color,
                    },
                  ]}
                />
                <Text
                  style={{
                    color: selectedFilter === cat.id ? "#fff" : textColor,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {cat.name}
                  {!isBalanceHidden && total !== 0 && (
                    <Text style={{ fontSize: 10, opacity: 0.8 }}>
                      {` ${total >= 0 ? "+" : ""}${total.toFixed(0)}€`}
                    </Text>
                  )}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    flexWrap: "wrap",
  },
  statItem: { alignItems: "center", minWidth: 80 },
  statLabel: {
    fontSize: 11,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 16, fontWeight: "700" },
  divider: { width: 1, height: 32, borderRadius: 1 },
  pillsRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
});
