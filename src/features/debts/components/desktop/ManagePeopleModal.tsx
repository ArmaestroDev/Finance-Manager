import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { DebtEntity } from "../../context/DebtsContext";

interface ManagePeopleModalProps {
  visible: boolean;
  entities: DebtEntity[];
  onAdd: (name: string) => Promise<void> | Promise<string>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  backgroundColor: string;
  textColor: string;
  tintColor: string;
  i18n: Record<string, string>;
}

export function ManagePeopleModal({ visible, entities, onAdd, onUpdate, onDelete, onClose, backgroundColor, textColor, tintColor, i18n }: ManagePeopleModalProps) {
  const [newEntityName, setNewEntityName] = useState("");
  const [editingEntity, setEditingEntity] = useState<DebtEntity | null>(null);

  const handleAdd = async () => {
    if (!newEntityName.trim()) return;
    await onAdd(newEntityName.trim());
    setNewEntityName("");
  };

  const handleUpdate = async () => {
    if (!editingEntity || !newEntityName.trim()) return;
    await onUpdate(editingEntity.id, newEntityName.trim());
    setEditingEntity(null);
    setNewEntityName("");
  };

  const handleDelete = (id: string, name: string) => {
    const performDelete = async () => { await onDelete(id); if (editingEntity?.id === id) { setEditingEntity(null); setNewEntityName(""); } };
    if (Platform.OS === "web") { if (window.confirm(`Delete ${name} and all associated debts?`)) performDelete(); }
    else { Alert.alert("Delete", `Delete "${name}" and all debts?`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: performDelete }]); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>{i18n.manage_people_title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={textColor} /></TouchableOpacity>
          </View>

          {/* Add / Edit form */}
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { color: textColor, borderColor: editingEntity ? tintColor : textColor + "25", backgroundColor: textColor + "08" }]}
              placeholder={i18n.new_person_name}
              placeholderTextColor={textColor + "50"}
              value={newEntityName}
              onChangeText={setNewEntityName}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: tintColor }]}
              onPress={editingEntity ? handleUpdate : handleAdd}
            >
              <Ionicons name={editingEntity ? "checkmark" : "add"} size={20} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                {editingEntity ? "Update" : "Add"}
              </Text>
            </TouchableOpacity>
            {editingEntity && (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: textColor + "20" }]}
                onPress={() => { setEditingEntity(null); setNewEntityName(""); }}
              >
                <Ionicons name="close" size={18} color={textColor} />
              </TouchableOpacity>
            )}
          </View>

          {/* People list */}
          <View style={[styles.tableHeader, { borderBottomColor: textColor + "15" }]}>
            <Text style={[styles.thText, { color: textColor }]}>Name</Text>
            <Text style={[styles.thText, { color: textColor }]}>Actions</Text>
          </View>
          <FlatList
            data={entities}
            keyExtractor={(item) => item.id}
            style={styles.list}
            ListEmptyComponent={
              <Text style={{ color: textColor, opacity: 0.5, textAlign: "center", marginTop: 32 }}>No people added yet</Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.personRow, { borderBottomColor: textColor + "10" }, editingEntity?.id === item.id && { backgroundColor: tintColor + "08" }]}>
                <View style={[styles.avatar, { backgroundColor: tintColor }]}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={[styles.personName, { color: textColor }]}>{item.name}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => { setEditingEntity(item); setNewEntityName(item.name); }} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={16} color={tintColor} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 500, maxHeight: "75%", borderRadius: 20, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "700" },
  addRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  input: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 11, fontSize: 15 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10 },
  tableHeader: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, marginBottom: 4 },
  thText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.5 },
  list: { flex: 1 },
  personRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  personName: { flex: 1, fontSize: 15, fontWeight: "500" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 8 },
});
