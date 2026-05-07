import { Stack } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import {
  Balance,
  Button,
  IconPeople,
  IconPlus,
  Label,
  Money,
  formatEUR,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
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

  const {
    entitiesWithBalance,
    totalNet,
    owedToYou,
    youOwe,
    activeCount,
    settledCount,
  } = useDebtsSummary();

  const heroParts = splitForHero(totalNet, masked);
  const heroBg = totalNet < 0 ? t.negSoft : totalNet > 0 ? t.posSoft : t.surface;
  const heroFg = totalNet > 0 ? t.pos : totalNet < 0 ? t.neg : t.ink;

  const openDetail = (entity: DebtEntity) => {
    setDetailEntity(entity);
    setDetailModalVisible(true);
  };

  const handleAddPress = () => {
    if (entities.length === 0) {
      Alert.alert(
        i18n.add_person_alert_title ?? "Add a person first",
        i18n.add_person_alert_msg ?? "You need to add a person before tracking a debt.",
        [
          { text: i18n.cancel ?? "Cancel", style: "cancel" },
          { text: i18n.add_person_btn ?? "Add person", onPress: () => setManageModalVisible(true) },
        ],
      );
    } else {
      setAddDebtModalVisible(true);
    }
  };

  return (
    <DesktopShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.page, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.pageTitle, { color: t.ink }]}>{i18n.debts_title}</Text>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkSoft, marginTop: 4 }}>
              {activeCount} active · {settledCount} settled
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Button
              variant="secondary"
              icon={<IconPeople size={12} color={t.ink} />}
              onPress={() => setManageModalVisible(true)}
            >
              {i18n.manage_people}
            </Button>
            <Button
              variant="primary"
              icon={<IconPlus size={12} color={t.bg} />}
              onPress={handleAddPress}
            >
              Add debt
            </Button>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.netCard, { backgroundColor: heroBg, borderColor: t.line }]}>
            <Label>{i18n.total_net_position}</Label>
            <View style={styles.heroRow}>
              <Text
                style={{
                  fontFamily: FMFonts.display,
                  fontSize: 36,
                  color: heroFg,
                  letterSpacing: -0.5,
                  lineHeight: 38,
                }}
              >
                {totalNet > 0 ? "+" : ""}
                {heroParts.sign}
                {heroParts.integer}
                <Text style={{ color: t.inkMuted }}>{heroParts.fraction}</Text>
              </Text>
              <Text
                style={{
                  fontFamily: FMFonts.display,
                  fontSize: 20,
                  color: t.inkSoft,
                  marginLeft: 4,
                }}
              >
                €
              </Text>
            </View>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 11.5, color: t.inkSoft, marginTop: 6 }}>
              {totalNet < 0
                ? "You owe more than you are owed."
                : totalNet > 0
                  ? "You are owed more than you owe."
                  : "Settled overall."}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Label>They owe you</Label>
            <View style={{ marginTop: 8 }}>
              <Balance value={owedToYou} masked={masked} size={22} />
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Label>You owe</Label>
            <View style={{ marginTop: 8 }}>
              <Balance value={youOwe} masked={masked} size={22} />
            </View>
          </View>
        </View>

        <View style={[styles.tableWrap, { backgroundColor: t.surface, borderColor: t.line }]}>
          <View style={[styles.tableHead, { backgroundColor: t.surfaceAlt, borderBottomColor: t.line }]}>
            <Label style={{ flex: 1 }}>Person / institution</Label>
            <Label style={{ width: 110 }}>Type</Label>
            <Label style={{ width: 110, textAlign: "right" }}>They owe</Label>
            <Label style={{ width: 110, textAlign: "right" }}>You owe</Label>
            <Label style={{ width: 130, textAlign: "right" }}>Net</Label>
          </View>

          {entitiesWithBalance.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 14, color: t.ink }}>
                {i18n.no_people ?? "No people yet"}
              </Text>
              <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkSoft, marginTop: 4 }}>
                Add people or institutions to track who owes whom.
              </Text>
              <View style={{ marginTop: 12 }}>
                <Button variant="primary" icon={<IconPeople size={12} color={t.bg} />} onPress={() => setManageModalVisible(true)}>
                  {i18n.manage_people}
                </Button>
              </View>
            </View>
          ) : (
            entitiesWithBalance.map((p) => {
              const settled = p.netBalance === 0;
              const isInstitution = p.type === "institution";
              const they = debts
                .filter((d) => d.entityId === p.id && d.type === "OWES_ME")
                .reduce((s, d) => s + d.amount, 0);
              const you = debts
                .filter((d) => d.entityId === p.id && d.type === "I_OWE")
                .reduce((s, d) => s + d.amount, 0);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => openDetail(p)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderTopColor: t.line,
                      opacity: settled ? 0.55 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: isInstitution ? t.surfaceAlt : t.accentSoft,
                          borderColor: t.line,
                        },
                      ]}
                    >
                      <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 11, color: isInstitution ? t.inkSoft : t.accent }}>
                        {p.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13, color: t.ink, marginLeft: 10 }} numberOfLines={1}>
                      {p.name}
                    </Text>
                    {settled ? (
                      <Text
                        style={{
                          fontFamily: FMFonts.sansSemibold,
                          fontSize: 10,
                          color: t.inkMuted,
                          backgroundColor: t.surfaceAlt,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          marginLeft: 8,
                          borderRadius: 3,
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                          overflow: "hidden",
                        }}
                      >
                        {i18n.settled ?? "Settled"}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.cellText, { width: 110, color: t.inkSoft }]}>
                    {isInstitution ? "Institution" : "Person"}
                  </Text>
                  <Text
                    style={{
                      width: 110,
                      textAlign: "right",
                      fontFamily: FMFonts.sansMedium,
                      fontSize: 12,
                      color: they > 0 ? t.pos : t.inkMuted,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {masked ? "··" : they ? formatEUR(they) : "—"}
                  </Text>
                  <Text
                    style={{
                      width: 110,
                      textAlign: "right",
                      fontFamily: FMFonts.sansMedium,
                      fontSize: 12,
                      color: you > 0 ? t.neg : t.inkMuted,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {masked ? "··" : you ? formatEUR(you) : "—"}
                  </Text>
                  <View style={{ width: 130, alignItems: "flex-end" }}>
                    <Money value={p.netBalance} masked={masked} size={13} total={!settled} />
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <ManagePeopleModal
        visible={isManageModalVisible}
        entities={entities}
        onAdd={async (name) => addEntity(name, "person")}
        onUpdate={async (id, name) => updateEntity(id, name)}
        onDelete={async (id) => deleteEntity(id)}
        onClose={() => setManageModalVisible(false)}
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
        i18n={i18n}
      />
      <AddDebtModal
        visible={isAddDebtModalVisible}
        entities={entities}
        onAdd={addDebt}
        onClose={() => setAddDebtModalVisible(false)}
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
        i18n={i18n}
      />
      <DebtDetailModal
        visible={isDetailModalVisible}
        entity={detailEntity}
        debts={debts}
        netBalance={detailEntity ? getNetBalance(detailEntity.id) : 0}
        onClose={() => setDetailModalVisible(false)}
        backgroundColor={t.bg}
        textColor={t.ink}
        tintColor={t.accent}
        i18n={i18n}
      />
    </DesktopShell>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 18,
  },
  pageTitle: {
    fontFamily: FMFonts.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  netCard: {
    flex: 1.4,
    padding: 18,
    borderWidth: 1,
    borderRadius: 12,
  },
  statCard: {
    flex: 1,
    padding: 18,
    borderWidth: 1,
    borderRadius: 12,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
  },
  tableWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 16,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cellText: {
    fontFamily: FMFonts.sans,
    fontSize: 11,
  },
  empty: {
    paddingHorizontal: 18,
    paddingVertical: 40,
    alignItems: "center",
  },
});
