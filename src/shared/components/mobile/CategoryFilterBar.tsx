import React, { useMemo, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import type { Transaction } from "../../../services/enableBanking";
import { getStableTxId, getTransactionAmount } from "../../../features/transactions/utils/transactions";
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
  showStats?: boolean;
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
  showStats = true,
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
        if (amount >= 0) {
          summaries[cat.id].income += amount;
        } else {
          summaries[cat.id].expenses += Math.abs(amount);
        }
      }
    });

    return summaries;
  }, [categories, transactions, getCategoryForTransaction]);

  const handleSelectFilter = useCallback(
    (filterId: string | null) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectFilter(filterId);
    },
    [onSelectFilter]
  );

  const netBalance = accountIncome - accountExpenses;

  return (
    <View style={styles.container}>
      {showStats && (
        <View style={[styles.statsCard, { backgroundColor: textColor + "08" }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: textColor }]}>
              {i18n.income_label}
            </Text>
            <Text style={[styles.statValue, { color: "#2ecc71" }]}>
              {isBalanceHidden ? "*****" : formatAmount(accountIncome)}
            </Text>
          </View>
          
          <View style={[styles.divider, { backgroundColor: textColor + "20" }]} />
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: textColor }]}>
              {i18n.expenses_label}
            </Text>
            <Text style={[styles.statValue, { color: "#e74c3c" }]}>
              {isBalanceHidden ? "*****" : formatAmount(accountExpenses)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: textColor + "20" }]} />
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: textColor }]}>
              {i18n.net}
            </Text>
            <Text style={[styles.statValue, { color: netBalance >= 0 ? "#2ecc71" : "#e74c3c" }]}>
              {isBalanceHidden ? "*****" : formatAmount(netBalance)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => handleSelectFilter(null)}
          style={[
            styles.pill,
            {
              backgroundColor: !selectedFilter ? tintColor : textColor + "15",
            },
          ]}
        >
          <Text
            style={[
              styles.pillText,
              { color: !selectedFilter ? "#fff" : textColor }
            ]}
          >
            {i18n.filter_all}
          </Text>
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
        >
          {categories.map((cat) => {
            const summary = categorySummaries[cat.id];
            const total = (summary?.income || 0) - (summary?.expenses || 0);
            const isSelected = selectedFilter === cat.id;
            
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() =>
                  handleSelectFilter(isSelected ? null : cat.id)
                }
                style={[
                  styles.pill,
                  {
                    backgroundColor: isSelected ? cat.color : cat.color + "20",
                  },
                ]}
              >
                <View
                  style={[
                    styles.pillDot,
                    {
                      backgroundColor: isSelected ? "#fff" : cat.color,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.pillText,
                    { color: isSelected ? "#fff" : textColor }
                  ]}
                >
                  {cat.name}
                  {!isBalanceHidden && total !== 0 && (
                    <Text style={[styles.pillAmount, { color: isSelected ? "rgba(255,255,255,0.8)" : textColor + "80" }]}>
                      {` ${total >= 0 ? "+" : ""}${total.toFixed(0)}€`}
                    </Text>
                  )}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  statsCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    opacity: 0.7,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    width: 1,
    height: 24,
    borderRadius: 1,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pillsContainer: {
    paddingLeft: 8,
    paddingRight: 16,
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pillAmount: {
    fontSize: 11,
  }
});
