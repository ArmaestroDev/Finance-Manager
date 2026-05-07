import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { useFMTheme } from "@/src/shared/design";
import {
  getStableTxId,
  getTransactionAmount,
} from "@/src/features/transactions/utils/transactions";
import type { Transaction } from "@/src/services/enableBanking";

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
  textColor?: string;
  tintColor?: string;
  i18n: Record<string, string>;
  showStats?: boolean;
}

export function CategoryFilterBar({
  categories,
  transactions,
  getCategoryForTransaction,
  selectedFilter,
  onSelectFilter,
  i18n,
}: CategoryFilterBarProps) {
  const t = useFMTheme();

  // Compute which categories actually have transactions in the active set —
  // hide empty pills so the strip stays compact.
  const usedCategoryIds = React.useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      const cat = getCategoryForTransaction(getStableTxId(tx));
      if (cat) set.add(cat.id);
    });
    return set;
  }, [transactions, getCategoryForTransaction]);

  const handleSelect = useCallback(
    (filterId: string | null) => {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync().catch(() => {});
      }
      onSelectFilter(filterId);
    },
    [onSelectFilter],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Pill
        active={!selectedFilter}
        onPress={() => handleSelect(null)}
      >
        {i18n.filter_all ?? "All"}
      </Pill>
      {categories
        .filter((c) => usedCategoryIds.has(c.id))
        .map((cat) => {
          const isSelected = selectedFilter === cat.id;
          return (
            <Pill
              key={cat.id}
              active={isSelected}
              color={cat.color}
              onPress={() => handleSelect(isSelected ? null : cat.id)}
            >
              {cat.name}
            </Pill>
          );
        })}
    </ScrollView>
  );
}

interface PillProps {
  children: React.ReactNode;
  color?: string;
  active?: boolean;
  onPress: () => void;
}

function Pill({ children, color, active, onPress }: PillProps) {
  const t = useFMTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: active ? t.ink : t.surface,
          borderColor: active ? t.ink : t.lineStrong,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {color ? (
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />
      ) : null}
      <Text
        style={{
          fontFamily: FMFonts.sansMedium,
          fontSize: 11,
          color: active ? t.bg : t.inkSoft,
          letterSpacing: -0.1,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 5,
    paddingVertical: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
});
