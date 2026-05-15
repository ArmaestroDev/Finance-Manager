import { Stack } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { MobileShell } from "@/src/shared/components/MobileShell";
import {
  Chip,
  IconPeople,
  IconPlus,
  Label,
  Money,
  Pill,
  formatEUR,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { DebtEntity, useDebts } from "../../context/DebtsContext";
import { useDebtsSummary } from "../../hooks/useDebtsSummary";
import { AddDebtModal } from "./AddDebtModal";
import { DebtDetailModal } from "./DebtDetailModal";
import { ManagePeopleModal } from "./ManagePeopleModal";

export function DebtsScreen() {
  const t = useFMTheme();
  const { entities, debts, addEntity, updateEntity, deleteEntity, addDebt, getNetBalance } =
    useDebts();
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
  const heroExplain =
    totalNet < 0
      ? "You owe more than you are owed."
      : totalNet > 0
        ? "You are owed more than you owe."
        : "Settled overall.";

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
          {
            text: i18n.add_person_btn ?? "Add person",
            onPress: () => setManageModalVisible(true),
          },
        ],
      );
    } else {
      setAddDebtModalVisible(true);
    }
  };

  return (
    <MobileShell
      title={i18n.debts_title}
      sub={`${activeCount} active · ${settledCount} settled`}
      right={
        <>
          <Chip
            icon={<IconPlus size={11} color={t.inkSoft} />}
            onPress={handleAddPress}
          >
            {i18n.add_btn ? i18n.add_btn.replace(/^\+\s*/, "") : "Add"}
          </Chip>
          <Pressable
            onPress={() => setManageModalVisible(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
          >
            <IconPeople size={18} color={t.inkSoft} />
          </Pressable>
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View>
        {/* Summary header */}
        <View style={[styles.netCard, { backgroundColor: heroBg, borderColor: t.line }]}>
          <Label>{i18n.total_net_position}</Label>
          <View style={styles.heroRow}>
            <Text
              style={{
                fontFamily: FMFonts.display,
                fontSize: 38,
                color: heroFg,
                lineHeight: 40,
                letterSpacing: -0.6,
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
                fontSize: 18,
                color: t.inkSoft,
                marginLeft: 4,
              }}
            >
              €
            </Text>
          </View>
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 11.5,
              color: t.inkSoft,
              marginTop: 6,
            }}
          >
            {heroExplain}
          </Text>
        </View>

        {/* They owe you / You owe stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Label>{i18n.they_owe_you ?? "They owe you"}</Label>
            <Text
              style={{
                fontFamily: FMFonts.monoSemibold,
                fontSize: 18,
                color: t.pos,
                marginTop: 6,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatEUR(owedToYou, { masked })}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Label>{i18n.you_owe ?? "You owe"}</Label>
            <Text
              style={{
                fontFamily: FMFonts.monoSemibold,
                fontSize: 18,
                color: t.neg,
                marginTop: 6,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatEUR(Math.abs(youOwe), { masked })}
            </Text>
          </View>
        </View>

        <Label style={{ marginTop: 18, marginBottom: 8 }}>
          People & institutions
        </Label>

        {entitiesWithBalance.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: t.surface, borderColor: t.lineStrong }]}>
            <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 14, color: t.ink }}>
              {i18n.no_people_added ?? "No people yet"}
            </Text>
            <Text
              style={{
                fontFamily: FMFonts.sans,
                fontSize: 12,
                color: t.inkSoft,
                marginTop: 4,
                textAlign: "center",
                lineHeight: 18,
              }}
            >
              Add people or institutions to track who owes whom.
            </Text>
            <Pressable
              onPress={() => setManageModalVisible(true)}
              style={({ pressed }) => [
                styles.emptyBtn,
                { backgroundColor: t.ink, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <IconPeople size={12} color={t.bg} />
              <Text
                style={{
                  fontFamily: FMFonts.sansMedium,
                  fontSize: 13,
                  color: t.bg,
                  marginLeft: 6,
                }}
              >
                {i18n.manage_people}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.tableWrap, { backgroundColor: t.surface, borderColor: t.line }]}>
            {entitiesWithBalance.map((p, index) => {
              const settled = p.netBalance === 0;
              const isInstitution = p.type === "institution";
              const they = debts
                .filter((d) => d.entityId === p.id && d.type === "OWES_ME")
                .reduce((s, d) => s + d.amount, 0);
              const you = debts
                .filter((d) => d.entityId === p.id && d.type === "I_OWE")
                .reduce((s, d) => s + d.amount, 0);
              const subParts: string[] = [];
              if (they > 0)
                subParts.push(
                  `${i18n.they_owe_you ?? "They owe you"} ${formatEUR(they, { masked })}`,
                );
              if (you > 0)
                subParts.push(
                  `${i18n.you_owe ?? "You owe"} ${formatEUR(you, { masked })}`,
                );
              const subLine =
                subParts.length > 0
                  ? subParts.join("  ·  ")
                  : isInstitution
                    ? "Institution"
                    : "Person";
              return (
                <Pressable
                  key={p.id}
                  onPress={() => openDetail(p)}
                  style={({ pressed }) => [
                    styles.entityRow,
                    {
                      borderTopColor: t.line,
                      borderTopWidth: index === 0 ? 0 : 1,
                      opacity: settled ? 0.6 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
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
                        fontSize: 13,
                        color: isInstitution ? t.inkSoft : t.accent,
                      }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                    <View style={styles.nameRow}>
                      <Text
                        style={{
                          fontFamily: FMFonts.sansSemibold,
                          fontSize: 13.5,
                          color: t.ink,
                          flexShrink: 1,
                        }}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                      {settled ? (
                        <Pill style={{ marginLeft: 8 }}>
                          {i18n.settled ?? "Settled"}
                        </Pill>
                      ) : null}
                    </View>
                    <Text
                      style={{
                        fontFamily: FMFonts.sans,
                        fontSize: 10.5,
                        color: t.inkMuted,
                        marginTop: 3,
                      }}
                      numberOfLines={1}
                    >
                      {subLine}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
                    <Money
                      value={p.netBalance}
                      masked={masked}
                      size={14}
                      total={!settled}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
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
  netCard: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderRadius: 12,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  tableWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  entityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderTopWidth: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  empty: {
    padding: 28,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
});
