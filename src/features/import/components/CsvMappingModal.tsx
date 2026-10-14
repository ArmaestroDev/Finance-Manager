import React, { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  Button,
  Chip,
  IconCheck,
  IconChevD,
  IconDoc,
  IconWarn,
  Label,
  useFMTheme,
} from "@/src/shared/design";
import type { Transaction } from "../../../services/enableBanking";
import {
  autoDetectRoles,
  detectAmountFormat,
  detectDateFormat,
  parseCsv,
  rowsToTransactions,
  type CsvAmountFormat,
  type CsvDateFormat,
  type CsvDelimiter,
  type CsvFieldRole,
  type CsvMapping,
} from "../services/parseCsv";

type I18n = ReturnType<typeof useSettings>["i18n"];

interface CsvMappingModalProps {
  visible: boolean;
  fileName: string;
  fileContent: string;
  currency: string;
  onCancel: () => void;
  onConfirm: (transactions: Transaction[]) => void;
}

const roleLabel = (role: CsvFieldRole, i18n: I18n): string =>
  ({
    ignore: i18n.csv_role_ignore,
    date: i18n.csv_role_date,
    description: i18n.csv_role_description,
    amount: i18n.csv_role_amount,
    debit: i18n.csv_role_debit,
    credit: i18n.csv_role_credit,
    valueDate: i18n.csv_role_value_date,
  })[role];

const ROLE_OPTIONS: CsvFieldRole[] = [
  "ignore",
  "date",
  "description",
  "amount",
  "debit",
  "credit",
  "valueDate",
];

const DATE_FORMATS: CsvDateFormat[] = [
  "DD.MM.YYYY",
  "YYYY-MM-DD",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
];

export function CsvMappingModal({
  visible,
  fileName,
  fileContent,
  currency,
  onCancel,
  onConfirm,
}: CsvMappingModalProps) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  const [delimiter, setDelimiter] = useState<CsvDelimiter | null>(null);

  const preview = useMemo(
    () => parseCsv(fileContent, delimiter ?? undefined),
    [fileContent, delimiter],
  );

  const [roles, setRoles] = useState<CsvFieldRole[] | null>(null);
  const effectiveRoles = useMemo(() => {
    if (roles && roles.length === preview.headers.length) return roles;
    return autoDetectRoles(preview.headers);
  }, [roles, preview.headers]);

  const [dateFormat, setDateFormat] = useState<CsvDateFormat | null>(null);
  const [amountFormat, setAmountFormat] = useState<CsvAmountFormat | null>(null);

  const mapping: CsvMapping = useMemo(() => {
    const dateCol = effectiveRoles.indexOf("date");
    const amountCols = effectiveRoles
      .map((r, i) => (r === "amount" || r === "debit" || r === "credit" ? i : -1))
      .filter((i) => i >= 0);
    return {
      roles: effectiveRoles,
      dateFormat: dateFormat ?? detectDateFormat(preview.rows, dateCol),
      amountFormat: amountFormat ?? detectAmountFormat(preview.rows, amountCols),
    };
  }, [effectiveRoles, dateFormat, amountFormat, preview.rows]);

  const parseResult = useMemo(
    () => rowsToTransactions(preview.rows, mapping, currency, fileName),
    [preview.rows, mapping, currency, fileName],
  );

  const hasDate = effectiveRoles.includes("date");
  const hasAmountSource =
    effectiveRoles.includes("amount") ||
    effectiveRoles.includes("debit") ||
    effectiveRoles.includes("credit");
  const canImport = hasDate && hasAmountSource && parseResult.transactions.length > 0;

  const updateRole = (columnIdx: number, newRole: CsvFieldRole) => {
    const next = [...effectiveRoles];
    // Roles that should be unique across columns — clear the old assignment.
    const unique: CsvFieldRole[] = ["date", "description", "amount", "debit", "credit", "valueDate"];
    if (unique.includes(newRole)) {
      for (let i = 0; i < next.length; i++) {
        if (i !== columnIdx && next[i] === newRole) next[i] = "ignore";
      }
    }
    next[columnIdx] = newRole;
    setRoles(next);
  };

  const handleConfirm = () => {
    onConfirm(parseResult.transactions);
  };

  const delimiterOptions: { value: CsvDelimiter; label: string }[] = [
    { value: ";", label: i18n.csv_delim_semicolon },
    { value: ",", label: i18n.csv_delim_comma },
    { value: "\t", label: i18n.csv_delim_tab },
  ];
  const amountOptions: { value: CsvAmountFormat; label: string }[] = [
    { value: "de", label: i18n.csv_amount_eu },
    { value: "en", label: i18n.csv_amount_us },
  ];

  const txCount = parseResult.transactions.length;
  const statusText = canImport
    ? i18n.csv_ready_msg
        .replace("{count}", String(txCount))
        .replace(
          "{skipped}",
          parseResult.skippedRows > 0 ? ` · ${parseResult.skippedRows} ${i18n.stmt_skipped}` : "",
        )
    : hasDate && hasAmountSource
      ? i18n.csv_no_valid
      : i18n.csv_map_required;
  const statusColor = canImport ? t.pos : t.warn;

  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      title={i18n.csv_modal_title}
      width={720}
      actions={
        <>
          <Button variant="text" onPress={onCancel}>
            {i18n.cancel}
          </Button>
          <Button onPress={handleConfirm} disabled={!canImport}>
            {i18n.csv_import_btn.replace("{count}", txCount > 0 ? String(txCount) : "").trim()}
          </Button>
        </>
      }
    >
      <ScrollView style={{ maxHeight: 560 }} showsVerticalScrollIndicator={false}>
        {/* File info */}
        <View style={styles.fileRow}>
          <IconDoc size={18} color={t.primary} />
          <Text
            style={{ flex: 1, fontFamily: FMFonts.sansSemibold, fontSize: FMType.body, color: t.ink }}
            numberOfLines={1}
          >
            {fileName}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: t.secondaryContainer }]}>
            <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.caption, color: t.onSecondaryContainer }}>
              {i18n.csv_rows_count.replace("{count}", String(preview.totalRows))}
            </Text>
          </View>
        </View>

        <Label style={styles.sectionLabel}>{i18n.csv_delimiter}</Label>
        <View style={styles.chipRow}>
          {delimiterOptions.map((opt) => (
            <Chip
              key={opt.value}
              filter
              active={preview.delimiter === opt.value}
              onPress={() => setDelimiter(opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </View>

        <Label style={[styles.sectionLabel, styles.sectionGap]}>{i18n.csv_date_format}</Label>
        <View style={styles.chipRow}>
          {DATE_FORMATS.map((fmt) => (
            <Chip key={fmt} filter active={mapping.dateFormat === fmt} onPress={() => setDateFormat(fmt)}>
              {fmt}
            </Chip>
          ))}
        </View>

        <Label style={[styles.sectionLabel, styles.sectionGap]}>{i18n.csv_amount_format}</Label>
        <View style={styles.chipRow}>
          {amountOptions.map((opt) => (
            <Chip
              key={opt.value}
              filter
              active={mapping.amountFormat === opt.value}
              onPress={() => setAmountFormat(opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </View>

        <Label style={[styles.sectionLabel, styles.sectionGap]}>{i18n.csv_column_mapping}</Label>

        <View style={{ gap: 8, marginBottom: 8 }}>
          {preview.headers.map((header, colIdx) => (
            <ColumnRow
              key={colIdx}
              header={header || i18n.csv_column_n.replace("{n}", String(colIdx + 1))}
              role={effectiveRoles[colIdx]}
              sampleValues={preview.rows.slice(0, 3).map((r) => r[colIdx] || "")}
              onChange={(r) => updateRole(colIdx, r)}
            />
          ))}
        </View>

        <Label style={[styles.sectionLabel, styles.sectionGap]}>{i18n.csv_preview}</Label>
        <View style={[styles.previewBox, { backgroundColor: t.surfaceContainerHigh }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === "web"}>
            <View>
              <View style={[styles.previewRow, styles.previewHeader, { borderBottomColor: t.outlineVariant }]}>
                {preview.headers.map((h, i) => {
                  const role = effectiveRoles[i];
                  return (
                    <View
                      key={i}
                      style={[
                        styles.previewCell,
                        { backgroundColor: role === "ignore" ? "transparent" : t.secondaryContainer },
                      ]}
                    >
                      <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: FMType.caption, color: t.ink }}>
                        {h || i18n.csv_col_short.replace("{n}", String(i + 1))}
                      </Text>
                      {role !== "ignore" ? (
                        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.caption, color: t.onSecondaryContainer }}>
                          {roleLabel(role, i18n)}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
              {preview.rows.slice(0, 5).map((row, rIdx) => (
                <View key={rIdx} style={styles.previewRow}>
                  {row.map((cell, cIdx) => (
                    <View key={cIdx} style={styles.previewCell}>
                      <Text
                        style={{ fontFamily: FMFonts.sans, fontSize: FMType.caption, color: t.inkSoft }}
                        numberOfLines={1}
                      >
                        {cell}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={[styles.statusBar, { backgroundColor: canImport ? t.posSoft : t.warnSoft }]}>
          {canImport ? <IconCheck size={14} color={statusColor} /> : <IconWarn size={14} color={statusColor} />}
          <Text style={{ flex: 1, fontFamily: FMFonts.sansMedium, fontSize: FMType.small, color: statusColor }}>
            {statusText}
          </Text>
        </View>
      </ScrollView>
    </Sheet>
  );
}

function ColumnRow({
  header,
  role,
  sampleValues,
  onChange,
}: {
  header: string;
  role: CsvFieldRole;
  sampleValues: string[];
  onChange: (r: CsvFieldRole) => void;
}) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  const [expanded, setExpanded] = useState(false);
  const assigned = role !== "ignore";

  return (
    <View style={[styles.columnRow, { backgroundColor: t.surfaceContainerHigh }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: FMType.body, color: t.ink }} numberOfLines={1}>
          {header}
        </Text>
        <Text style={{ fontFamily: FMFonts.sans, fontSize: FMType.caption, color: t.inkMuted }} numberOfLines={1}>
          {sampleValues.filter(Boolean).slice(0, 2).join(" · ") || i18n.csv_empty_cell}
        </Text>
      </View>
      <Chip
        active={assigned}
        onPress={() => setExpanded(!expanded)}
        iconRight={<IconChevD size={14} />}
      >
        {roleLabel(role, i18n)}
      </Chip>
      {expanded ? (
        <View style={[styles.dropdown, { backgroundColor: t.surface }]}>
          {ROLE_OPTIONS.map((opt) => {
            const active = opt === role;
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  onChange(opt);
                  setExpanded(false);
                }}
                style={({ pressed }) => [
                  styles.dropdownItem,
                  { backgroundColor: active ? t.secondaryContainer : pressed ? t.surfaceAlt : "transparent" },
                ]}
              >
                <Text
                  style={{
                    fontFamily: active ? FMFonts.sansMedium : FMFonts.sans,
                    fontSize: FMType.body,
                    color: active ? t.onSecondaryContainer : t.ink,
                  }}
                >
                  {roleLabel(opt, i18n)}
                </Text>
                {active ? <IconCheck size={16} color={t.onSecondaryContainer} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  countBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sectionLabel: { marginBottom: 8 },
  sectionGap: { marginTop: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  columnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    flexWrap: "wrap",
  },
  dropdown: {
    width: "100%",
    marginTop: 4,
    borderRadius: 8,
    paddingVertical: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    minHeight: 44,
  },
  previewBox: {
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
    maxHeight: 200,
  },
  previewRow: {
    flexDirection: "row",
  },
  previewHeader: {
    borderBottomWidth: 1,
    paddingBottom: 4,
    marginBottom: 4,
  },
  previewCell: {
    minWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 4,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
});
