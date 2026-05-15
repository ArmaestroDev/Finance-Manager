import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  Button,
  IconAI,
  IconBack,
  IconChevR,
  Label,
  formatEUR,
  useFMTheme,
} from "@/src/shared/design";
import { useCategories } from "@/src/features/transactions/context/CategoriesContext";
import { useTransactionsContext } from "@/src/features/transactions/context/TransactionsContext";
import { useBudgetSuggestions } from "@/src/features/transactions/hooks/useBudgetSuggestions";
import {
  CategoryBudgetEditor,
  EditorRow,
  itemsToRows,
  rowsToItems,
} from "./CategoryBudgetEditor";

interface CategoryBudgetModalProps {
  visible: boolean;
  onClose: () => void;
}

// Two-level Sheet: a list of categories with their summed monthly estimate,
// and a per-category line-item editor. Estimates are the user's own forecast
// and never create real transactions.
export function CategoryBudgetModal({
  visible,
  onClose,
}: CategoryBudgetModalProps) {
  const t = useFMTheme();
  const { i18n, aiProvider, geminiApiKey, claudeApiKey, language } =
    useSettings();
  const {
    categories,
    categoryBudgets,
    transactionCategoryMap,
    getCategoryEstimate,
    setCategoryBudget,
  } = useCategories();
  const { getAllCachedTransactions } = useTransactionsContext();

  const { detectRecurring, isDetecting } = useBudgetSuggestions({
    categories,
    transactionCategoryMap,
    categoryBudgets,
    setCategoryBudget,
    getAllCachedTransactions,
    aiProvider,
    geminiApiKey,
    claudeApiKey,
    language,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [rows, setRows] = useState<EditorRow[]>([]);

  const budgetable = useMemo(
    () => categories.filter((c) => c.system !== "ignore"),
    [categories],
  );

  const editingCat = editingId
    ? categories.find((c) => c.id === editingId) ?? null
    : null;

  const openEditor = (categoryId: string) => {
    setRows(itemsToRows(categoryBudgets[categoryId] ?? []));
    setEditingId(categoryId);
  };

  const closeEditor = () => {
    setEditingId(null);
    setRows([]);
  };

  const handleClose = () => {
    closeEditor();
    onClose();
  };

  const handleSave = async () => {
    if (!editingId) return;
    await setCategoryBudget(editingId, rowsToItems(rows));
    closeEditor();
  };

  const notify = (text: string) => {
    if (Platform.OS === "web") window.alert(text);
    else Alert.alert(i18n.detect_confirm_title, text);
  };

  const runDetection = async () => {
    const res = await detectRecurring();
    if (!res.ok && res.reason === "no-key") {
      const providerLabel = aiProvider === "claude" ? "Claude" : "Gemini";
      notify(
        (
          i18n.ai_api_key_missing_msg ||
          "Please set your {provider} API Key in Settings first."
        ).replace("{provider}", providerLabel),
      );
      return;
    }
    if (!res.ok && res.reason === "no-data") {
      notify(i18n.detect_no_data);
      return;
    }
    if (!res.ok) {
      notify(
        i18n.detect_error.replace("{error}", res.error || "Unknown error"),
      );
      return;
    }
    if (res.addedCount === 0) {
      notify(i18n.detect_none);
      return;
    }
    notify(
      i18n.detect_added
        .replace("{count}", String(res.addedCount))
        .replace("{cats}", String(res.categoriesTouched)),
    );
  };

  const handleDetect = () => {
    if (isDetecting) return;
    const title = i18n.detect_confirm_title;
    const msg = i18n.detect_confirm_msg;
    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${msg}`)) runDetection();
    } else {
      Alert.alert(title, msg, [
        { text: i18n.cancel, style: "cancel" },
        { text: i18n.detect_recurring, onPress: () => runDetection() },
      ]);
    }
  };

  // ── Editor view ──
  if (editingId && editingCat) {
    return (
      <Sheet
        visible={visible}
        onClose={handleClose}
        title={editingCat.name}
        subtitle={i18n.monthly_estimate}
        width={520}
        leftActions={
          <Button
            variant="secondary"
            icon={<IconBack size={11} color={t.ink} />}
            onPress={closeEditor}
          >
            {i18n.back}
          </Button>
        }
        actions={
          <Button variant="primary" onPress={handleSave}>
            {i18n.save}
          </Button>
        }
      >
        <ScrollView
          style={{ maxHeight: 420 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <CategoryBudgetEditor rows={rows} setRows={setRows} i18n={i18n} />
        </ScrollView>
      </Sheet>
    );
  }

  // ── List view ──
  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={i18n.budget_title}
      subtitle={i18n.budget_subtitle}
      width={520}
      leftActions={
        <Button
          variant="secondary"
          loading={isDetecting}
          disabled={isDetecting}
          icon={<IconAI size={11} color={t.accent} />}
          onPress={handleDetect}
        >
          {isDetecting ? i18n.detecting : i18n.detect_recurring}
        </Button>
      }
      actions={
        <Button variant="primary" onPress={handleClose}>
          {i18n.done}
        </Button>
      }
    >
      <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
        {budgetable.length === 0 ? (
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 12,
              color: t.inkMuted,
              textAlign: "center",
              paddingVertical: 18,
            }}
          >
            {i18n.no_budget_categories}
          </Text>
        ) : (
          budgetable.map((cat, i) => {
            const est = getCategoryEstimate(cat.id);
            const itemCount = (categoryBudgets[cat.id] ?? []).length;
            return (
              <Pressable
                key={cat.id}
                onPress={() => openEditor(cat.id)}
                style={({ pressed }) => [
                  styles.catRow,
                  {
                    borderTopColor: t.line,
                    borderTopWidth: i === 0 ? 0 : 1,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    backgroundColor: cat.color,
                  }}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={{
                      fontFamily: FMFonts.sansMedium,
                      fontSize: 13,
                      color: t.ink,
                    }}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                  {est > 0 ? (
                    <Text
                      style={{
                        fontFamily: FMFonts.sans,
                        fontSize: 10.5,
                        color: t.inkMuted,
                        marginTop: 2,
                      }}
                    >
                      {itemCount} × {i18n.line_item_label}
                    </Text>
                  ) : null}
                </View>
                {est > 0 ? (
                  <Text
                    style={{
                      fontFamily: FMFonts.monoMedium,
                      fontSize: 12.5,
                      color: t.ink,
                      marginRight: 8,
                    }}
                  >
                    {formatEUR(est)}
                    <Text style={{ color: t.inkMuted }}>
                      {" "}
                      {i18n.budget_per_month}
                    </Text>
                  </Text>
                ) : (
                  <Text
                    style={{
                      fontFamily: FMFonts.sansMedium,
                      fontSize: 11,
                      color: t.accent,
                      marginRight: 8,
                    }}
                  >
                    {i18n.set_budget}
                  </Text>
                )}
                <IconChevR size={13} color={t.inkMuted} />
              </Pressable>
            );
          })
        )}

        {budgetable.length > 0 ? (
          <View
            style={[
              styles.totalRow,
              { borderTopColor: t.lineStrong, backgroundColor: t.surfaceAlt },
            ]}
          >
            <Label>{i18n.budget_total}</Label>
            <Text
              style={{
                fontFamily: FMFonts.monoSemibold,
                fontSize: 15,
                color: t.ink,
              }}
            >
              {formatEUR(
                budgetable.reduce((s, c) => s + getCategoryEstimate(c.id), 0),
              )}
              <Text style={{ color: t.inkMuted, fontSize: 12 }}>
                {" "}
                {i18n.budget_per_month}
              </Text>
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderRadius: 8,
  },
});
