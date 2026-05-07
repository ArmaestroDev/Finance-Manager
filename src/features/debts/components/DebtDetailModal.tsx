import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { Button, Label, Money, formatEUR, splitForHero, useFMTheme } from "@/src/shared/design";
import type { DebtEntity, DebtItem } from "../context/DebtsContext";

interface DebtDetailModalProps {
  visible: boolean;
  entity: DebtEntity | null;
  debts: DebtItem[];
  netBalance: number;
  onClose: () => void;
  backgroundColor?: string;
  textColor?: string;
  tintColor?: string;
  i18n: Record<string, string>;
}

export function DebtDetailModal({
  visible,
  entity,
  debts,
  netBalance,
  onClose,
  i18n,
}: DebtDetailModalProps) {
  const t = useFMTheme();
  const entityDebts = entity
    ? debts
        .filter((d) => d.entityId === entity.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  if (!entity) return null;

  const heroParts = splitForHero(netBalance);
  const heroColor = netBalance > 0 ? t.pos : netBalance < 0 ? t.neg : t.ink;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={entity.name}
      subtitle={entity.type === "institution" ? "Institution" : "Person"}
      width={500}
      actions={<Button variant="ghost" onPress={onClose}>{i18n.close ?? "Close"}</Button>}
    >
      <View style={[styles.netCard, { backgroundColor: t.surfaceAlt, borderColor: t.line }]}>
        <Label>{i18n.net_balance}</Label>
        <View style={styles.heroRow}>
          <Text
            style={{
              fontFamily: FMFonts.display,
              fontSize: 28,
              color: heroColor,
              letterSpacing: -0.4,
              lineHeight: 30,
            }}
          >
            {netBalance > 0 ? "+" : ""}
            {heroParts.sign}
            {heroParts.integer}
            <Text style={{ color: t.inkMuted }}>{heroParts.fraction}</Text>
          </Text>
          <Text style={{ fontFamily: FMFonts.display, fontSize: 16, color: t.inkSoft, marginLeft: 4 }}>€</Text>
        </View>
        <Text style={{ fontFamily: FMFonts.sans, fontSize: 11, color: t.inkSoft, marginTop: 4 }}>
          {netBalance >= 0 ? "They owe you" : "You owe them"}
        </Text>
      </View>

      <Label style={{ marginBottom: 6, marginTop: 14 }}>{i18n.history}</Label>
      <FlatList
        data={entityDebts}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 12,
              color: t.inkMuted,
              textAlign: "center",
              paddingVertical: 18,
            }}
          >
            {i18n.no_history}
          </Text>
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.row,
              {
                borderTopColor: t.line,
                borderTopWidth: index === 0 ? 0 : 1,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 12.5, color: t.ink }}>
                {item.description}
              </Text>
              <Text style={{ fontFamily: FMFonts.sans, fontSize: 10.5, color: t.inkMuted, marginTop: 2 }}>
                {new Date(item.date).toLocaleDateString("en-GB")}
              </Text>
            </View>
            <Money
              value={item.type === "OWES_ME" ? item.amount : -item.amount}
              size={12}
            />
          </View>
        )}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  netCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
});
