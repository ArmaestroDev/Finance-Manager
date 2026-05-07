import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import {
  Button,
  Field,
  IconBack,
  IconEdit,
  IconPlus,
  IconTrash,
  Label,
  useFMTheme,
} from "@/src/shared/design";

interface TransactionCategory {
  id: string;
  name: string;
  color: string;
  system?: "ignore";
}

interface CategoryManageModalProps {
  visible: boolean;
  categories: TransactionCategory[];
  categoryColors: string[];
  onAdd: (name: string, color: string) => Promise<void>;
  onUpdate: (id: string, updates: { name: string; color: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  backgroundColor?: string;
  textColor?: string;
  tintColor?: string;
}

export function CategoryManageModal({
  visible,
  categories,
  categoryColors,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}: CategoryManageModalProps) {
  const t = useFMTheme();
  const [editing, setEditing] = useState<{ id: string; name: string; color: string } | null>(null);

  const handleClose = () => {
    setEditing(null);
    onClose();
  };

  const handleDelete = (cat: TransactionCategory) => {
    const performDelete = async () => {
      await onDelete(cat.id);
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${cat.name}"?`)) performDelete();
    } else {
      Alert.alert("Delete category", `Delete "${cat.name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: performDelete },
      ]);
    }
  };

  if (editing) {
    return (
      <Sheet
        visible={visible}
        onClose={handleClose}
        title={editing.id ? "Edit category" : "New category"}
        width={500}
        leftActions={
          <Button variant="secondary" icon={<IconBack size={11} color={t.ink} />} onPress={() => setEditing(null)}>
            Back
          </Button>
        }
        actions={
          <Button
            variant="primary"
            disabled={!editing.name.trim()}
            onPress={async () => {
              if (!editing.name.trim()) return;
              if (editing.id) {
                await onUpdate(editing.id, { name: editing.name, color: editing.color });
              } else {
                await onAdd(editing.name, editing.color);
              }
              setEditing(null);
            }}
          >
            Save
          </Button>
        }
      >
        <Field
          label="Name"
          placeholder="Groceries, Rent, …"
          value={editing.name}
          onChangeText={(s) => setEditing({ ...editing, name: s })}
        />
        <Label style={{ marginBottom: 8 }}>Color</Label>
        <View style={styles.swatchRow}>
          {categoryColors.map((c) => {
            const active = editing.color === c;
            return (
              <Pressable
                key={c}
                onPress={() => setEditing({ ...editing, color: c })}
                style={({ pressed }) => [
                  styles.swatch,
                  {
                    backgroundColor: c,
                    borderColor: active ? t.ink : "transparent",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              />
            );
          })}
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title="Manage categories"
      subtitle={`${categories.length} categories · 12-color palette`}
      width={520}
      leftActions={
        <Button
          variant="secondary"
          icon={<IconPlus size={11} color={t.ink} />}
          onPress={() => setEditing({ id: "", name: "", color: categoryColors[0] })}
        >
          New category
        </Button>
      }
      actions={<Button variant="primary" onPress={handleClose}>Done</Button>}
    >
      <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
        {categories.length === 0 ? (
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 12,
              color: t.inkMuted,
              textAlign: "center",
              paddingVertical: 18,
            }}
          >
            No categories yet.
          </Text>
        ) : (
          categories.map((cat, i) => (
            <View
              key={cat.id}
              style={[
                styles.row,
                {
                  borderTopColor: t.line,
                  borderTopWidth: i === 0 ? 0 : 1,
                },
              ]}
            >
              <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: cat.color }} />
              <Text style={{ flex: 1, fontFamily: FMFonts.sansMedium, fontSize: 13, color: t.ink, marginLeft: 12 }}>
                {cat.name}
              </Text>
              <Pressable
                onPress={() => setEditing({ id: cat.id, name: cat.name, color: cat.color })}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
              >
                <IconEdit size={13} color={t.inkSoft} />
              </Pressable>
              {cat.system === "ignore" ? (
                <View
                  style={[
                    styles.systemPill,
                    { backgroundColor: t.surfaceAlt, borderColor: t.line },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: FMFonts.sansSemibold,
                      fontSize: 9,
                      color: t.inkMuted,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                    }}
                  >
                    system
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleDelete(cat)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
                >
                  <IconTrash size={13} color={t.neg} />
                </Pressable>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  systemPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    marginHorizontal: 6,
  },
});
