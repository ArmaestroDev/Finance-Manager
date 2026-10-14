import * as FileSystem from "expo-file-system/legacy";
import * as Linking from "expo-linking";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  Avatar,
  Button,
  EmptyState,
  IconButton,
  IconDoc,
  IconOpen,
  IconTrash,
  IconUpload,
  IconWarn,
  ListItem,
  useFMTheme,
} from "@/src/shared/design";
import { showAlert } from "@/src/shared/utils/alert";
import { formatDate } from "@/src/shared/utils/date";
import { useTransactionsContext } from "../../transactions/context/TransactionsContext";
import { useBankStatements, type BankStatement } from "../context/BankStatementsContext";

interface StatementsModalProps {
  visible: boolean;
  accountId: string;
  accountType: "connected" | "manual";
  onClose: () => void;
  onImport?: () => void;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

// One implementation for every layout: `Sheet` already renders a centered
// dialog on desktop and a bottom sheet on mobile.
export function StatementsModal({
  visible,
  accountId,
  accountType,
  onClose,
  onImport,
}: StatementsModalProps) {
  const { i18n } = useSettings();
  const { getStatementsForAccount, deleteStatement, getPdfData } = useBankStatements();
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
    showAlert(i18n.stmt_delete_title, i18n.stmt_delete_msg, [
      { text: i18n.cancel, style: "cancel" },
      { text: i18n.delete, style: "destructive", onPress: () => void performDelete() },
    ]);
  };

  const handleOpenPdf = async (stmt: BankStatement) => {
    const base64 = stmt.hasPdf ? await getPdfData(stmt.id) : null;
    if (!base64) {
      showAlert(i18n.stmt_pdf_unavailable);
      return;
    }
    const mime = stmt.mimeType || "application/pdf";
    try {
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(base64ToBlob(base64, mime));
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
      if (await Linking.canOpenURL(fileUri)) {
        await Linking.openURL(fileUri);
      } else {
        showAlert(i18n.stmt_pdf_unavailable);
      }
    } catch (e) {
      console.error("Failed to open PDF:", e);
      showAlert(i18n.stmt_pdf_unavailable);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={i18n.stmt_title}
      width={560}
      actions={
        onImport ? (
          <Button icon={<IconUpload size={16} />} onPress={onImport}>
            {i18n.import}
          </Button>
        ) : undefined
      }
    >
      {statements.length === 0 ? (
        <EmptyState icon={<IconDoc />} title={i18n.stmt_empty} />
      ) : (
        <ScrollView style={{ maxHeight: 520, marginHorizontal: -24 }} showsVerticalScrollIndicator={false}>
          {statements.map((item) => (
            <StatementRow
              key={item.id}
              item={item}
              onOpen={() => handleOpenPdf(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </ScrollView>
      )}
    </Sheet>
  );
}

function StatementRow({
  item,
  onOpen,
  onDelete,
}: {
  item: BankStatement;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  const clickable = !!item.hasPdf;
  const meta = [
    formatDate(item.uploadedAt),
    `${item.importedTxIds.length} ${i18n.stmt_imported}`,
    item.skippedCount > 0 ? `${item.skippedCount} ${i18n.stmt_skipped}` : null,
    item.period,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View>
      <ListItem
        leading={<Avatar icon={<IconDoc size={18} />} />}
        title={item.fileName}
        subtitle={meta}
        onPress={clickable ? onOpen : undefined}
        accessibilityLabel={clickable ? `${i18n.stmt_open_pdf}: ${item.fileName}` : item.fileName}
        style={{ paddingHorizontal: 24 }}
        trailingAction={
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {clickable ? (
              <IconButton icon={<IconOpen size={18} />} label={i18n.stmt_open_pdf} onPress={onOpen} />
            ) : null}
            <IconButton icon={<IconTrash size={18} />} label={i18n.delete} onPress={onDelete} />
          </View>
        }
      />
      {item.parseWarning ? (
        <View style={[styles.warningRow, { backgroundColor: t.warnSoft }]}>
          <IconWarn size={14} color={t.warn} />
          <Text style={[styles.warningText, { color: t.warn }]}>{item.parseWarning}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: FMRadius.sm,
    marginHorizontal: 24,
    marginBottom: 8,
  },
  warningText: {
    fontFamily: FMFonts.sansMedium,
    fontSize: FMType.caption,
    flex: 1,
    lineHeight: 17,
  },
});
