import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useThemeColor } from "../../../shared/hooks/use-theme-color";
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
import type { Transaction } from "../../../services/enableBanking";

interface CsvMappingModalProps {
  visible: boolean;
  fileName: string;
  fileContent: string;
  currency: string;
  onCancel: () => void;
  onConfirm: (transactions: Transaction[]) => void;
}

const ROLE_LABELS: Record<CsvFieldRole, string> = {
  ignore: "Skip",
  date: "Booking Date",
  description: "Description",
  amount: "Amount",
  debit: "Debit (out)",
  credit: "Credit (in)",
  valueDate: "Value Date",
};

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

const DELIMITER_OPTIONS: { value: CsvDelimiter; label: string }[] = [
  { value: ";", label: "Semicolon (;)" },
  { value: ",", label: "Comma (,)" },
  { value: "\t", label: "Tab" },
];

export function CsvMappingModal({
  visible,
  fileName,
  fileContent,
  currency,
  onCancel,
  onConfirm,
}: CsvMappingModalProps) {
  const backgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");

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

  const isDesktop = Platform.OS === "web";

  const content = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* File info */}
      <View style={styles.fileRow}>
        <Ionicons name="document-outline" size={18} color={tintColor} />
        <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>
          {fileName}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: tintColor + "15" }]}>
          <Text style={{ color: tintColor, fontWeight: "700", fontSize: 12 }}>
            {preview.totalRows} rows
          </Text>
        </View>
      </View>

      {/* Delimiter */}
      <Text style={[styles.sectionLabel, { color: textColor }]}>DELIMITER</Text>
      <View style={styles.chipRow}>
        {DELIMITER_OPTIONS.map((opt) => {
          const active = preview.delimiter === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setDelimiter(opt.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? tintColor : tintColor + "12",
                },
              ]}
            >
              <Text
                style={{
                  color: active ? backgroundColor : tintColor,
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date format */}
      <Text style={[styles.sectionLabel, { color: textColor, marginTop: 16 }]}>
        DATE FORMAT
      </Text>
      <View style={styles.chipRow}>
        {DATE_FORMATS.map((fmt) => {
          const active = mapping.dateFormat === fmt;
          return (
            <TouchableOpacity
              key={fmt}
              onPress={() => setDateFormat(fmt)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? tintColor : tintColor + "12",
                },
              ]}
            >
              <Text
                style={{
                  color: active ? backgroundColor : tintColor,
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                {fmt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Amount format */}
      <Text style={[styles.sectionLabel, { color: textColor, marginTop: 16 }]}>
        AMOUNT FORMAT
      </Text>
      <View style={styles.chipRow}>
        <TouchableOpacity
          onPress={() => setAmountFormat("de")}
          style={[
            styles.chip,
            {
              backgroundColor: mapping.amountFormat === "de" ? tintColor : tintColor + "12",
            },
          ]}
        >
          <Text
            style={{
              color: mapping.amountFormat === "de" ? backgroundColor : tintColor,
              fontWeight: "600",
              fontSize: 12,
            }}
          >
            1.234,56 (EU)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setAmountFormat("en")}
          style={[
            styles.chip,
            {
              backgroundColor: mapping.amountFormat === "en" ? tintColor : tintColor + "12",
            },
          ]}
        >
          <Text
            style={{
              color: mapping.amountFormat === "en" ? backgroundColor : tintColor,
              fontWeight: "600",
              fontSize: 12,
            }}
          >
            1,234.56 (US)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Column mapping */}
      <Text style={[styles.sectionLabel, { color: textColor, marginTop: 20 }]}>
        COLUMN MAPPING
      </Text>
      <Text style={{ color: textColor, opacity: 0.55, fontSize: 12, marginBottom: 10 }}>
        Assign each column a role. Amount-or-Debit/Credit pair is required alongside Date.
      </Text>

      <View style={{ gap: 8, marginBottom: 8 }}>
        {preview.headers.map((header, colIdx) => (
          <ColumnRow
            key={colIdx}
            header={header || `Column ${colIdx + 1}`}
            role={effectiveRoles[colIdx]}
            sampleValues={preview.rows.slice(0, 3).map((r) => r[colIdx] || "")}
            onChange={(r) => updateRole(colIdx, r)}
            textColor={textColor}
            surfaceColor={surfaceColor}
            borderColor={borderColor}
            tintColor={tintColor}
          />
        ))}
      </View>

      {/* Preview */}
      <Text style={[styles.sectionLabel, { color: textColor, marginTop: 16 }]}>
        PREVIEW (first 5 rows)
      </Text>
      <View style={[styles.previewBox, { borderColor, backgroundColor: surfaceColor }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === "web"}>
          <View>
            <View style={[styles.previewRow, styles.previewHeader]}>
              {preview.headers.map((h, i) => {
                const role = effectiveRoles[i];
                return (
                  <View
                    key={i}
                    style={[
                      styles.previewCell,
                      {
                        backgroundColor: role === "ignore" ? "transparent" : tintColor + "15",
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: textColor }}>
                      {h || `col ${i + 1}`}
                    </Text>
                    {role !== "ignore" && (
                      <Text style={{ fontSize: 10, color: tintColor, fontWeight: "600" }}>
                        {ROLE_LABELS[role]}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
            {preview.rows.slice(0, 5).map((row, rIdx) => (
              <View key={rIdx} style={styles.previewRow}>
                {row.map((cell, cIdx) => (
                  <View key={cIdx} style={styles.previewCell}>
                    <Text
                      style={{ fontSize: 11, color: textColor, opacity: 0.75 }}
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

      {/* Status */}
      <View style={[styles.statusBar, { backgroundColor: surfaceColor, borderColor }]}>
        <Ionicons
          name={canImport ? "checkmark-circle" : "alert-circle"}
          size={16}
          color={canImport ? "#10B981" : "#F59E0B"}
        />
        <Text
          style={{
            color: canImport ? "#10B981" : "#F59E0B",
            fontSize: 12,
            fontWeight: "600",
          }}
        >
          {canImport
            ? `Ready to import ${parseResult.transactions.length} transaction${parseResult.transactions.length === 1 ? "" : "s"}${parseResult.skippedRows > 0 ? ` · ${parseResult.skippedRows} skipped` : ""}`
            : hasDate && hasAmountSource
              ? "No rows produced valid transactions — check formats."
              : "Map Date and Amount (or Debit/Credit) columns to continue."}
        </Text>
      </View>
    </ScrollView>
  );

  const footer = (
    <View style={[styles.footer, { borderTopColor: borderColor }]}>
      <TouchableOpacity onPress={onCancel} style={[styles.btn, styles.cancelBtn]}>
        <Text style={{ color: textColor, fontWeight: "600" }}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleConfirm}
        disabled={!canImport}
        style={[
          styles.btn,
          {
            backgroundColor: canImport ? tintColor : tintColor + "40",
          },
        ]}
      >
        <Text style={{ color: backgroundColor, fontWeight: "700" }}>
          Import {parseResult.transactions.length > 0 ? parseResult.transactions.length : ""}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isDesktop ? "fade" : "slide"}
    >
      <View
        style={[styles.backdrop, isDesktop ? styles.backdropCenter : styles.backdropBottom]}
      >
        <View
          style={[
            isDesktop ? styles.desktopDialog : styles.mobileSheet,
            { backgroundColor, borderColor },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <Ionicons name="document-text-outline" size={20} color={tintColor} />
              <Text style={[styles.title, { color: textColor }]}>Map CSV Columns</Text>
            </View>
            <TouchableOpacity onPress={onCancel}>
              <Ionicons name="close" size={22} color={textColor} />
            </TouchableOpacity>
          </View>
          {content}
          {footer}
        </View>
      </View>
    </Modal>
  );
}

function ColumnRow({
  header,
  role,
  sampleValues,
  onChange,
  textColor,
  surfaceColor,
  borderColor,
  tintColor,
}: {
  header: string;
  role: CsvFieldRole;
  sampleValues: string[];
  onChange: (r: CsvFieldRole) => void;
  textColor: string;
  surfaceColor: string;
  borderColor: string;
  tintColor: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.columnRow, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: textColor, fontWeight: "700", fontSize: 13 }} numberOfLines={1}>
          {header}
        </Text>
        <Text style={{ color: textColor, opacity: 0.45, fontSize: 11 }} numberOfLines={1}>
          {sampleValues.filter(Boolean).slice(0, 2).join(" · ") || "(empty)"}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={[
          styles.roleSelector,
          {
            backgroundColor: role === "ignore" ? textColor + "10" : tintColor + "18",
          },
        ]}
      >
        <Text
          style={{
            color: role === "ignore" ? textColor : tintColor,
            fontWeight: "700",
            fontSize: 12,
          }}
        >
          {ROLE_LABELS[role]}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={role === "ignore" ? textColor : tintColor}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={[styles.dropdown, { backgroundColor: surfaceColor, borderColor }]}>
          {ROLE_OPTIONS.map((opt) => {
            const active = opt === role;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  onChange(opt);
                  setExpanded(false);
                }}
                style={[
                  styles.dropdownItem,
                  { backgroundColor: active ? tintColor + "15" : "transparent" },
                ]}
              >
                <Text
                  style={{
                    color: active ? tintColor : textColor,
                    fontWeight: active ? "700" : "500",
                    fontSize: 13,
                  }}
                >
                  {ROLE_LABELS[opt]}
                </Text>
                {active && <Ionicons name="checkmark" size={16} color={tintColor} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  backdropCenter: { justifyContent: "center", alignItems: "center" },
  backdropBottom: { justifyContent: "flex-end" },
  desktopDialog: {
    width: 720,
    maxWidth: "95%",
    maxHeight: "90%",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  mobileSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    minHeight: "60%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18, fontWeight: "800" },
  scrollContent: { padding: 20 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  fileName: { flex: 1, fontWeight: "700", fontSize: 13 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    opacity: 0.55,
    marginBottom: 8,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  columnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexWrap: "wrap",
  },
  roleSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  dropdown: {
    width: "100%",
    marginTop: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  previewBox: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
    marginBottom: 12,
    maxHeight: 200,
  },
  previewRow: {
    flexDirection: "row",
  },
  previewHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
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
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
    minWidth: 100,
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: "transparent" },
});
