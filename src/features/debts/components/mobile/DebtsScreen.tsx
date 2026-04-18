import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DebtEntity, useDebts } from "../../context/DebtsContext";
import { useSettings } from "../../../../shared/context/SettingsContext";
import { useThemeColor } from "../../../../shared/hooks/use-theme-color";
import { AddDebtModal } from "../AddDebtModal";
import { DebtDetailModal } from "../DebtDetailModal";
import { ManagePeopleModal } from "../ManagePeopleModal";

export function DebtsScreen() {
  const { entities, debts, addEntity, updateEntity, deleteEntity, addDebt, getNetBalance } = useDebts();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const { i18n } = useSettings();

  const [isManageModalVisible, setManageModalVisible] = useState(false);
  const [isAddDebtModalVisible, setAddDebtModalVisible] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [detailEntity, setDetailEntity] = useState<DebtEntity | null>(null);

  const entitiesWithBalance = useMemo(() => {
    return entities.map((e) => ({ ...e, netBalance: getNetBalance(e.id) }));
  }, [entities, debts, getNetBalance]);

  const totalNet = useMemo(() => {
    return entitiesWithBalance.reduce((acc, e) => acc + e.netBalance, 0);
  }, [entitiesWithBalance]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Math.abs(amount));

  const openDetail = (entity: DebtEntity) => {
    setDetailEntity(entity);
    setDetailModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ManagePeopleModal
        visible={isManageModalVisible}
        entities={entities}
        onAdd={async (name) => addEntity(name, "person")}
        onUpdate={async (id, name) => updateEntity(id, name)}
        onDelete={async (id) => deleteEntity(id)}
        onClose={() => setManageModalVisible(false)}
        backgroundColor={backgroundColor}
        textColor={textColor}
        tintColor={tintColor}
        i18n={i18n}
      />
      <AddDebtModal
        visible={isAddDebtModalVisible}
        entities={entities}
        onAdd={addDebt}
        onClose={() => setAddDebtModalVisible(false)}
        backgroundColor={backgroundColor}
        textColor={textColor}
        tintColor={tintColor}
        i18n={i18n}
      />
      <DebtDetailModal
        visible={isDetailModalVisible}
        entity={detailEntity}
        debts={debts}
        netBalance={detailEntity ? getNetBalance(detailEntity.id) : 0}
        onClose={() => setDetailModalVisible(false)}
        backgroundColor={backgroundColor}
        textColor={textColor}
        tintColor={tintColor}
        i18n={i18n}
      />
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>{i18n.debts_title}</Text>
        <TouchableOpacity
          onPress={() => setManageModalVisible(true)}
          style={[styles.headerButton, { backgroundColor: tintColor + "20" }]}
        >
          <Ionicons name="people" size={20} color={tintColor} />
        </TouchableOpacity>
      </View>
      <View style={styles.summaryCard}>
        <Text style={[styles.summaryLabel, { color: textColor + "80" }]}>{i18n.total_net_position}</Text>
        <Text style={[styles.summaryValue, { color: totalNet >= 0 ? "#2ecc71" : "#e74c3c" }]}>
          {totalNet < 0 ? "-" : "+"}
          {formatCurrency(totalNet)}
        </Text>
      </View>
      <FlatList
        data={entitiesWithBalance}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ color: textColor, opacity: 0.5 }}>{i18n.no_people}</Text>
            <TouchableOpacity onPress={() => setManageModalVisible(true)} style={{ marginTop: 12 }}>
              <Text style={{ color: tintColor, fontWeight: "600" }}>{i18n.manage_people}</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.entityCard, { backgroundColor: tintColor + "12" }]}
            onPress={() => openDetail(item)}
          >
            <View style={styles.entityInfo}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: tintColor }]}>
                <Text style={{ color: backgroundColor, fontWeight: "bold" }}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.entityName, { color: textColor }]}>{item.name}</Text>
            </View>
            <View style={styles.balanceContainer}>
              {item.netBalance !== 0 ? (
                <>
                  <Text style={{ color: item.netBalance > 0 ? "#2ecc71" : "#e74c3c", fontWeight: "bold" }}>
                    {item.netBalance > 0 ? i18n.owes_me : i18n.i_owe}
                  </Text>
                  <Text style={{ color: item.netBalance > 0 ? "#2ecc71" : "#e74c3c", fontSize: 16, fontWeight: "600" }}>
                    {formatCurrency(item.netBalance)}
                  </Text>
                </>
              ) : (
                <Text style={{ color: textColor, opacity: 0.5 }}>{i18n.settled}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: tintColor }]}
        onPress={() => {
          if (entities.length === 0) {
            Alert.alert(i18n.add_person_alert_title, i18n.add_person_alert_msg, [
              { text: i18n.cancel, style: "cancel" },
              { text: i18n.add_person_btn, onPress: () => setManageModalVisible(true) },
            ]);
          } else {
            setAddDebtModalVisible(true);
          }
        }}
      >
        <Ionicons name="add" size={24} color={backgroundColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80 },
  header: { marginBottom: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24 },
  title: { fontSize: 32, fontWeight: "800" },
  headerButton: { padding: 12, borderRadius: 24 },
  summaryCard: { marginHorizontal: 24, marginBottom: 24, padding: 24, backgroundColor: "#FFFFFF", borderRadius: 24, alignItems: "center", shadowColor: "#8E1E5E", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  summaryLabel: { fontSize: 14, marginBottom: 8, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { fontSize: 36, fontWeight: "800" },
  emptyState: { alignItems: "center", marginTop: 64 },
  entityCard: { flexDirection: "row", padding: 20, marginBottom: 16, borderRadius: 20, alignItems: "center", justifyContent: "space-between" },
  entityInfo: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  entityName: { fontSize: 18, fontWeight: "600" },
  balanceContainer: { alignItems: "flex-end" },
  fab: { position: "absolute", bottom: 32, right: 24, width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#8E1E5E", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 },
});
