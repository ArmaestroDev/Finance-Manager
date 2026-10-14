import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  Button,
  Field,
  IconBack,
  IconCheck,
  IconClose,
  IconPlus,
  Label,
  ListItem,
  useFMTheme,
} from "@/src/shared/design";
import { ColorSwatches } from "./ColorSwatches";

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
  const { i18n } = useSettings();
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
        title={i18n.cat_new}
        width={480}
        leftActions={
          <Button variant="text" icon={<IconBack size={16} />} onPress={() => setMode("list")}>
            {i18n.back}
          </Button>
        }
        actions={
          <Button disabled={!newName.trim() || submitting} onPress={handleCreate}>
            {i18n.create_btn}
          </Button>
        }
      >
        <Field
          label={i18n.name_label}
          placeholder={i18n.cat_name_examples_ph}
          value={newName}
          onChangeText={setNewName}
          autoFocus
        />
        <Label style={{ marginBottom: 8 }}>{i18n.color_label}</Label>
        <ColorSwatches colors={categoryColors} value={newColor} onChange={setNewColor} label={i18n.color_label} />
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={handleClose} title={i18n.cat_assign} width={480}>
      <Field
        label={i18n.search_label}
        placeholder={i18n.cat_filter_ph}
        value={search}
        onChangeText={setSearch}
        autoFocus
      />

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {isClearDisabled ? null : (
          <ListItem
            onPress={() => handleSelect(null)}
            leading={<IconClose size={18} color={t.inkSoft} />}
            title={i18n.cat_clear}
            background={t.surface}
            style={styles.item}
          />
        )}

        {filtered.map((cat) => {
          const isActive = cat.id === activeCategoryId;
          return (
            <ListItem
              key={cat.id}
              onPress={() => handleSelect(cat.id)}
              selected={isActive}
              background={t.surface}
              leading={<View style={[styles.dot, { backgroundColor: cat.color }]} />}
              title={cat.name}
              trailing={isActive ? <IconCheck size={18} color={t.onSecondaryContainer} /> : undefined}
              style={styles.item}
            />
          );
        })}

        <ListItem
          onPress={handleEnterCreate}
          background={t.surface}
          leading={<IconPlus size={18} color={t.primary} />}
          title={
            <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.subhead, color: t.primary }} numberOfLines={1}>
              {search.trim() && filtered.length === 0
                ? i18n.cat_create_named.replace("{name}", search.trim())
                : i18n.cat_create_new}
            </Text>
          }
          style={styles.item}
        />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 380,
    marginHorizontal: -24,
  },
  item: {
    paddingHorizontal: 24,
    minHeight: 48,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
