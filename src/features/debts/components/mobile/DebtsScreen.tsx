import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
import {
  Chip,
  IconPeople,
  IconPlus,
  Label,
  Money,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { DebtEntity, useDebts } from "../../context/DebtsContext";
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

  const entitiesWithBalance = useMemo(
    () => entities.map((e) => ({ ...e, netBalance: getNetBalance(e.id) })),
    [entities, debts, getNetBalance],
  );

  const totalNet = useMemo(
    () => entitiesWithBalance.reduce((acc, e) => acc + e.netBalance, 0),
    [entitiesWithBalance],
  );

  const heroParts = splitForHero(totalNet, masked);
  const heroColor = totalNet > 0 ? t.pos : totalNet < 0 ? t.neg : t.ink;

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
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <MobileHeader
        title={i18n.debts_title}
        right={
          <>
            <Chip
              icon={<IconPlus size={11} color={t.inkSoft} />}
              onPress={handleAddPress}
            >
              Add
            </Chip>
            <Pressable
              onPress={() => setManageModalVisible(true)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
            >
              <IconPeople size={18} color={t.inkSoft} />
            </Pressable>
          </>
        }
      />

      <FlatList
        data={entitiesWithBalance}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={[styles.netCard, { backgroundColor: t.surface, borderColor: t.line }]}>
              <Label>{i18n.total_net_position}</Label>
              <View style={styles.heroRow}>
                <Text
                  style={{
                    fontFamily: FMFonts.display,
                    fontSize: 30,
                    color: heroColor,
                    lineHeight: 32,
                    letterSpacing: -0.5,
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
                  fontSize: 11,
                  color: t.inkSoft,
                  marginTop: 6,
                }}
              >
                {totalNet < 0
                  ? "You owe more than you are owed."
                  : totalNet > 0
                    ? "You are owed more than you owe."
                    : "Settled overall."}
              </Text>
            </View>

            <Label style={{ marginBottom: 6, marginTop: 4, paddingHorizontal: 2 }}>
              People & institutions
            </Label>
          </>
        }
        renderItem={({ item, index }) => {
          const settled = item.netBalance === 0;
          const isInstitution = item.type === "institution";
          const isFirst = index === 0;
          return (
            <Pressable
              onPress={() => openDetail(item)}
              style={({ pressed }) => [
                styles.entityRow,
                {
                  backgroundColor: t.surface,
                  borderColor: t.line,
                  borderTopWidth: isFirst ? 1 : 0,
                  opacity: settled ? 0.55 : pressed ? 0.85 : 1,
                  borderTopLeftRadius: isFirst ? 10 : 0,
                  borderTopRightRadius: isFirst ? 10 : 0,
                  borderBottomLeftRadius: index === entitiesWithBalance.length - 1 ? 10 : 0,
                  borderBottomRightRadius: index === entitiesWithBalance.length - 1 ? 10 : 0,
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
                    fontSize: 11,
                    color: isInstitution ? t.inkSoft : t.accent,
                  }}
                >
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13, color: t.ink }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ fontFamily: FMFonts.sans, fontSize: 10.5, color: t.inkMuted, marginTop: 2 }}>
                  {isInstitution ? "Institution" : "Person"}
                  {settled ? " · settled" : ""}
                </Text>
              </View>
              <Money value={item.netBalance} masked={masked} size={13} total={!settled} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: t.surface, borderColor: t.lineStrong }]}>
            <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 14, color: t.ink }}>
              {i18n.no_people ?? "No people yet"}
            </Text>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkSoft, marginTop: 4, textAlign: "center" }}>
              Add people or institutions to track who owes whom.
            </Text>
            <Pressable
              onPress={() => setManageModalVisible(true)}
              style={({ pressed }) => [
                styles.emptyBtn,
                { backgroundColor: t.ink, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 13, color: t.bg }}>
                {i18n.manage_people}
              </Text>
            </Pressable>
          </View>
        }
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 96 },
  netCard: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 14,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  entityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  empty: {
    padding: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
  },
  emptyBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
});
