import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import {
  Button,
  Field,
  IconAI,
  IconButton,
  IconPlus,
  IconTrash,
  Label,
  formatEUR,
  useFMTheme,
} from "@/src/shared/design";
import type { BudgetLineItem } from "@/src/features/transactions/context/CategoriesContext";
import { parseLocaleNumber, roundCents } from "@/src/shared/utils/number";

// Editor rows keep the amount as a string so partial input ("12,") stays
// valid while typing; it's parsed (German comma tolerated) only on save.
export interface EditorRow {
  id: string;
  label: string;
  amount: string;
  /** Carried through so AI suggestions stay visually flagged for review. */
  source?: "ai";
}

const newRowId = () =>
  `bli_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const parseAmount = (s: string): number => {
  const n = parseLocaleNumber(s);
  return Number.isFinite(n) ? roundCents(n) : 0;
};

// 60 -> "60", 60.5 -> "60,5" — German decimal separator, no trailing zeros.
const amountToInput = (n: number): string =>
  n === 0 ? "" : String(n).replace(".", ",");

// Build editor rows from stored line items (always at least one blank row).
export const itemsToRows = (items: BudgetLineItem[]): EditorRow[] =>
  items.length > 0
    ? items.map((it) => ({
        id: it.id,
        label: it.label,
        amount: amountToInput(it.amount),
        source: it.source,
      }))
    : [{ id: newRowId(), label: "", amount: "" }];

// Parse + prune empty rows into persistable line items.
export const rowsToItems = (rows: EditorRow[]): BudgetLineItem[] =>
  rows
    .map((r) => ({
      id: r.id,
      label: r.label.trim(),
      amount: parseAmount(r.amount),
      ...(r.source ? { source: r.source } : {}),
    }))
    .filter((it) => it.label.length > 0 && it.amount > 0);

interface CategoryBudgetEditorProps {
  rows: EditorRow[];
  setRows: React.Dispatch<React.SetStateAction<EditorRow[]>>;
  i18n: {
    line_item_label: string;
    line_item_label_ph: string;
    budget_amount: string;
    add_line_item: string;
    monthly_estimate: string;
    budget_hint: string;
    delete: string;
  };
  /** Hide the explanatory footnote (e.g. when shown inside another editor). */
  hideHint?: boolean;
}

// Reusable line-item editor body (no Sheet wrapper). The parent owns `rows`
// state and persistence so it can place Save wherever its flow needs it.
export function CategoryBudgetEditor({
  rows,
  setRows,
  i18n,
  hideHint,
}: CategoryBudgetEditorProps) {
  const t = useFMTheme();
  const liveTotal = rows.reduce((s, r) => s + parseAmount(r.amount), 0);

  return (
    <View>
      {/* Column headers once; the per-row fields carry accessible names. */}
      <View style={styles.headRow}>
        <Label style={{ flex: 1 }}>{i18n.line_item_label}</Label>
        <Label style={{ width: 116 }}>{i18n.budget_amount}</Label>
        <View style={{ width: 40 }} />
      </View>
      {rows.map((row) => (
        <View key={row.id} style={styles.editorRow}>
          <Field
            label=""
            accessibilityLabel={i18n.line_item_label}
            placeholder={i18n.line_item_label_ph}
            value={row.label}
            onChangeText={(s) =>
              setRows((rs) =>
                rs.map((r) => (r.id === row.id ? { ...r, label: s } : r)),
              )
            }
            containerStyle={{ flex: 1, marginBottom: 0 }}
          />
          <Field
            label=""
            accessibilityLabel={i18n.budget_amount}
            placeholder="0"
            value={row.amount}
            keyboardType="decimal-pad"
            suffix="€"
            mono
            onChangeText={(s) =>
              setRows((rs) =>
                rs.map((r) =>
                  r.id === row.id
                    ? { ...r, amount: s.replace(/[^0-9.,]/g, "") }
                    : r,
                ),
              )
            }
            containerStyle={{ width: 116, marginBottom: 0 }}
          />
          {row.source === "ai" ? (
            <View style={[styles.aiBadge, { backgroundColor: t.secondaryContainer }]}>
              <IconAI size={14} color={t.onSecondaryContainer} />
            </View>
          ) : null}
          <IconButton
            icon={<IconTrash size={18} />}
            label={i18n.delete}
            style={styles.rowTrash}
            onPress={() =>
              setRows((rs) =>
                rs.length === 1
                  ? [{ id: newRowId(), label: "", amount: "" }]
                  : rs.filter((r) => r.id !== row.id),
              )
            }
          />
        </View>
      ))}

      <Button
        variant="text"
        icon={<IconPlus size={16} />}
        onPress={() => setRows((rs) => [...rs, { id: newRowId(), label: "", amount: "" }])}
        style={{ alignSelf: "flex-start", marginLeft: -12 }}
      >
        {i18n.add_line_item}
      </Button>

      <View style={[styles.totalRow, { backgroundColor: t.surfaceContainerHigh }]}>
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.body, color: t.inkSoft }}>
          {i18n.monthly_estimate}
        </Text>
        <Text
          style={{
            fontFamily: FMFonts.monoMedium,
            fontSize: FMType.subhead,
            color: t.ink,
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatEUR(liveTotal)}
        </Text>
      </View>

      {hideHint ? null : (
        <Text
          style={{
            fontFamily: FMFonts.sans,
            fontSize: FMType.caption,
            color: t.inkSoft,
            marginTop: 8,
            lineHeight: 16,
          }}
        >
          {i18n.budget_hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 2,
  },
  editorRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 8,
  },
  rowTrash: {
    marginBottom: 4,
  },
  aiBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
});
