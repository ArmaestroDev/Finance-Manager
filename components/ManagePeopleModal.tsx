import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { DebtEntity } from "../context/DebtsContext";

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

export function ManagePeopleModal({
  visible,
  entities,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
  backgroundColor,
  textColor,
  tintColor,
  i18n,
}: ManagePeopleModalProps) {
  const [newEntityName, setNewEntityName] = useState("");
  const [editingEntity, setEditingEntity] = useState<DebtEntity | null>(null);

  const handleAddEntity = async () => {
    if (!newEntityName.trim()) return;
    await onAdd(newEntityName.trim());
    setNewEntityName("");
  };

  const handleUpdateEntity = async () => {
    if (!editingEntity || !newEntityName.trim()) return;
    await onUpdate(editingEntity.id, newEntityName.trim());
    setEditingEntity(null);
    setNewEntityName("");
  };

  const handleDeleteEntity = (id: string, name: string) => {
    const performDelete = async () => {
      await onDelete(id);
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
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
              placeholder={i18n.new_person_name}
              placeholderTextColor={textColor + "50"}
              value={newEntityName}
              onChangeText={setNewEntityName}
            />
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: tintColor }]}
              onPress={
                editingEntity ? handleUpdateEntity : handleAddEntity
              }
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
            onPress={onClose}
          >
            <Text style={{ color: textColor }}>{i18n.close}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
});
