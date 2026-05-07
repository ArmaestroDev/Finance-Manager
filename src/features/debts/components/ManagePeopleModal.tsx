import React, { useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import {
  Button,
  Field,
  IconCheck,
  IconClose,
  IconEdit,
  IconPlus,
  IconTrash,
  useFMTheme,
} from "@/src/shared/design";
import type { DebtEntity } from "../context/DebtsContext";

interface ManagePeopleModalProps {
  visible: boolean;
  entities: DebtEntity[];
  onAdd: (name: string) => Promise<void> | Promise<string>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  backgroundColor?: string;
  textColor?: string;
  tintColor?: string;
  i18n: Record<string, string>;
}

export function ManagePeopleModal({
  visible,
  entities,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
  i18n,
}: ManagePeopleModalProps) {
  const t = useFMTheme();
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
      if (window.confirm(`Delete ${name} and all associated debts?`)) performDelete();
    } else {
      Alert.alert(
        "Delete entity",
        `Are you sure you want to delete "${name}"? This will delete all associated debts history.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: performDelete },
        ],
      );
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={i18n.manage_people_title ?? "Manage people"}
      width={500}
      actions={<Button variant="ghost" onPress={onClose}>{i18n.close}</Button>}
    >
      <View style={styles.addRow}>
        <View style={{ flex: 1 }}>
          <Field
            label={editingEntity ? "Rename" : (i18n.new_person_name ?? "New person")}
            placeholder="Anna, Mom, Tax office…"
            value={newEntityName}
            onChangeText={setNewEntityName}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 6, marginLeft: 8, marginTop: 18 }}>
          <Button
            variant="primary"
            icon={editingEntity ? <IconCheck size={11} color={t.bg} /> : <IconPlus size={11} color={t.bg} />}
            onPress={editingEntity ? handleUpdateEntity : handleAddEntity}
            disabled={!newEntityName.trim()}
          >
            {editingEntity ? "Save" : "Add"}
          </Button>
          {editingEntity ? (
            <Button
              variant="secondary"
              icon={<IconClose size={11} color={t.ink} />}
              onPress={() => {
                setEditingEntity(null);
                setNewEntityName("");
              }}
            >
              Cancel
            </Button>
          ) : null}
        </View>
      </View>

      <FlatList
        data={entities}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ marginTop: 14 }}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.row,
              {
                borderTopColor: t.line,
                borderTopWidth: index === 0 ? 0 : 1,
              },
            ]}
          >
            <Text style={{ flex: 1, fontFamily: FMFonts.sansMedium, fontSize: 13, color: t.ink }}>
              {item.name}
            </Text>
            <Pressable
              onPress={() => {
                setEditingEntity(item);
                setNewEntityName(item.name);
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
            >
              <IconEdit size={14} color={t.inkSoft} />
            </Pressable>
            <Pressable
              onPress={() => handleDeleteEntity(item.id, item.name)}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
            >
              <IconTrash size={14} color={t.neg} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkMuted, textAlign: "center", paddingVertical: 16 }}>
            No people yet.
          </Text>
        }
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  addRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  row: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
});
