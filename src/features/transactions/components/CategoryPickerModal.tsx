import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import {
  Button,
  Field,
  IconBack,
  IconCheck,
  IconClose,
  IconPlus,
  Label,
  useFMTheme,
} from "@/src/shared/design";

interface TransactionCategory {
  id: string;
  name: string;
  color: string;
}

interface CategoryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  categories: TransactionCategory[];
  categoryColors: string[];
  activeCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
  onCreate: (name: string, color: string) => Promise<string>;
}

type Mode = "list" | "create";

export function CategoryPickerModal({
  visible,
  onClose,
  categories,
  categoryColors,
  activeCategoryId,
  onSelect,
  onCreate,
}: CategoryPickerModalProps) {
  const t = useFMTheme();
  const [mode, setMode] = useState<Mode>("list");
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(categoryColors[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setMode("list");
    setSearch("");
    setNewName("");
    setNewColor(categoryColors[0]);
    setSubmitting(false);
    onClose();
  };

  const handleSelect = (id: string | null) => {
    onSelect(id);
    handleClose();
  };

  const handleEnterCreate = () => {
    setNewName(search.trim());
    setNewColor(categoryColors[0]);
    setMode("create");
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setSubmitting(true);
    try {
      const newId = await onCreate(name, newColor);
      onSelect(newId);
      handleClose();
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  const filtered = search.trim()
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : categories;

  const isClearDisabled = activeCategoryId === null;

  if (mode === "create") {
    return (
      <Sheet
        visible={visible}
        onClose={handleClose}
        title="New category"
        width={500}
        leftActions={
          <Button
            variant="secondary"
            icon={<IconBack size={11} color={t.ink} />}
            onPress={() => setMode("list")}
          >
            Back
          </Button>
        }
        actions={
          <Button
            variant="primary"
            disabled={!newName.trim() || submitting}
            onPress={handleCreate}
          >
            Create
          </Button>
        }
      >
        <Field
          label="Name"
          placeholder="Groceries, Rent, …"
          value={newName}
          onChangeText={setNewName}
          autoFocus
        />
        <Label style={{ marginBottom: 8 }}>Color</Label>
        <View style={styles.swatchRow}>
          {categoryColors.map((c) => {
            const active = newColor === c;
            return (
              <Pressable
                key={c}
                onPress={() => setNewColor(c)}
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
      title="Assign category"
      subtitle={`${categories.length} categor${categories.length === 1 ? "y" : "ies"}`}
      width={500}
    >
      <Field
        label="Search"
        placeholder="Filter by name…"
        value={search}
        onChangeText={setSearch}
        autoFocus
      />

      <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={isClearDisabled ? undefined : () => handleSelect(null)}
          disabled={isClearDisabled}
          style={({ pressed }) => [
            styles.row,
            {
              borderTopColor: t.line,
              borderTopWidth: 0,
              opacity: isClearDisabled ? 0.4 : pressed ? 0.6 : 1,
            },
          ]}
        >
          <View style={styles.dotSlot}>
            <IconClose size={12} color={t.inkMuted} />
          </View>
          <Text
            style={{
              flex: 1,
              fontFamily: FMFonts.sansMedium,
              fontSize: 13,
              color: t.inkSoft,
              marginLeft: 12,
            }}
          >
            Clear category
          </Text>
        </Pressable>

        {filtered.map((cat, i) => {
          const isActive = cat.id === activeCategoryId;
          return (
            <Pressable
              key={cat.id}
              onPress={() => handleSelect(cat.id)}
              style={({ pressed }) => [
                styles.row,
                {
                  borderTopColor: t.line,
                  borderTopWidth: 1,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.dotSlot}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: cat.color,
                  }}
                />
              </View>
              <Text
                style={{
                  flex: 1,
                  fontFamily: FMFonts.sansMedium,
                  fontSize: 13,
                  color: t.ink,
                  marginLeft: 12,
                }}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
              {isActive ? <IconCheck size={13} color={t.accent} /> : null}
            </Pressable>
          );
        })}

        <Pressable
          onPress={handleEnterCreate}
          style={({ pressed }) => [
            styles.row,
            {
              borderTopColor: t.line,
              borderTopWidth: filtered.length > 0 ? 1 : 0,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <View style={styles.dotSlot}>
            <IconPlus size={12} color={t.accent} />
          </View>
          <Text
            style={{
              flex: 1,
              fontFamily: FMFonts.sansMedium,
              fontSize: 13,
              color: t.accent,
              marginLeft: 12,
            }}
            numberOfLines={1}
          >
            {search.trim() && filtered.length === 0
              ? `Create "${search.trim()}"`
              : "Create new category"}
          </Text>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  dotSlot: {
    width: 14,
    alignItems: "center",
    justifyContent: "center",
  },
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
});
