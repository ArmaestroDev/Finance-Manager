import { Stack } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { MobileShell } from "@/src/shared/components/MobileShell";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  IconBank,
  IconButton,
  IconPeople,
  IconPlus,
  Label,
  ListItem,
  Money,
  formatEUR,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { showAlert } from "@/src/shared/utils/alert";
import { DebtEntity, useDebts } from "../../context/DebtsContext";
import { useDebtsSummary } from "../../hooks/useDebtsSummary";
import { AddDebtModal } from "../AddDebtModal";
import { DebtDetailModal } from "../DebtDetailModal";
import { ManagePeopleModal } from "../ManagePeopleModal";

export function DebtsScreen() {
  const t = useFMTheme();
  const { entities, debts, addEntity, updateEntity, deleteEntity, addDebt, getNetBalance } = useDebts();
  const { i18n, isBalanceHidden } = useSettings();
  const masked = isBalanceHidden;

  const [isManageModalVisible, setManageModalVisible] = useState(false);
  const [isAddDebtModalVisible, setAddDebtModalVisible] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [detailEntity, setDetailEntity] = useState<DebtEntity | null>(null);

  const { entitiesWithBalance, totalNet, owedToYou, youOwe } = useDebtsSummary();

  const heroParts = splitForHero(totalNet, masked);
  const heroFg = totalNet > 0 ? t.pos : totalNet < 0 ? t.neg : t.ink;

  const openDetail = (entity: DebtEntity) => {
    setDetailEntity(entity);
    setDetailModalVisible(true);
  };

  const handleAddPress = () => {
    if (entities.length === 0) {
      showAlert(i18n.add_person_alert_title, i18n.add_person_alert_msg, [
        { text: i18n.cancel, style: "cancel" },
        { text: i18n.add_person_btn, onPress: () => setManageModalVisible(true) },
      ]);
    } else {
      setAddDebtModalVisible(true);
    }
  };

  return (
    <MobileShell
      title={i18n.debts_title}
      right={
        <>
          <IconButton icon={<IconPeople size={20} />} label={i18n.manage_people} onPress={() => setManageModalVisible(true)} />
          <IconButton icon={<IconPlus size={20} />} label={i18n.debt_add} onPress={handleAddPress} />
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ gap: 12 }}>
        <Card>
          <Label>{i18n.total_net_position}</Label>
          <View style={styles.heroRow}>
            <Text style={[styles.hero, { color: heroFg }]}>
              {!masked && totalNet > 0 ? "+" : ""}
              {heroParts.sign}
              {heroParts.integer}
              <Text style={{ color: t.inkSoft }}>{heroParts.fraction}</Text>
            </Text>
            <Text style={[styles.heroCur, { color: t.inkSoft }]}>€</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <Label>{i18n.they_owe_you}</Label>
              <Text style={[styles.stat, { color: t.pos }]}>{formatEUR(owedToYou, { masked })}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Label>{i18n.you_owe}</Label>
              <Text style={[styles.stat, { color: t.neg }]}>{formatEUR(Math.abs(youOwe), { masked })}</Text>
            </View>
          </View>
        </Card>

        <Card padding={0} style={{ overflow: "hidden", paddingVertical: 8 }}>
          {entitiesWithBalance.length === 0 ? (
            <EmptyState
              icon={<IconPeople />}
              title={i18n.no_people_added}
              action={
                <Button variant="tonal" icon={<IconPeople size={16} />} onPress={() => setManageModalVisible(true)}>
                  {i18n.manage_people}
                </Button>
              }
            />
          ) : (
            entitiesWithBalance.map((p) => {
              // "Settled" needs history; a person without entries has nothing to settle.
                const settled = p.netBalance === 0 && (p.owesMe > 0 || p.iOwe > 0);
              const isInstitution = p.type === "institution";
              const parts: string[] = [];
              if (p.owesMe > 0) parts.push(`${i18n.owes_me} ${formatEUR(p.owesMe, { masked })}`);
              if (p.iOwe > 0) parts.push(`${i18n.i_owe} ${formatEUR(p.iOwe, { masked })}`);
              return (
                <ListItem
                  key={p.id}
                  onPress={() => openDetail(p)}
                  accessibilityLabel={p.name}
                  leading={
                    <Avatar
                      label={p.name}
                      icon={isInstitution ? <IconBank size={18} color={t.onPrimaryContainer} /> : undefined}
                    />
                  }
                  title={p.name}
                  subtitle={settled ? i18n.settled : parts.join(" · ")}
                  trailing={<Money value={p.netBalance} masked={masked} size={FMType.bodyLg} />}
                />
              );
            })
          )}
        </Card>
      </View>

      <ManagePeopleModal
        visible={isManageModalVisible}
        entities={entities}
        onAdd={async (name) => addEntity(name, "person")}
        onUpdate={async (id, name) => updateEntity(id, name)}
        onDelete={async (id) => deleteEntity(id)}
        onClose={() => setManageModalVisible(false)}
        i18n={i18n}
      />
      <AddDebtModal
        visible={isAddDebtModalVisible}
        entities={entities}
        onAdd={addDebt}
        onClose={() => setAddDebtModalVisible(false)}
        i18n={i18n}
      />
      <DebtDetailModal
        visible={isDetailModalVisible}
        entity={detailEntity}
        debts={debts}
        netBalance={detailEntity ? getNetBalance(detailEntity.id) : 0}
        onClose={() => setDetailModalVisible(false)}
        i18n={i18n}
      />
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: "row", alignItems: "baseline", marginTop: 4 },
  hero: { fontFamily: FMFonts.display, fontSize: 36, lineHeight: 44, fontVariant: ["tabular-nums"] },
  heroCur: { fontFamily: FMFonts.display, fontSize: FMType.h2, marginLeft: 4 },
  statsRow: { flexDirection: "row", gap: 16, marginTop: 16 },
  stat: {
    fontFamily: FMFonts.monoMedium,
    fontSize: FMType.subhead,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
});
