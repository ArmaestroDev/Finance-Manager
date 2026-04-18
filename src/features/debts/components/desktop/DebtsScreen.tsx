import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DebtEntity, useDebts } from "../../context/DebtsContext";
import { useSettings } from "../../../../shared/context/SettingsContext";
import { useThemeColor } from "../../../../shared/hooks/use-theme-color";
import { AddDebtModal } from "./AddDebtModal";
import { DebtDetailModal } from "./DebtDetailModal";
import { ManagePeopleModal } from "./ManagePeopleModal";

export function DebtsScreen() {
  const { entities, debts, addEntity, updateEntity, deleteEntity, addDebt, getNetBalance } = useDebts();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const surfaceColor = useThemeColor({}, "surface");
  const { i18n } = useSettings();

  const [isManageModalVisible, setManageModalVisible] = useState(false);
  const [isAddDebtModalVisible, setAddDebtModalVisible] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [detailEntity, setDetailEntity] = useState<DebtEntity | null>(null);

  const entitiesWithBalance = useMemo(() => entities.map((e) => ({ ...e, netBalance: getNetBalance(e.id) })), [entities, debts, getNetBalance]);
  const totalNet = useMemo(() => entitiesWithBalance.reduce((acc, e) => acc + e.netBalance, 0), [entitiesWithBalance]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Math.abs(amount));

  const openDetail = (entity: DebtEntity) => { setDetailEntity(entity); setDetailModalVisible(true); };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ManagePeopleModal visible={isManageModalVisible} entities={entities} onAdd={async (name) => addEntity(name, "person")} onUpdate={async (id, name) => updateEntity(id, name)} onDelete={async (id) => deleteEntity(id)} onClose={() => setManageModalVisible(false)} backgroundColor={backgroundColor} textColor={textColor} tintColor={tintColor} i18n={i18n} />
      <AddDebtModal visible={isAddDebtModalVisible} entities={entities} onAdd={addDebt} onClose={() => setAddDebtModalVisible(false)} backgroundColor={backgroundColor} textColor={textColor} tintColor={tintColor} i18n={i18n} />
      <DebtDetailModal visible={isDetailModalVisible} entity={detailEntity} debts={debts} netBalance={detailEntity ? getNetBalance(detailEntity.id) : 0} onClose={() => setDetailModalVisible(false)} backgroundColor={backgroundColor} textColor={textColor} tintColor={tintColor} i18n={i18n} />

      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: textColor + "10" }]}>
        <Text style={[styles.pageTitle, { color: textColor }]}>{i18n.debts_title}</Text>
        <View style={styles.topActions}>
          <TouchableOpacity
            style={[styles.topBtn, { backgroundColor: tintColor }]}
            onPress={() => {
              if (entities.length === 0) {
                Alert.alert("No People", "Please add a person first.", [{ text: "Cancel", style: "cancel" }, { text: "Add Person", onPress: () => setManageModalVisible(true) }]);
              } else {
                setAddDebtModalVisible(true);
              }
            }}
          >
            <Ionicons name="add" size={18} color={backgroundColor} />
            <Text style={{ color: backgroundColor, fontWeight: "600", fontSize: 13 }}>Add Debt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.topBtn, { backgroundColor: textColor + "10" }]} onPress={() => setManageModalVisible(true)}>
            <Ionicons name="people" size={18} color={textColor} />
            <Text style={{ color: textColor, fontWeight: "600", fontSize: 13 }}>{i18n.manage_people}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Two-column: summary left, list right */}
      <View style={styles.twoColumn}>
        {/* Left: summary */}
        <View style={[styles.leftPanel, { borderRightColor: textColor + "10" }]}>
          <Text style={[styles.sectionLabel, { color: textColor }]}>NET POSITION</Text>
          <Text style={[styles.totalAmount, { color: totalNet >= 0 ? "#2ecc71" : "#e74c3c" }]}>
            {totalNet < 0 ? "-" : "+"}{formatCurrency(totalNet)}
          </Text>
          <View style={[styles.summaryBreakdown, { backgroundColor: surfaceColor }]}>
            <View style={styles.breakRow}>
              <Text style={{ color: "#2ecc71", fontSize: 13, fontWeight: "600" }}>They owe you</Text>
              <Text style={{ color: "#2ecc71", fontWeight: "700" }}>
                +{formatCurrency(entitiesWithBalance.filter(e => e.netBalance > 0).reduce((s, e) => s + e.netBalance, 0))}
              </Text>
            </View>
            <View style={[styles.breakDivider, { backgroundColor: textColor + "10" }]} />
            <View style={styles.breakRow}>
              <Text style={{ color: "#e74c3c", fontSize: 13, fontWeight: "600" }}>You owe</Text>
              <Text style={{ color: "#e74c3c", fontWeight: "700" }}>
                -{formatCurrency(entitiesWithBalance.filter(e => e.netBalance < 0).reduce((s, e) => s + Math.abs(e.netBalance), 0))}
              </Text>
            </View>
          </View>
          <Text style={[styles.hint, { color: textColor }]}>
            {entities.length} {entities.length === 1 ? "person" : "people"} tracked
          </Text>
        </View>

        {/* Right: entities table */}
        <View style={styles.rightPanel}>
          {/* Table header */}
          <View style={[styles.tableHeader, { borderBottomColor: textColor + "15" }]}>
            <Text style={[styles.th, { color: textColor }]}>Person</Text>
            <Text style={[styles.th, { color: textColor }]}>Status</Text>
            <Text style={[styles.thRight, { color: textColor }]}>Net Balance</Text>
          </View>
          <FlatList
            data={entitiesWithBalance}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 48 }}>🤝</Text>
                <Text style={{ color: textColor, opacity: 0.5, marginTop: 12, fontSize: 15 }}>{i18n.no_people}</Text>
                <TouchableOpacity onPress={() => setManageModalVisible(true)} style={{ marginTop: 12 }}>
                  <Text style={{ color: tintColor, fontWeight: "600" }}>{i18n.manage_people}</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.entityRow, { borderBottomColor: textColor + "08" }]}
                onPress={() => openDetail(item)}
                activeOpacity={0.7}
              >
                <View style={styles.personCell}>
                  <View style={[styles.avatar, { backgroundColor: tintColor }]}>
                    <Text style={{ color: backgroundColor, fontWeight: "700" }}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.personName, { color: textColor }]}>{item.name}</Text>
                </View>
                <Text style={{ color: item.netBalance > 0 ? "#2ecc71" : item.netBalance < 0 ? "#e74c3c" : textColor, opacity: item.netBalance === 0 ? 0.4 : 1, fontSize: 13, fontWeight: "500" }}>
                  {item.netBalance > 0 ? i18n.owes_me : item.netBalance < 0 ? i18n.i_owe : i18n.settled}
                </Text>
                <Text style={[styles.balanceCell, { color: item.netBalance >= 0 ? "#2ecc71" : "#e74c3c" }]}>
                  {item.netBalance !== 0 ? `${item.netBalance > 0 ? "+" : "-"}${formatCurrency(item.netBalance)}` : "—"}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={textColor + "30"} />
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 32, paddingVertical: 20, borderBottomWidth: 1 },
  pageTitle: { fontSize: 26, fontWeight: "800" },
  topActions: { flexDirection: "row", gap: 10 },
  topBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  twoColumn: { flex: 1, flexDirection: "row" },
  leftPanel: { width: 280, padding: 24, borderRightWidth: 1 },
  rightPanel: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, opacity: 0.5, marginBottom: 8 },
  totalAmount: { fontSize: 36, fontWeight: "800", marginBottom: 20 },
  summaryBreakdown: { borderRadius: 14, padding: 16, gap: 12, marginBottom: 16 },
  breakRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakDivider: { height: 1 },
  hint: { opacity: 0.4, fontSize: 12 },
  tableHeader: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, marginBottom: 4 },
  th: { flex: 1, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.5 },
  thRight: { width: 120, textAlign: "right", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.5 },
  entityRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 16 },
  personCell: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  personName: { fontSize: 15, fontWeight: "600" },
  balanceCell: { width: 120, textAlign: "right", fontSize: 15, fontWeight: "700" },
  emptyState: { alignItems: "center", marginTop: 80 },
});
