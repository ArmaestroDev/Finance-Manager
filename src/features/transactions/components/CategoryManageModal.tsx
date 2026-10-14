import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  Button,
  EmptyState,
  Field,
  IconBack,
  IconButton,
  IconPlus,
  IconTrash,
  Label,
  ListItem,
  Pill,
  SectionTitle,
  useFMTheme,
} from "@/src/shared/design";
import { ColorSwatches } from "./ColorSwatches";
import { useCategories } from "@/src/features/transactions/context/CategoriesContext";
import {
  CategoryBudgetEditor,
  EditorRow,
  itemsToRows,
  rowsToItems,
} from "./CategoryBudgetEditor";
import { showAlert } from "@/src/shared/utils/alert";

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
  const { i18n } = useSettings();
  const { categoryBudgets, setCategoryBudget } = useCategories();
  const [editing, setEditing] = useState<{ id: string; name: string; color: string } | null>(null);
  const [budgetRows, setBudgetRows] = useState<EditorRow[]>([]);

  // Hydrate the estimate editor whenever an existing category is opened; a
  // brand-new (unsaved) category has no id yet so it gets a blank sheet.
  useEffect(() => {
    if (editing?.id) {
      setBudgetRows(itemsToRows(categoryBudgets[editing.id] ?? []));
    } else {
      setBudgetRows([]);
    }
  }, [editing?.id, categoryBudgets]);

  const handleClose = () => {
    setEditing(null);
    onClose();
  };

  const handleDelete = (cat: TransactionCategory) => {
    showAlert(i18n.cat_delete_title, i18n.cat_delete_confirm.replace("{name}", cat.name), [
      { text: i18n.cancel, style: "cancel" },
      { text: i18n.delete, style: "destructive", onPress: () => void onDelete(cat.id) },
    ]);
  };

  if (editing) {
    return (
      <Sheet
        visible={visible}
        onClose={handleClose}
        title={editing.id ? i18n.cat_edit : i18n.cat_new}
        width={500}
        leftActions={
          <Button variant="text" icon={<IconBack size={16} />} onPress={() => setEditing(null)}>
            {i18n.back}
          </Button>
        }
        actions={
          <Button
            disabled={!editing.name.trim()}
            onPress={async () => {
              if (!editing.name.trim()) return;
              if (editing.id) {
                await onUpdate(editing.id, { name: editing.name, color: editing.color });
                await setCategoryBudget(editing.id, rowsToItems(budgetRows));
              } else {
                await onAdd(editing.name, editing.color);
              }
              setEditing(null);
            }}
          >
            {i18n.save}
          </Button>
        }
      >
        <ScrollView
          style={{ maxHeight: 460 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            label={i18n.name_label}
            placeholder={i18n.cat_name_examples_ph}
            value={editing.name}
            onChangeText={(s) => setEditing({ ...editing, name: s })}
          />
          <Label style={{ marginBottom: 8 }}>{i18n.color_label}</Label>
          <ColorSwatches
            colors={categoryColors}
            value={editing.color}
            onChange={(c) => setEditing({ ...editing, color: c })}
            label={i18n.color_label}
          />

          {editing.id ? (
            <View style={styles.budgetSection}>
              <SectionTitle>{i18n.monthly_estimate}</SectionTitle>
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  fontSize: FMType.small,
                  color: t.inkSoft,
                  marginBottom: 12,
                  lineHeight: 18,
                }}
              >
                {i18n.budget_hint}
              </Text>
              <CategoryBudgetEditor
                rows={budgetRows}
                setRows={setBudgetRows}
                i18n={i18n}
                hideHint
              />
            </View>
          ) : null}
        </ScrollView>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={i18n.manage_categories}
      width={520}
      leftActions={
        <Button
          variant="tonal"
          icon={<IconPlus size={16} />}
          onPress={() => setEditing({ id: "", name: "", color: categoryColors[0] })}
        >
          {i18n.cat_new}
        </Button>
      }
      actions={<Button onPress={handleClose}>{i18n.done}</Button>}
    >
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {categories.length === 0 ? (
          <EmptyState title={i18n.no_categories} />
        ) : (
          categories.map((cat) => (
            <ListItem
              key={cat.id}
              onPress={() => setEditing({ id: cat.id, name: cat.name, color: cat.color })}
              accessibilityLabel={`${i18n.edit}: ${cat.name}`}
              background={t.surface}
              style={styles.item}
              leading={<View style={[styles.dot, { backgroundColor: cat.color }]} />}
              title={cat.name}
              trailing={cat.system === "ignore" ? <Pill>{i18n.system_pill}</Pill> : undefined}
              trailingAction={
                cat.system === "ignore" ? undefined : (
                  <IconButton
                    icon={<IconTrash size={18} />}
                    label={`${i18n.delete}: ${cat.name}`}
                    onPress={() => handleDelete(cat)}
                  />
                )
              }
            />
          ))
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 420,
    marginHorizontal: -24,
  },
  item: {
    paddingHorizontal: 24,
    minHeight: 52,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  budgetSection: {
    marginTop: 24,
  },
});
