import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import {
  Avatar,
  Balance,
  Button,
  Card,
  Label,
  ListItem,
  SectionTitle,
  formatEUR,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { useDebtsSummary } from "../../hooks/useDebtsSummary";

interface DebtsSummaryCardProps {
  onManage: () => void;
  masked?: boolean;
  /** Mobile metrics (16dp padding). */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Dashboard card: net debt position, both directions, top open people.
export function DebtsSummaryCard({ onManage, masked = false, compact, style }: DebtsSummaryCardProps) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  const { totalNet, owedToYou, youOwe, activeCount, settledCount, topActiveEntities } = useDebtsSummary();
  const pad = compact ? 16 : 24;

  const heroColor = totalNet > 0 ? t.pos : totalNet < 0 ? t.neg : t.ink;
  const empty = topActiveEntities.length === 0;

  return (
    <Card padding={pad} style={style}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <SectionTitle>{i18n.debts_title}</SectionTitle>
          {activeCount > 0 ? (
            <Text style={{ fontFamily: FMFonts.sans, fontSize: FMType.small, color: t.inkSoft }}>
              {i18n.debt_open_count.replace("{count}", String(activeCount))}
            </Text>
          ) : null}
        </View>
        <Button variant="text" size="sm" onPress={onManage} style={{ marginRight: -12 }}>
          {i18n.debt_manage_short}
        </Button>
      </View>

      <Text
        style={{
          fontFamily: FMFonts.display,
          fontSize: 32,
          lineHeight: 40,
          color: heroColor,
          marginTop: 8,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatEUR(totalNet, { masked })}
      </Text>

      <View style={styles.summaryRow}>
        <View style={{ flex: 1 }}>
          <Label>{i18n.they_owe_you}</Label>
          <Text style={[styles.stat, { color: t.pos }]}>{formatEUR(owedToYou, { masked })}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Label>{i18n.you_owe}</Label>
          <Text style={[styles.stat, { color: t.neg }]}>{formatEUR(Math.abs(youOwe), { masked })}</Text>
        </View>
      </View>

      <View style={{ marginTop: 8, marginHorizontal: -pad }}>
        {empty ? (
          <Text style={{ fontFamily: FMFonts.sans, fontSize: FMType.body, color: t.inkSoft, paddingHorizontal: pad, paddingTop: 8 }}>
            {settledCount > 0
              ? i18n.debt_all_settled.replace("{count}", String(settledCount))
              : i18n.debt_none_yet}
          </Text>
        ) : (
          topActiveEntities.map((e) => (
            <ListItem
              key={e.id}
              onPress={onManage}
              accessibilityLabel={e.name}
              leading={<Avatar label={e.name} size={32} />}
              title={e.name}
              trailing={<Balance value={e.netBalance} masked={masked} size={FMType.body} />}
              style={{ paddingHorizontal: pad, minHeight: 48 }}
            />
          ))
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  stat: {
    fontFamily: FMFonts.monoMedium,
    fontSize: FMType.subhead,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
});
