import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { Chip, IconButton, IconChevR } from "@/src/shared/design";
import { getStableTxId } from "@/src/features/transactions/utils/transactions";
import type { Transaction } from "@/src/services/enableBanking";
import type { Strings } from "@/src/constants/Strings";

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
  i18n: typeof Strings.de;
}

export function CategoryFilterBar({
  categories,
  transactions,
  getCategoryForTransaction,
  selectedFilter,
  onSelectFilter,
  i18n,
}: CategoryFilterBarProps) {
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
          canScrollRight && { paddingRight: 40 },
        ]}
        onContentSizeChange={(w) => setContentWidth(w)}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <Chip filter active={!selectedFilter} onPress={() => handleSelect(null)}>
          {i18n.filter_all}
        </Chip>
        {categories
          .filter((c) => usedCategoryIds.has(c.id))
          .map((cat) => {
            const isSelected = selectedFilter === cat.id;
            return (
              <Chip
                key={cat.id}
                active={isSelected}
                icon={<Dot color={cat.color} />}
                onPress={() => handleSelect(isSelected ? null : cat.id)}
              >
                {cat.name}
              </Chip>
            );
          })}
      </ScrollView>
      {canScrollRight ? (
        <IconButton
          icon={<IconChevR size={16} />}
          label={i18n.scroll_more}
          onPress={handleScrollRight}
          variant="tonal"
          size={32}
          style={styles.scrollArrow}
        />
      ) : null}
    </View>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />;
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    flex: 1,
    minWidth: 0,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  scrollArrow: {
    position: "absolute",
    right: 0,
    top: "50%",
    marginTop: -16,
  },
});
