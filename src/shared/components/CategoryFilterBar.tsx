import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Transaction } from "../../services/enableBanking";
import { getStableTxId, getTransactionAmount } from "../../features/transactions/utils/transactions";
import { formatAmount } from "../utils/financeHelpers";

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
  // Compute per-category totals
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
        if (amount >= 0) {
          summaries[cat.id].income += amount;
        } else {
          summaries[cat.id].expenses += Math.abs(amount);
        }
      }
    });

    return summaries;
  }, [categories, transactions, getCategoryForTransaction]);

  return (
    <View style={styles.container}>
      {/* Income / Expenses Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text
            style={[styles.statLabel, { color: textColor, opacity: 0.6 }]}
          >
            {i18n.income || "Income"}
          </Text>
          <Text style={[styles.statValue, { color: "#2ecc71" }]}>
            {isBalanceHidden ? "*****" : formatAmount(accountIncome)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text
            style={[styles.statLabel, { color: textColor, opacity: 0.6 }]}
          >
            {i18n.expenses || "Expenses"}
          </Text>
          <Text style={[styles.statValue, { color: "#e74c3c" }]}>
            {isBalanceHidden ? "*****" : formatAmount(accountExpenses)}
          </Text>
        </View>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsContainer}
      >
        <TouchableOpacity
          onPress={() => onSelectFilter(null)}
          style={[
            styles.pill,
            {
              backgroundColor: !selectedFilter
                ? textColor
                : textColor + "15",
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
                onSelectFilter(
                  selectedFilter === cat.id ? null : cat.id,
                )
              }
              style={[
                styles.pill,
                {
                  backgroundColor:
                    selectedFilter === cat.id
                      ? cat.color
                      : cat.color + "20",
                },
              ]}
            >
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  pillsContainer: {
    paddingHorizontal: 4,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
});
