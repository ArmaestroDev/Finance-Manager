import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import type { Transaction } from "@/src/services/enableBanking";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  Avatar,
  Button,
  Card,
  Money,
  PressState,
  mix,
  stateColor,
  useFMTheme,
} from "@/src/shared/design";
import { useTransactionLinks } from "@/src/features/transactions/context/TransactionLinksContext";
import { statAmountFor } from "@/src/features/transactions/utils/links";
import { getStableTxId } from "@/src/features/transactions/utils/transactions";

/** Filter value for "rows without a category" (DateFilterContext.selectedCategoryId). */
export const UNCATEGORIZED_FILTER = "__uncategorized";

interface Category {
  id: string;
  name: string;
  color: string;
  system?: "ignore";
}

interface CategoryOverviewProps {
  transactions: Transaction[];
  categories: Category[];
  getCategoryForTransaction: (txId: string) => Category | null;
  selected: string | null;
  onSelect: (id: string | null) => void;
  masked?: boolean;
}

interface Row {
  id: string;
  name: string;
  color: string;
  /** Net amount in the period (reimbursements applied, like the header totals). */
  net: number;
  count: number;
  /** Share of spending (expense categories) or income (income categories), 0–1. */
  share: number | null;
  kind: "expense" | "income" | "ignore" | "uncategorized";
}

/** Does a transaction match the overview's current filter value? */
export function matchesCategoryFilter(
  cat: { id: string } | null,
  filter: string | null,
): boolean {
  if (!filter) return true;
  if (filter === UNCATEGORIZED_FILTER) return !cat;
  return cat?.id === filter;
}

// Per-category overview for an account and date range: a stacked spending
// bar plus one tile per category (amount, bookings, share). Tapping a tile
// filters the transaction list below; tapping it again clears the filter.
export function CategoryOverview({
  transactions,
  categories,
  getCategoryForTransaction,
  selected,
  onSelect,
  masked,
}: CategoryOverviewProps) {
  const t = useFMTheme();
  const { i18n, language } = useSettings();
  const { linkIndex } = useTransactionLinks();
  const [width, setWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const byId = new Map<string, { net: number; count: number }>();
    let uncatCount = 0;
    let uncatNet = 0;
    for (const tx of transactions) {
      const txId = getStableTxId(tx);
      // Linked children are folded into their parent expense.
      if (linkIndex.childToParent.has(txId)) continue;
      const amount = statAmountFor(tx, linkIndex, txId) ?? 0;
      const cat = getCategoryForTransaction(txId);
      if (!cat) {
        uncatCount++;
        uncatNet += amount;
        continue;
      }
      const agg = byId.get(cat.id) ?? { net: 0, count: 0 };
      agg.net += amount;
      agg.count++;
      byId.set(cat.id, agg);
    }

    const list: Row[] = [];
    for (const c of categories) {
      const agg = byId.get(c.id);
      if (!agg) continue;
      const kind =
        c.system === "ignore" ? "ignore" : agg.net >= 0 ? "income" : "expense";
      list.push({
        id: c.id,
        name: c.name,
        color: c.color,
        net: agg.net,
        count: agg.count,
        share: null,
        kind,
      });
    }
    const spent = list
      .filter((r) => r.kind === "expense")
      .reduce((s, r) => s - r.net, 0);
    const earned = list
      .filter((r) => r.kind === "income")
      .reduce((s, r) => s + r.net, 0);
    for (const r of list) {
      if (r.kind === "expense" && spent > 0) r.share = -r.net / spent;
      if (r.kind === "income" && earned > 0) r.share = r.net / earned;
    }
    const order = {
      uncategorized: 0,
      expense: 1,
      income: 2,
      ignore: 3,
    } as const;
    list.sort(
      (a, b) =>
        order[a.kind] - order[b.kind] || Math.abs(b.net) - Math.abs(a.net),
    );
    if (uncatCount > 0) {
      list.unshift({
        id: UNCATEGORIZED_FILTER,
        name: i18n.uncategorized,
        color: t.warn,
        net: uncatNet,
        count: uncatCount,
        share: null,
        kind: "uncategorized",
      });
    }
    return list;
  }, [
    transactions,
    categories,
    getCategoryForTransaction,
    linkIndex,
    i18n.uncategorized,
    t.warn,
  ]);

  if (rows.length === 0) return null;

  const columns = width >= 1000 ? 5 : width >= 760 ? 4 : width >= 520 ? 3 : 2;
  const collapsedCount = columns * 2;
  const canExpand = rows.length > collapsedCount;
  const visible = expanded || !canExpand ? rows : rows.slice(0, collapsedCount);
  // Keep the active filter visible even when the grid is collapsed.
  if (selected && !visible.some((r) => r.id === selected)) {
    const sel = rows.find((r) => r.id === selected);
    if (sel) visible.push(sel);
  }
  const expenses = rows.filter((r) => r.kind === "expense");

  const select = (id: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onSelect(selected === id ? null : id);
  };
  const percent = (share: number) =>
    `${(share * 100).toLocaleString(language === "de" ? "de-DE" : "en-US", { maximumFractionDigits: share < 0.1 ? 1 : 0 })} %`;
  const bookings = (n: number) =>
    n === 1
      ? i18n.cat_overview_booking_one
      : i18n.cat_overview_bookings.replace("{count}", String(n));

  return (
    <Card padding={16}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={styles.head}>
          <Text
            style={{
              fontFamily: FMFonts.sansMedium,
              fontSize: FMType.bodyLg,
              color: t.ink,
            }}
          >
            {i18n.cat_overview_title}
          </Text>
          {selected ? (
            <Button variant="text" size="sm" onPress={() => onSelect(null)}>
              {i18n.cat_overview_clear}
            </Button>
          ) : null}
        </View>

        {expenses.length > 0 ? (
          <View
            style={[
              styles.stack,
              { backgroundColor: t.surfaceContainerHighest },
            ]}
            accessibilityLabel={i18n.cat_overview_spending}
          >
            {expenses.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => select(r.id)}
                accessibilityRole="button"
                accessibilityLabel={`${r.name} ${percent(r.share ?? 0)}`}
                style={{
                  flexGrow: r.share ?? 0,
                  flexBasis: 0,
                  backgroundColor: r.color,
                  opacity: selected && selected !== r.id ? 0.35 : 1,
                }}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.grid}>
          {visible.map((r) => {
            const active = selected === r.id;
            const dim = r.kind === "ignore";
            return (
              <Pressable
                key={r.id}
                onPress={() => select(r.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${r.name}, ${bookings(r.count)}`}
                style={[styles.tile, { width: `${100 / columns}%` }]}
              >
                {(s) => (
                  <View
                    style={[
                      styles.tileInner,
                      {
                        backgroundColor: stateColor(
                          active
                            ? mix(t.surfaceContainerHigh, r.color, 0.22)
                            : t.surfaceContainerHigh,
                          t.ink,
                          s as PressState,
                        ),
                        borderColor: active ? r.color : "transparent",
                      },
                    ]}
                  >
                    <View style={styles.tileHead}>
                      <Avatar
                        label={r.kind === "uncategorized" ? "?" : r.name}
                        color={dim ? t.inkSoft : r.color}
                        size={28}
                      />
                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          fontFamily: FMFonts.sansMedium,
                          fontSize: FMType.small,
                          color: r.kind === "uncategorized" ? t.warn : t.ink,
                        }}
                      >
                        {r.name}
                      </Text>
                    </View>
                    <Money
                      value={r.net}
                      masked={masked}
                      size={FMType.bodyLg}
                      weight={600}
                      style={dim ? { color: t.inkSoft } : undefined}
                    />
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: FMFonts.sans,
                        fontSize: FMType.caption,
                        color: t.inkSoft,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {bookings(r.count)}
                      {r.share !== null ? ` · ${percent(r.share)}` : ""}
                    </Text>
                    <View
                      style={[
                        styles.bar,
                        { backgroundColor: t.surfaceContainerHighest },
                      ]}
                    >
                      {r.share !== null ? (
                        <View
                          style={{
                            width: `${Math.max(2, r.share * 100)}%`,
                            height: "100%",
                            backgroundColor: r.color,
                          }}
                        />
                      ) : null}
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {canExpand ? (
          <View style={{ alignItems: "flex-start", marginTop: 4 }}>
            <Button
              variant="text"
              size="sm"
              onPress={() => setExpanded(!expanded)}
            >
              {expanded
                ? i18n.cat_overview_show_less
                : i18n.cat_overview_show_all.replace(
                    "{count}",
                    String(rows.length),
                  )}
            </Button>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 36,
    marginBottom: 8,
  },
  stack: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    gap: 2,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  tile: {
    padding: 4,
  },
  tileInner: {
    borderRadius: FMRadius.md,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  tileHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 6,
  },
});
