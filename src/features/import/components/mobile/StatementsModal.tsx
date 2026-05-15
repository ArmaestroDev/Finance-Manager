import * as FileSystem from "expo-file-system/legacy";
import * as Linking from "expo-linking";
import React from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FMFonts } from "@/src/constants/theme";
import {
  Button,
  IconClose,
  IconDoc,
  IconChevR,
  IconTrash,
  IconUpload,
  IconWarn,
  Label,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "../../../../shared/context/SettingsContext";
import {
  useBankStatements,
  type BankStatement,
} from "../../context/BankStatementsContext";
import { useTransactionsContext } from "../../../transactions/context/TransactionsContext";
import { formatDate } from "../../../../shared/utils/date";

interface StatementsModalProps {
  visible: boolean;
  accountId: string;
  accountType: "connected" | "manual";
  onClose: () => void;
  onImport?: () => void;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export function StatementsModal({
  visible,
  accountId,
  accountType,
  onClose,
  onImport,
}: StatementsModalProps) {
  const t = useFMTheme();
  const insets = useSafeAreaInsets();
  const { i18n } = useSettings();
  const { getStatementsForAccount, deleteStatement, getPdfData } =
    useBankStatements();
  const { deleteStatementTransactions } = useTransactionsContext();

  const statements = getStatementsForAccount(accountId);

  const handleDelete = (stmt: BankStatement) => {
    const performDelete = async () => {
      await deleteStatementTransactions(
        stmt.accountId,
        stmt.id,
        stmt.importedTxIds,
        accountType === "manual",
      );
      await deleteStatement(stmt.id);
    };

    const title = i18n.stmt_delete_title || "Delete Statement";
    const msg =
      i18n.stmt_delete_msg ||
      `Delete "${stmt.fileName}" and all ${stmt.importedTxIds.length} imported transactions?`;

    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${msg}`)) {
        performDelete();
      }
      return;
    }

    Alert.alert(title, msg, [
      { text: i18n.cancel || "Cancel", style: "cancel" },
      {
        text: i18n.delete || "Delete",
        style: "destructive",
        onPress: performDelete,
      },
    ]);
  };

  const handleOpenPdf = async (stmt: BankStatement) => {
    if (!stmt.hasPdf) {
      Alert.alert(
        i18n.stmt_pdf_unavailable || "PDF not available for this statement",
      );
      return;
    }
    const base64 = await getPdfData(stmt.id);
    if (!base64) {
      Alert.alert(
        i18n.stmt_pdf_unavailable || "PDF not available for this statement",
      );
      return;
    }
    const mime = stmt.mimeType || "application/pdf";

    try {
      if (Platform.OS === "web") {
        const blob = base64ToBlob(base64, mime);
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
      }

      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) throw new Error("No writable directory available");
      const fileUri = `${baseDir}${sanitizeFileName(stmt.fileName || `${stmt.id}.pdf`)}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const canOpen = await Linking.canOpenURL(fileUri);
      if (canOpen) {
        await Linking.openURL(fileUri);
      } else {
        Alert.alert(
          i18n.stmt_pdf_unavailable || "PDF not available for this statement",
        );
      }
    } catch (e) {
      console.error("Failed to open PDF:", e);
      Alert.alert(
        i18n.stmt_pdf_unavailable || "PDF not available for this statement",
      );
    }
  };

  const renderItem = ({ item }: { item: BankStatement }) => {
    const clickable = !!item.hasPdf;
    const metaParts = [formatDate(item.uploadedAt)];
    if (item.bank) metaParts.push(item.bank);

    return (
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
        {/* File header — tap to open PDF */}
        <View style={styles.cardHeader}>
          <Pressable
            onPress={clickable ? () => handleOpenPdf(item) : undefined}
            disabled={!clickable}
            style={({ pressed }) => [
              styles.cardHeaderTouch,
              { opacity: pressed && clickable ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.iconBg, { backgroundColor: t.accentSoft }]}>
              <IconDoc size={16} color={t.accent} />
            </View>
            <View style={styles.cardTitleArea}>
              <Text
                style={{
                  fontFamily: FMFonts.sansSemibold,
                  fontSize: 13.5,
                  color: t.ink,
                }}
                numberOfLines={1}
              >
                {item.fileName}
              </Text>
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  fontSize: 11,
                  color: t.inkMuted,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {metaParts.join(" · ")}
              </Text>
            </View>
            {clickable ? (
              <View style={styles.openLink}>
                <Text
                  style={{
                    fontFamily: FMFonts.sansMedium,
                    fontSize: 11,
                    color: t.accent,
                  }}
                >
                  {i18n.stmt_open_pdf || "Open PDF"}
                </Text>
                <IconChevR size={11} color={t.accent} />
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Stats badges */}
        <View style={styles.statsRow}>
          <View style={[styles.statBadge, { backgroundColor: t.accentSoft }]}>
            <Text style={[styles.statText, { color: t.accent }]}>
              {item.importedTxIds.length} {i18n.stmt_imported || "imported"}
            </Text>
          </View>
          {item.skippedCount > 0 ? (
            <View style={[styles.statBadge, { backgroundColor: t.warnSoft }]}>
              <Text style={[styles.statText, { color: t.warn }]}>
                {item.skippedCount} {i18n.stmt_skipped || "skipped"}
              </Text>
            </View>
          ) : null}
          {item.period ? (
            <View style={[styles.statBadge, { backgroundColor: t.surfaceAlt }]}>
              <Text style={[styles.statText, { color: t.inkSoft }]}>
                {item.period}
              </Text>
            </View>
          ) : null}
        </View>

        {item.iban ? (
          <Text
            style={{
              fontFamily: FMFonts.mono,
              fontSize: 11,
              color: t.inkMuted,
              marginTop: 8,
              fontVariant: ["tabular-nums"],
            }}
            numberOfLines={1}
          >
            {item.iban}
          </Text>
        ) : null}

        {item.parseWarning ? (
          <View style={[styles.warningRow, { backgroundColor: t.warnSoft }]}>
            <IconWarn size={12} color={t.warn} />
            <Text style={[styles.warningText, { color: t.warn }]}>
              {item.parseWarning}
            </Text>
          </View>
        ) : null}

        <View style={[styles.cardFooter, { borderTopColor: t.line }]}>
          <Pressable
            onPress={() => handleDelete(item)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.deleteBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <IconTrash size={13} color={t.neg} />
            <Text
              style={{
                fontFamily: FMFonts.sansMedium,
                fontSize: 11.5,
                color: t.neg,
                marginLeft: 5,
              }}
            >
              {i18n.delete || "Delete"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: t.surface,
              borderColor: t.lineStrong,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: t.lineStrong }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: t.line }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontFamily: FMFonts.display,
                  fontSize: 20,
                  color: t.ink,
                  letterSpacing: -0.3,
                  lineHeight: 24,
                }}
                numberOfLines={1}
              >
                {i18n.stmt_title || "Statements"}
              </Text>
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  fontSize: 11,
                  color: t.inkSoft,
                  marginTop: 2,
                }}
              >
                {statements.length}{" "}
                {statements.length === 1
                  ? i18n.stmt_count_single || "statement"
                  : i18n.stmt_count_plural || "statements"}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {onImport ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<IconUpload size={12} />}
                  onPress={onImport}
                >
                  {i18n.import || "Import"}
                </Button>
              ) : null}
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.5 : 1,
                  padding: 4,
                })}
              >
                <IconClose size={15} color={t.inkSoft} />
              </Pressable>
            </View>
          </View>

          {statements.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: t.surfaceAlt }]}>
                <IconDoc size={22} color={t.inkMuted} />
              </View>
              <Text
                style={{
                  fontFamily: FMFonts.sansSemibold,
                  fontSize: 14,
                  color: t.inkSoft,
                  marginTop: 14,
                  textAlign: "center",
                }}
              >
                {i18n.stmt_empty || "No statements imported yet"}
              </Text>
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  fontSize: 12,
                  color: t.inkMuted,
                  marginTop: 6,
                  textAlign: "center",
                  lineHeight: 18,
                  paddingHorizontal: 24,
                }}
              >
                {i18n.stmt_empty_hint ||
                  "Use the Import button to upload bank statements"}
              </Text>
              {onImport ? (
                <View style={{ marginTop: 18 }}>
                  <Button
                    variant="secondary"
                    size="md"
                    icon={<IconUpload size={13} />}
                    onPress={onImport}
                  >
                    {i18n.import || "Import"}
                  </Button>
                </View>
              ) : null}
            </View>
          ) : (
            <FlatList
              data={statements}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    overflow: "hidden",
    maxHeight: "92%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  card: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 0,
    borderWidth: 1,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardHeaderTouch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTitleArea: {
    flex: 1,
    minWidth: 0,
  },
  openLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: 10,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
  },
  statBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statText: {
    fontFamily: FMFonts.sansMedium,
    fontSize: 11,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  warningText: {
    fontFamily: FMFonts.sansMedium,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderTopWidth: 1,
    marginTop: 14,
    paddingVertical: 12,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
