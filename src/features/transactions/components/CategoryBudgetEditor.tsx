import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Field, IconPlus, IconTrash, formatEUR, useFMTheme } from "@/src/shared/design";
import { BudgetLineItem } from "@/src/features/transactions/context/CategoriesContext";

// Editor rows keep the amount as a string so partial input ("12,") stays
// valid while typing; it's parsed (German comma tolerated) only on save.
export interface EditorRow {
  id: string;
  label: string;
  amount: string;
  /** Carried through so AI suggestions stay visually flagged for review. */
  source?: "ai";
}

export const newRowId = () =>
  `bli_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export const parseAmount = (s: string): number => {
  const n = parseFloat(s.replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
};

// 60 -> "60", 60.5 -> "60,5" — German decimal separator, no trailing zeros.
export const amountToInput = (n: number): string =>
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
      {rows.map((row, i) => (
        <View key={row.id} style={styles.editorRow}>
          <Field
            label={i === 0 ? i18n.line_item_label : ""}
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
            label={i === 0 ? i18n.budget_amount : ""}
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
            <View
              style={[
                styles.aiPill,
                {
                  backgroundColor: t.accentSoft,
                  borderColor: t.accent,
                  marginTop: i === 0 ? 22 : 4,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: FMFonts.sansSemibold,
                  fontSize: 8.5,
                  color: t.accent,
                  letterSpacing: 0.4,
                }}
              >
                AI
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={() =>
              setRows((rs) =>
                rs.length === 1
                  ? [{ id: newRowId(), label: "", amount: "" }]
                  : rs.filter((r) => r.id !== row.id),
              )
            }
            hitSlop={8}
            style={({ pressed }) => [
              styles.rowTrash,
              { marginTop: i === 0 ? 18 : 0, opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <IconTrash size={13} color={t.neg} />
          </Pressable>
        </View>
      ))}

      <Pressable
        onPress={() =>
          setRows((rs) => [...rs, { id: newRowId(), label: "", amount: "" }])
        }
        style={({ pressed }) => [
          styles.addRow,
          { borderColor: t.lineStrong, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <IconPlus size={12} color={t.inkSoft} />
        <Text
          style={{
            fontFamily: FMFonts.sansMedium,
            fontSize: 12,
            color: t.inkSoft,
            marginLeft: 6,
          }}
        >
          {i18n.add_line_item}
        </Text>
      </Pressable>

      <View
        style={[
          styles.totalRow,
          { borderTopColor: t.line, backgroundColor: t.surfaceAlt },
        ]}
      >
        <Text
          style={{
            fontFamily: FMFonts.sansSemibold,
            fontSize: 12,
            color: t.inkSoft,
          }}
        >
          {i18n.monthly_estimate}
        </Text>
        <Text
          style={{
            fontFamily: FMFonts.monoSemibold,
            fontSize: 15,
            color: t.ink,
          }}
        >
          {formatEUR(liveTotal)}
        </Text>
      </View>

      {hideHint ? null : (
        <Text
          style={{
            fontFamily: FMFonts.sans,
            fontSize: 11,
            color: t.inkMuted,
            marginTop: 12,
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
  editorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  rowTrash: {
    padding: 6,
  },
  aiPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    marginTop: 2,
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
