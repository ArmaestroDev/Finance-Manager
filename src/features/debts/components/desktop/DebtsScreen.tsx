import { Stack } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import {
  Avatar,
  Balance,
  Button,
  Card,
  EmptyState,
  IconBank,
  IconPeople,
  IconPlus,
  Label,
  Money,
  Pill,
  PressState,
  formatEUR,
  splitForHero,
  stateColor,
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
    <DesktopShell
      title={i18n.debts_title}
      actions={
        <>
          <Button variant="outlined" icon={<IconPeople size={16} />} onPress={() => setManageModalVisible(true)}>
            {i18n.manage_people}
          </Button>
          <Button icon={<IconPlus size={16} />} onPress={handleAddPress}>
            {i18n.debt_add}
          </Button>
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.page}>
        <View style={styles.statsRow}>
          <Card padding={24} style={{ flex: 1.4 }}>
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
          </Card>
          <Card padding={24} style={{ flex: 1 }}>
            <Label>{i18n.they_owe_you}</Label>
            <View style={{ marginTop: 8 }}>
              <Balance value={owedToYou} masked={masked} size={FMType.h1} />
            </View>
          </Card>
          <Card padding={24} style={{ flex: 1 }}>
            <Label>{i18n.you_owe}</Label>
            <View style={{ marginTop: 8 }}>
              <Balance value={-Math.abs(youOwe)} masked={masked} size={FMType.h1} />
            </View>
          </Card>
        </View>

        <Card padding={0} style={{ overflow: "hidden" }}>
          {entitiesWithBalance.length === 0 ? (
            <EmptyState
              icon={<IconPeople />}
              title={i18n.no_people}
              action={
                <Button variant="tonal" icon={<IconPeople size={16} />} onPress={() => setManageModalVisible(true)}>
                  {i18n.manage_people}
                </Button>
              }
            />
          ) : (
            <>
              <View style={styles.tableHead}>
                <Label style={{ flex: 1 }}>{i18n.debt_col_person_institution}</Label>
                <Label style={styles.numCol}>{i18n.owes_me}</Label>
                <Label style={styles.numCol}>{i18n.i_owe}</Label>
                <Label style={[styles.numCol, { width: 140 }]}>{i18n.net}</Label>
              </View>
              {entitiesWithBalance.map((p) => {
                // "Settled" needs history; a person without entries has nothing to settle.
                const settled = p.netBalance === 0 && (p.owesMe > 0 || p.iOwe > 0);
                const isInstitution = p.type === "institution";
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => openDetail(p)}
                    accessibilityRole="button"
                    accessibilityLabel={p.name}
                    style={(s) => [styles.row, { backgroundColor: stateColor(t.surface, t.ink, s as PressState) }]}
                  >
                    <View style={styles.nameCell}>
                      <Avatar
                        size={36}
                        label={p.name}
                        icon={isInstitution ? <IconBank size={16} color={t.onPrimaryContainer} /> : undefined}
                      />
                      <Text
                        style={[styles.name, { color: settled ? t.inkSoft : t.ink }]}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                      {settled ? <Pill style={{ marginLeft: 8 }}>{i18n.settled}</Pill> : null}
                    </View>
                    <Text style={[styles.num, { color: p.owesMe > 0 ? t.pos : t.inkMuted }]}>
                      {masked ? "··" : p.owesMe ? formatEUR(p.owesMe) : "—"}
                    </Text>
                    <Text style={[styles.num, { color: p.iOwe > 0 ? t.neg : t.inkMuted }]}>
                      {masked ? "··" : p.iOwe ? formatEUR(p.iOwe) : "—"}
                    </Text>
                    <View style={{ width: 140, alignItems: "flex-end" }}>
                      <Money value={p.netBalance} masked={masked} size={FMType.bodyLg} />
                    </View>
                  </Pressable>
                );
              })}
            </>
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
    </DesktopShell>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 24, paddingBottom: 32, gap: 16 },
  statsRow: { flexDirection: "row", gap: 16 },
  heroRow: { flexDirection: "row", alignItems: "baseline", marginTop: 8 },
  hero: {
    fontFamily: FMFonts.display,
    fontSize: 40,
    lineHeight: 48,
    fontVariant: ["tabular-nums"],
  },
  heroCur: { fontFamily: FMFonts.display, fontSize: FMType.h1, marginLeft: 4 },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    minHeight: 60,
    paddingVertical: 8,
    gap: 16,
  },
  nameCell: { flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0 },
  name: {
    fontFamily: FMFonts.sans,
    fontSize: FMType.subhead,
    marginLeft: 16,
    flexShrink: 1,
  },
  numCol: { width: 120, textAlign: "right" },
  num: {
    width: 120,
    textAlign: "right",
    fontFamily: FMFonts.monoMedium,
    fontSize: FMType.body,
    fontVariant: ["tabular-nums"],
  },
});
