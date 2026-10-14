import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import type { Strings } from "@/src/constants/Strings";
import { Sheet } from "@/src/shared/components/Sheet";
import {
  Avatar,
  Button,
  EmptyState,
  Field,
  IconBank,
  IconButton,
  IconCheck,
  IconEdit,
  IconPeople,
  IconPlus,
  IconTrash,
  ListItem,
  useFMTheme,
} from "@/src/shared/design";
import { showAlert } from "@/src/shared/utils/alert";
import type { DebtEntity } from "../context/DebtsContext";

interface ManagePeopleModalProps {
  visible: boolean;
  entities: DebtEntity[];
  onAdd: (name: string) => Promise<void> | Promise<string>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  i18n: typeof Strings.de;
}

// Add / rename / delete people. The name field doubles as the rename field
// while a row is selected for editing.
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

  const cancelEdit = () => {
    setEditingEntity(null);
    setNewEntityName("");
  };

  const submit = async () => {
    const name = newEntityName.trim();
    if (!name) return;
    if (editingEntity) {
      await onUpdate(editingEntity.id, name);
      setEditingEntity(null);
    } else {
      await onAdd(name);
    }
    setNewEntityName("");
  };

  const handleDeleteEntity = (id: string, name: string) => {
    const performDelete = async () => {
      await onDelete(id);
      if (editingEntity?.id === id) cancelEdit();
    };
    showAlert(i18n.debt_delete_person_title, i18n.debt_delete_person_long.replace("{name}", name), [
      { text: i18n.cancel, style: "cancel" },
      { text: i18n.delete, style: "destructive", onPress: performDelete },
    ]);
  };

  const handleClose = () => {
    cancelEdit();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={handleClose} title={i18n.manage_people_title} width={500}>
      <View style={styles.addRow}>
        <Field
          label={editingEntity ? i18n.debt_rename_label : i18n.name_label}
          placeholder={i18n.debt_person_placeholder}
          value={newEntityName}
          onChangeText={setNewEntityName}
          onSubmitEditing={submit}
          containerStyle={{ flex: 1, marginBottom: 0 }}
        />
        {editingEntity ? (
          <Button variant="text" onPress={cancelEdit}>
            {i18n.cancel}
          </Button>
        ) : null}
        <Button
          variant="tonal"
          icon={editingEntity ? <IconCheck size={16} /> : <IconPlus size={16} />}
          onPress={submit}
          disabled={!newEntityName.trim()}
          style={{ height: 48 }}
        >
          {editingEntity ? i18n.save : i18n.add_short}
        </Button>
      </View>

      <View style={{ marginTop: 16, marginBottom: 8, marginHorizontal: -24 }}>
        {entities.length === 0 ? (
          <EmptyState icon={<IconPeople />} title={i18n.debt_no_people_yet} style={{ paddingVertical: 16 }} />
        ) : (
          entities.map((item) => {
            const isInstitution = item.type === "institution";
            return (
              <ListItem
                key={item.id}
                selected={editingEntity?.id === item.id}
                leading={
                  <Avatar
                    size={36}
                    label={item.name}
                    icon={isInstitution ? <IconBank size={16} color={t.onPrimaryContainer} /> : undefined}
                  />
                }
                title={item.name}
                style={{ paddingHorizontal: 24 }}
                trailing={
                  <View style={{ flexDirection: "row" }}>
                    <IconButton
                      icon={<IconEdit size={18} />}
                      label={`${i18n.edit}: ${item.name}`}
                      onPress={() => {
                        setEditingEntity(item);
                        setNewEntityName(item.name);
                      }}
                    />
                    <IconButton
                      icon={<IconTrash size={18} color={t.error} />}
                      label={`${i18n.delete}: ${item.name}`}
                      onPress={() => handleDeleteEntity(item.id, item.name)}
                    />
                  </View>
                }
              />
            );
          })
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  addRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
});
