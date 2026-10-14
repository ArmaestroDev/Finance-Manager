import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  Button,
  EmptyState,
  IconAI,
  IconBack,
  ListItem,
  formatEUR,
  useFMTheme,
} from "@/src/shared/design";
import { useCategories } from "@/src/features/transactions/context/CategoriesContext";
import { useTransactionsContext } from "@/src/features/transactions/context/TransactionsContext";
import { isIncomeName } from "@/src/features/transactions/utils/aiCategorize";
import { useBudgetSuggestions } from "@/src/features/transactions/hooks/useBudgetSuggestions";
import {
  CategoryBudgetEditor,
  EditorRow,
  itemsToRows,
  rowsToItems,
} from "./CategoryBudgetEditor";
import { showAlert } from "@/src/shared/utils/alert";

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
  const { i18n, aiConfig, language } = useSettings();
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
    aiConfig,
    language,
    ollamaErrors: {
      unreachable: i18n.ai_ollama_unreachable,
      modelMissing: (model) => i18n.ai_ollama_model_missing.replace(/\{model\}/g, model),
      browserNotReady: i18n.ai_browser_not_ready,
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [rows, setRows] = useState<EditorRow[]>([]);

  const budgetable = useMemo(
    // Income categories have no spending budget.
    () => categories.filter((c) => c.system !== "ignore" && !isIncomeName(c.name)),
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

  const notify = (text: string) => showAlert(i18n.detect_confirm_title, text);

  const runDetection = async () => {
    const res = await detectRecurring();
    if (!res.ok && res.reason === "no-key") {
      const providerLabel =
        aiConfig.provider === "claude" ? i18n.ai_provider_claude : i18n.ai_provider_gemini;
      notify(i18n.ai_api_key_missing_msg.replace("{provider}", providerLabel));
      return;
    }
    if (!res.ok && res.reason === "no-data") {
      notify(i18n.detect_no_data);
      return;
    }
    if (!res.ok) {
      notify(
        i18n.detect_error.replace("{error}", res.error || i18n.error_unknown),
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
    showAlert(i18n.detect_confirm_title, i18n.detect_confirm_msg, [
      { text: i18n.cancel, style: "cancel" },
      { text: i18n.detect_recurring, onPress: () => void runDetection() },
    ]);
  };

  // ── Editor view ──
  if (editingId && editingCat) {
    return (
      <Sheet
        visible={visible}
        onClose={handleClose}
        title={editingCat.name}
        width={520}
        leftActions={
          <Button variant="text" icon={<IconBack size={16} />} onPress={closeEditor}>
            {i18n.back}
          </Button>
        }
        actions={<Button onPress={handleSave}>{i18n.save}</Button>}
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

  const total = budgetable.reduce((s, c) => s + getCategoryEstimate(c.id), 0);

  // ── List view ──
  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={i18n.budget_title}
      width={520}
      leftActions={
        <Button
          variant="tonal"
          loading={isDetecting}
          disabled={isDetecting}
          icon={<IconAI size={16} />}
          onPress={handleDetect}
        >
          {isDetecting ? i18n.detecting : i18n.detect_recurring}
        </Button>
      }
      actions={<Button onPress={handleClose}>{i18n.done}</Button>}
    >
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {budgetable.length === 0 ? (
          <EmptyState title={i18n.no_budget_categories} />
        ) : (
          budgetable.map((cat) => {
            const est = getCategoryEstimate(cat.id);
            const itemCount = (categoryBudgets[cat.id] ?? []).length;
            return (
              <ListItem
                key={cat.id}
                onPress={() => openEditor(cat.id)}
                background={t.surface}
                style={styles.item}
                accessibilityLabel={cat.name}
                leading={<View style={[styles.dot, { backgroundColor: cat.color }]} />}
                title={cat.name}
                subtitle={est > 0 ? `${itemCount} × ${i18n.line_item_label}` : undefined}
                trailing={
                  est > 0 ? (
                    <Text style={[styles.amount, { color: t.ink }]}>
                      {formatEUR(est)}
                      <Text style={{ color: t.inkSoft, fontFamily: FMFonts.sans }}> {i18n.budget_per_month}</Text>
                    </Text>
                  ) : (
                    <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.body, color: t.primary }}>
                      {i18n.set_budget}
                    </Text>
                  )
                }
              />
            );
          })
        )}
      </ScrollView>

      {budgetable.length > 0 ? (
        <View style={[styles.totalRow, { backgroundColor: t.surfaceContainerHigh }]}>
          <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.body, color: t.inkSoft }}>
            {i18n.budget_total}
          </Text>
          <Text style={[styles.amount, { color: t.ink, fontSize: FMType.subhead }]}>
            {formatEUR(total)}
            <Text style={{ color: t.inkSoft, fontSize: FMType.small, fontFamily: FMFonts.sans }}>
              {" "}
              {i18n.budget_per_month}
            </Text>
          </Text>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 400,
    marginHorizontal: -24,
  },
  item: {
    paddingHorizontal: 24,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  amount: {
    fontFamily: FMFonts.monoMedium,
    fontSize: FMType.body,
    fontVariant: ["tabular-nums"],
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
});
