import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { Button, Label, Money, formatEUR, useFMTheme } from "@/src/shared/design";
import { formatDate } from "@/src/shared/utils/date";
import type { DebtEntity, DebtItem } from "../../context/DebtsContext";

interface DebtDetailModalProps {
  visible: boolean;
  entity: DebtEntity | null;
  debts: DebtItem[];
  netBalance: number;
  onClose: () => void;
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

  const isInstitution = entity.type === "institution";
  const totalOwed = entityDebts
    .filter((d) => d.type === "OWES_ME")
    .reduce((s, d) => s + d.amount, 0);
  const totalOwe = entityDebts
    .filter((d) => d.type === "I_OWE")
    .reduce((s, d) => s + d.amount, 0);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      width={500}
      actions={<Button variant="ghost" onPress={onClose}>{i18n.close ?? "Close"}</Button>}
    >
      {/* Avatar header */}
      <View style={styles.header}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: isInstitution ? t.surfaceAlt : t.accentSoft,
              borderColor: t.line,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: FMFonts.sansSemibold,
              fontSize: 19,
              color: isInstitution ? t.inkSoft : t.accent,
            }}
          >
            {entity.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
          <Text
            style={{
              fontFamily: FMFonts.display,
              fontSize: 22,
              color: t.ink,
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            {entity.name}
          </Text>
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 11.5,
              color: t.inkSoft,
              marginTop: 3,
            }}
          >
            {entityDebts.length}{" "}
            {entityDebts.length === 1 ? "transaction" : "transactions"}
          </Text>
        </View>
      </View>

      {/* Three stat cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: t.posSoft }]}>
          <Label>{i18n.they_owe_you ?? "They Owe You"}</Label>
          <Text
            style={{
              fontFamily: FMFonts.monoSemibold,
              fontSize: 16,
              color: t.pos,
              marginTop: 6,
              fontVariant: ["tabular-nums"],
            }}
          >
            {formatEUR(totalOwed, { showSign: true })}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: t.negSoft }]}>
          <Label>{i18n.you_owe ?? "You Owe"}</Label>
          <Text
            style={{
              fontFamily: FMFonts.monoSemibold,
              fontSize: 16,
              color: t.neg,
              marginTop: 6,
              fontVariant: ["tabular-nums"],
            }}
          >
            {formatEUR(-totalOwe)}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: t.accentSoft }]}>
          <Label>{i18n.net_balance ?? "Net"}</Label>
          <View style={{ marginTop: 6 }}>
            <Money value={netBalance} size={16} total />
          </View>
        </View>
      </View>

      <Label style={{ marginBottom: 8, marginTop: 18 }}>
        {i18n.history ?? "History"}
      </Label>
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
              paddingVertical: 22,
            }}
          >
            {i18n.no_history ?? "No history."}
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
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontFamily: FMFonts.sansMedium,
                  fontSize: 12.5,
                  color: t.ink,
                }}
                numberOfLines={1}
              >
                {item.description}
              </Text>
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  fontSize: 10.5,
                  color: t.inkMuted,
                  marginTop: 2,
                }}
              >
                {formatDate(item.date)}
              </Text>
            </View>
            <Money
              value={item.type === "OWES_ME" ? item.amount : -item.amount}
              size={13}
            />
          </View>
        )}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
  },
});
