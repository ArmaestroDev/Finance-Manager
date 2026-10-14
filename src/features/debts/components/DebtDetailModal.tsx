import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { Strings } from "@/src/constants/Strings";
import { FMFonts, FMType } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { EmptyState, IconDoc, Label, Money, SectionTitle, formatEUR, useFMTheme } from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import type { DebtEntity, DebtItem } from "../context/DebtsContext";
import { DebtEntryRow } from "./DebtEntryRow";

interface DebtDetailModalProps {
  visible: boolean;
  entity: DebtEntity | null;
  debts: DebtItem[];
  netBalance: number;
  onClose: () => void;
  i18n: typeof Strings.de;
}

// Person / institution detail: net position, the two directions, and the
// editable history. Same sheet on desktop (dialog) and mobile (bottom sheet).
export function DebtDetailModal({ visible, entity, debts, netBalance, onClose, i18n }: DebtDetailModalProps) {
  const t = useFMTheme();
  const { isBalanceHidden: masked } = useSettings();
  if (!entity) return null;

  const entityDebts = debts
    .filter((d) => d.entityId === entity.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalOwed = entityDebts.filter((d) => d.type === "OWES_ME").reduce((s, d) => s + d.amount, 0);
  const totalOwe = entityDebts.filter((d) => d.type === "I_OWE").reduce((s, d) => s + d.amount, 0);

  return (
    <Sheet visible={visible} onClose={onClose} title={entity.name} width={520}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ marginHorizontal: -24 }}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        <View style={[styles.hero, { backgroundColor: t.surfaceContainerHigh }]}>
          <Label>{i18n.net_balance}</Label>
          <Money value={netBalance} masked={masked} size={32} weight={400} style={{ marginTop: 4 }} />
          <View style={styles.stats}>
            <View style={{ flex: 1 }}>
              <Label>{i18n.they_owe_you}</Label>
              <Text style={[styles.stat, { color: t.pos }]}>{formatEUR(totalOwed, { masked })}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Label>{i18n.you_owe}</Label>
              <Text style={[styles.stat, { color: t.neg }]}>{formatEUR(totalOwe, { masked })}</Text>
            </View>
          </View>
        </View>

        <SectionTitle style={{ marginTop: 16, marginBottom: 4, paddingHorizontal: 24 }}>{i18n.history}</SectionTitle>
        {entityDebts.length === 0 ? (
          <EmptyState icon={<IconDoc />} title={i18n.no_history} style={{ paddingVertical: 16 }} />
        ) : (
          entityDebts.map((item) => <DebtEntryRow key={item.id} item={item} i18n={i18n} />)
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 16,
  },
  stats: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
  },
  stat: {
    fontFamily: FMFonts.monoMedium,
    fontSize: FMType.subhead,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
});
