import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { IconChevR, useFMTheme } from "@/src/shared/design";
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

  const scrollRef = useRef<ScrollView>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const canScrollRight =
    contentWidth > 0 &&
    containerWidth > 0 &&
    contentWidth - containerWidth - scrollX > 1;

  const handleScrollRight = useCallback(() => {
    if (!scrollRef.current || containerWidth === 0) return;
    const targetX = Math.min(
      scrollX + containerWidth * 0.7,
      Math.max(0, contentWidth - containerWidth),
    );
    scrollRef.current.scrollTo({ x: targetX, animated: true });
  }, [containerWidth, contentWidth, scrollX]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setScrollX(e.nativeEvent.contentOffset.x);
    },
    [],
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.row,
          canScrollRight && { paddingRight: 28 },
        ]}
        onContentSizeChange={(w) => setContentWidth(w)}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onScroll={onScroll}
        scrollEventThrottle={16}
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
      {canScrollRight ? (
        <Pressable
          onPress={handleScrollRight}
          style={({ pressed }) => [
            styles.scrollArrow,
            {
              backgroundColor: t.surface,
              borderColor: t.lineStrong,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          hitSlop={6}
        >
          <IconChevR size={11} color={t.inkSoft} />
        </Pressable>
      ) : null}
    </View>
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
  wrapper: {
    position: "relative",
    flex: 1,
    minWidth: 0,
  },
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
  scrollArrow: {
    position: "absolute",
    right: 0,
    top: "50%",
    width: 22,
    height: 22,
    marginTop: -11,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
