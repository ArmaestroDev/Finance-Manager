import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { DebtEntity, useDebts } from "../../context/DebtsContext";
import { useSettings } from "../../context/SettingsContext"; // Added import
import { useThemeColor } from "../../hooks/use-theme-color";

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
  const { i18n } = useSettings(); // Added hook

  // Modals
  const [isManageModalVisible, setManageModalVisible] = useState(false);
  const [isAddDebtModalVisible, setAddDebtModalVisible] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);

  // Forms
  const [newEntityName, setNewEntityName] = useState("");
  const [editingEntity, setEditingEntity] = useState<DebtEntity | null>(null);

  // Debt Form
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtDesc, setDebtDesc] = useState("");
  const [debtDirection, setDebtDirection] = useState<"I_OWE" | "OWES_ME">(
    "I_OWE",
  );

  // Detail View
  const [detailEntity, setDetailEntity] = useState<DebtEntity | null>(null);

  // Calculate balances for list
  const entitiesWithBalance = useMemo(() => {
    return entities.map((e) => ({
      ...e,
      netBalance: getNetBalance(e.id),
    }));
  }, [entities, debts, getNetBalance]);

  // Total Net
  const totalNet = useMemo(() => {
    return entitiesWithBalance.reduce((acc, e) => acc + e.netBalance, 0);
  }, [entitiesWithBalance]);

  // Handlers - Entity
  const handleAddEntity = async () => {
    if (!newEntityName.trim()) return;
    await addEntity(newEntityName.trim(), "person");
    setNewEntityName("");
  };

  const handleUpdateEntity = async () => {
    if (!editingEntity || !newEntityName.trim()) return;
    await updateEntity(editingEntity.id, newEntityName.trim());
    setEditingEntity(null);
    setNewEntityName("");
  };

  const handleDeleteEntity = (id: string, name: string) => {
    const performDelete = async () => {
      await deleteEntity(id);
      if (editingEntity?.id === id) {
        setEditingEntity(null);
        setNewEntityName("");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Delete ${name} and all associated debts?`)) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Delete Entity",
        `Are you sure you want to delete "${name}"? This will delete all associated debts history.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: performDelete },
        ],
      );
    }
  };

  // Handlers - Debt
  const handleAddDebt = async () => {
    if (!selectedEntityId || !debtAmount) return;
    const amount = parseFloat(debtAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive amount.");
      return;
    }

    await addDebt(
      selectedEntityId,
      amount,
      debtDesc || "Debt",
      debtDirection,
      new Date().toISOString(),
    );

    setAddDebtModalVisible(false);
    setDebtAmount("");
    setDebtDesc("");
    setSelectedEntityId(null);
    setDebtDirection("I_OWE");
  };

  const openDetail = (entity: DebtEntity) => {
    setDetailEntity(entity);
    setDetailModalVisible(true);
  };

  const getEntityDebts = (entityId: string) => {
    return debts
      .filter((d) => d.entityId === entityId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(Math.abs(amount));
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
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

      {/* Manage People Modal */}
      <Modal
        visible={isManageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor, height: "70%" }]}
          >
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {i18n.manage_people_title}
            </Text>

            <View style={styles.addEntityRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: textColor,
                    borderColor: tintColor,
                    flex: 1,
                    marginBottom: 0,
                  },
                ]}
                placeholder={
                  editingEntity ? i18n.new_person_name : i18n.new_person_name
                }
                placeholderTextColor={textColor + "50"}
                value={newEntityName}
                onChangeText={setNewEntityName}
              />
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: tintColor }]}
                onPress={editingEntity ? handleUpdateEntity : handleAddEntity}
              >
                <Ionicons
                  name={editingEntity ? "checkmark" : "add"}
                  size={20}
                  color={backgroundColor}
                />
              </TouchableOpacity>
              {editingEntity && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: textColor + "50", marginLeft: 8 },
                  ]}
                  onPress={() => {
                    setEditingEntity(null);
                    setNewEntityName("");
                  }}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={entities}
              keyExtractor={(item) => item.id}
              style={{ marginTop: 16 }}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.manageRow,
                    { borderBottomColor: textColor + "10" },
                  ]}
                >
                  <Text style={{ color: textColor, flex: 1 }}>{item.name}</Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingEntity(item);
                        setNewEntityName(item.name);
                      }}
                    >
                      <Ionicons name="pencil" size={20} color={textColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteEntity(item.id, item.name)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#e74c3c"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />

            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: textColor + "10" },
              ]}
              onPress={() => setManageModalVisible(false)}
            >
              <Text style={{ color: textColor }}>{i18n.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Debt Modal */}
      <Modal
        visible={isAddDebtModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddDebtModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {i18n.add_debt_title}
            </Text>

            {/* Person Selector */}
            <Text style={[styles.label, { color: textColor }]}>
              {i18n.person_label}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16, maxHeight: 50 }}
            >
              {entities.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  onPress={() => setSelectedEntityId(e.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        selectedEntityId === e.id
                          ? tintColor
                          : textColor + "10",
                      borderColor:
                        selectedEntityId === e.id ? tintColor : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selectedEntityId === e.id ? "#fff" : textColor,
                    }}
                  >
                    {e.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: textColor }]}>
              {i18n.amount_label}
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: textColor, borderColor: tintColor },
              ]}
              placeholder="0.00"
              placeholderTextColor={textColor + "50"}
              keyboardType="numeric"
              value={debtAmount}
              onChangeText={setDebtAmount}
            />

            <Text style={[styles.label, { color: textColor }]}>
              {i18n.desc_label}
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: textColor, borderColor: tintColor },
              ]}
              placeholder={i18n.placeholder_desc}
              placeholderTextColor={textColor + "50"}
              value={debtDesc}
              onChangeText={setDebtDesc}
            />

            <Text style={[styles.label, { color: textColor }]}>
              {i18n.who_owes_who}
            </Text>
            <View style={styles.directionRow}>
              <TouchableOpacity
                style={[
                  styles.directionButton,
                  {
                    backgroundColor:
                      debtDirection === "I_OWE" ? "#e74c3c" : textColor + "10",
                    flex: 1,
                    marginRight: 8,
                  },
                ]}
                onPress={() => setDebtDirection("I_OWE")}
              >
                <Text
                  style={{
                    color: debtDirection === "I_OWE" ? "white" : textColor,
                  }}
                >
                  {i18n.i_owe_them}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.directionButton,
                  {
                    backgroundColor:
                      debtDirection === "OWES_ME"
                        ? "#2ecc71"
                        : textColor + "10",
                    flex: 1,
                    marginLeft: 8,
                  },
                ]}
                onPress={() => setDebtDirection("OWES_ME")}
              >
                <Text
                  style={{
                    color: debtDirection === "OWES_ME" ? "white" : textColor,
                  }}
                >
                  {i18n.they_owe_me}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setAddDebtModalVisible(false)}
                style={styles.modalButton}
              >
                <Text style={{ color: textColor }}>{i18n.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddDebt}
                style={[styles.modalButton, { backgroundColor: tintColor }]}
              >
                <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                  {i18n.save}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Entity Detail Modal (History) */}
      <Modal
        visible={isDetailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor, height: "80%" }]}
          >
            {detailEntity && (
              <>
                <View style={styles.detailHeader}>
                  <Text style={[styles.modalTitle, { color: textColor }]}>
                    {detailEntity.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setDetailModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color={textColor} />
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.detailNet,
                    { backgroundColor: tintColor + "12" },
                  ]}
                >
                  <Text style={{ color: textColor, fontSize: 12 }}>
                    {i18n.net_balance}
                  </Text>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "bold",
                      color:
                        getNetBalance(detailEntity.id) >= 0
                          ? "#2ecc71"
                          : "#e74c3c",
                    }}
                  >
                    {getNetBalance(detailEntity.id) >= 0
                      ? "They owe you "
                      : "You owe them "}
                    {formatCurrency(getNetBalance(detailEntity.id))}
                  </Text>
                </View>

                <Text
                  style={{
                    color: textColor,
                    marginTop: 16,
                    marginBottom: 8,
                    fontWeight: "600",
                  }}
                >
                  {i18n.history}
                </Text>

                <FlatList
                  data={getEntityDebts(detailEntity.id)}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ListEmptyComponent={
                    <Text
                      style={{
                        color: textColor,
                        opacity: 0.5,
                        textAlign: "center",
                        marginTop: 20,
                      }}
                    >
                      {i18n.no_history}
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <View
                      style={[
                        styles.historyRow,
                        { borderBottomColor: textColor + "10" },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: textColor, fontWeight: "500" }}>
                          {item.description}
                        </Text>
                        <Text
                          style={{
                            color: textColor,
                            opacity: 0.5,
                            fontSize: 12,
                          }}
                        >
                          {new Date(item.date).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color:
                            item.type === "OWES_ME" ? "#2ecc71" : "#e74c3c",
                          fontWeight: "600",
                        }}
                      >
                        {item.type === "OWES_ME" ? "+" : "-"}
                        {formatCurrency(item.amount)}
                      </Text>
                    </View>
                  )}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
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
    fontSize: 28, // Matched to accounts.tsx
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  addEntityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  manageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
    opacity: 0.7,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  directionRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  directionButton: {
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  detailNet: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
