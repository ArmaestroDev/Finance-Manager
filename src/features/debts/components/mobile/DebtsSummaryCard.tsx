import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import {
  Balance,
  Label,
  formatEUR,
  formatEURCompact,
  useFMTheme,
} from "@/src/shared/design";
import { useDebtsSummary } from "../../hooks/useDebtsSummary";

interface DebtsSummaryCardProps {
  onManage: () => void;
  masked?: boolean;
  style?: ViewStyle;
}

// Mobile variant of the desktop DebtsSummaryCard — same data, tightened to the
// mobile card metrics (18px gutters, 12px radius, 28px hero).
export function DebtsSummaryCard({
  onManage,
  masked = false,
  style,
}: DebtsSummaryCardProps) {
  const t = useFMTheme();
  const {
    totalNet,
    owedToYou,
    youOwe,
    activeCount,
    settledCount,
    topActiveEntities,
  } = useDebtsSummary();

  const heroColor = totalNet > 0 ? t.pos : totalNet < 0 ? t.neg : t.ink;
  const empty = topActiveEntities.length === 0;
  const emptyText =
    settledCount > 0 ? `All settled · ${settledCount} people` : "No debts yet";

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.surface, borderColor: t.line },
        style,
      ]}
    >
      <View style={styles.header}>
        <Label>{`Debts · ${activeCount} active`}</Label>
        <Pressable
          onPress={onManage}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text
            style={{
              fontFamily: FMFonts.sansMedium,
              fontSize: 11,
              color: t.accent,
            }}
          >
            Manage →
          </Text>
        </Pressable>
      </View>

      <Text
        style={{
          fontFamily: FMFonts.display,
          fontSize: 28,
          color: heroColor,
          letterSpacing: -0.4,
          lineHeight: 30,
          marginTop: 8,
        }}
      >
        {formatEURCompact(totalNet, { masked })}
      </Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Label>They owe you</Label>
          <Text
            style={{
              fontFamily: FMFonts.monoSemibold,
              fontSize: 14,
              color: t.pos,
              marginTop: 4,
              fontVariant: ["tabular-nums"],
            }}
          >
            {formatEUR(owedToYou, { masked })}
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: t.line }} />
        <View style={[styles.summaryItem, { paddingLeft: 16 }]}>
          <Label>You owe</Label>
          <Text
            style={{
              fontFamily: FMFonts.monoSemibold,
              fontSize: 14,
              color: t.neg,
              marginTop: 4,
              fontVariant: ["tabular-nums"],
            }}
          >
            {formatEUR(Math.abs(youOwe), { masked })}
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {empty ? (
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 12,
              color: t.inkMuted,
            }}
          >
            {emptyText}
          </Text>
        ) : (
          topActiveEntities.map((e) => (
            <Pressable
              key={e.id}
              onPress={onManage}
              style={({ pressed }) => [
                styles.listRow,
                pressed && { opacity: 0.6 },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: t.surfaceAlt, borderColor: t.line },
                ]}
              >
                <Text
                  style={{
                    fontFamily: FMFonts.sansSemibold,
                    fontSize: 11,
                    color: t.inkSoft,
                  }}
                >
                  {e.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text
                style={{
                  flex: 1,
                  marginLeft: 10,
                  fontFamily: FMFonts.sansMedium,
                  fontSize: 12,
                  color: t.ink,
                }}
                numberOfLines={1}
              >
                {e.name}
              </Text>
              <Balance value={e.netBalance} masked={masked} size={12} />
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderRadius: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 14,
  },
  summaryItem: {
    flex: 1,
  },
  list: {
    marginTop: 16,
    gap: 12,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
