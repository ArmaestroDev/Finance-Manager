import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DebtEntity, useDebts } from "../../context/DebtsContext";
import { useSettings } from "../../context/SettingsContext";
import { useThemeColor } from "../../hooks/use-theme-color";

// ── Components ──
import { AddDebtModal } from "../../components/AddDebtModal";
import { DebtDetailModal } from "../../components/DebtDetailModal";
import { ManagePeopleModal } from "../../components/ManagePeopleModal";

export default function DebtsScreen() {
  const {
    entities,
    debts,
    addEntity,
    updateEntity,
    deleteEntity,
    addDebt,
    getNetBalance,
  } = useDebts();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const { i18n } = useSettings();

  // ── UI-only modal state ──
  const [isManageModalVisible, setManageModalVisible] = useState(false);
  const [isAddDebtModalVisible, setAddDebtModalVisible] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [detailEntity, setDetailEntity] = useState<DebtEntity | null>(null);

  // ── Computed data ──
  const entitiesWithBalance = useMemo(() => {
    return entities.map((e) => ({
      ...e,
      netBalance: getNetBalance(e.id),
    }));
  }, [entities, debts, getNetBalance]);

  const totalNet = useMemo(() => {
    return entitiesWithBalance.reduce((acc, e) => acc + e.netBalance, 0);
  }, [entitiesWithBalance]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(Math.abs(amount));
  };

  const openDetail = (entity: DebtEntity) => {
    setDetailEntity(entity);
    setDetailModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── All Modals ── */}
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

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>
          {i18n.debts_title}
        </Text>
        <TouchableOpacity
          onPress={() => setManageModalVisible(true)}
          style={[styles.headerButton, { backgroundColor: tintColor + "20" }]}
        >
          <Ionicons name="people" size={20} color={tintColor} />
        </TouchableOpacity>
      </View>

      {/* ── Summary ── */}
      <View style={styles.summaryCard}>
        <Text style={[styles.summaryLabel, { color: textColor + "80" }]}>
          {i18n.total_net_position}
        </Text>
        <Text
          style={[
            styles.summaryValue,
            { color: totalNet >= 0 ? "#2ecc71" : "#e74c3c" },
          ]}
        >
          {totalNet < 0 ? "-" : "+"}
          {formatCurrency(totalNet)}
        </Text>
      </View>

      {/* ── Entity List ── */}
      <FlatList
        data={entitiesWithBalance}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ color: textColor, opacity: 0.5 }}>
              {i18n.no_people}
            </Text>
            <TouchableOpacity
              onPress={() => setManageModalVisible(true)}
              style={{ marginTop: 12 }}
            >
              <Text style={{ color: tintColor, fontWeight: "600" }}>
                {i18n.manage_people}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.entityCard, { backgroundColor: tintColor + "12" }]}
            onPress={() => openDetail(item)}
          >
            <View style={styles.entityInfo}>
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: tintColor },
                ]}
              >
                <Text style={{ color: backgroundColor, fontWeight: "bold" }}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.entityName, { color: textColor }]}>
                {item.name}
              </Text>
            </View>
            <View style={styles.balanceContainer}>
              {item.netBalance !== 0 ? (
                <>
                  <Text
                    style={{
                      color: item.netBalance > 0 ? "#2ecc71" : "#e74c3c",
                      fontWeight: "bold",
                    }}
                  >
                    {item.netBalance > 0 ? i18n.owes_me : i18n.i_owe}
                  </Text>
                  <Text
                    style={{
                      color: item.netBalance > 0 ? "#2ecc71" : "#e74c3c",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {formatCurrency(item.netBalance)}
                  </Text>
                </>
              ) : (
                <Text style={{ color: textColor, opacity: 0.5 }}>
                  {i18n.settled}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: tintColor }]}
        onPress={() => {
          if (entities.length === 0) {
            Alert.alert("No People", "Please add a person first.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Add Person",
                onPress: () => setManageModalVisible(true),
              },
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
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  headerButton: {
    padding: 10,
    borderRadius: 20,
  },
  summaryCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 50,
  },
  entityCard: {
    flexDirection: "row",
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "space-between",
  },
  entityInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  entityName: {
    fontSize: 16,
    fontWeight: "600",
  },
  balanceContainer: {
    alignItems: "flex-end",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
