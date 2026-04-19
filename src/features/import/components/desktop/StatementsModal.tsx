import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useThemeColor } from "../../../../shared/hooks/use-theme-color";
import { useSettings } from "../../../../shared/context/SettingsContext";
import {
  useBankStatements,
  type BankStatement,
} from "../../context/BankStatementsContext";
import { useTransactionsContext } from "../../../transactions/context/TransactionsContext";

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

export function StatementsModal({
  visible,
  accountId,
  accountType,
  onClose,
  onImport,
}: StatementsModalProps) {
  const backgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");
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

    // Alert.alert with buttons is unreliable on react-native-web; use
    // window.confirm on web (matches useAccountTransactions pattern).
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
      const blob = base64ToBlob(base64, mime);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      console.error("Failed to open PDF:", e);
      Alert.alert(
        i18n.stmt_pdf_unavailable || "PDF not available for this statement",
      );
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  const renderItem = ({ item }: { item: BankStatement }) => {
    const clickable = !!item.hasPdf;
    return (
      <View
        style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}
      >
        <TouchableOpacity
          activeOpacity={clickable ? 0.7 : 1}
          onPress={clickable ? () => handleOpenPdf(item) : undefined}
          disabled={!clickable}
          style={styles.cardHeader}
        >
          <View style={[styles.iconBg, { backgroundColor: tintColor + "12" }]}>
            <Ionicons name="document-text" size={20} color={tintColor} />
          </View>
          <View style={styles.cardTitleArea}>
            <Text
              style={[styles.cardFileName, { color: textColor }]}
              numberOfLines={1}
            >
              {item.fileName}
            </Text>
            <Text style={[styles.cardMeta, { color: textColor }]}>
              {formatDate(item.uploadedAt)}
              {item.bank ? ` · ${item.bank}` : ""}
              {item.iban ? ` · ${item.iban}` : ""}
            </Text>
          </View>
          {clickable && (
            <Ionicons
              name="open-outline"
              size={16}
              color={textColor}
              style={{ opacity: 0.4 }}
            />
          )}
        </TouchableOpacity>

        <View style={styles.cardFooter}>
          <View style={styles.statsRow}>
            <View
              style={[styles.statBadge, { backgroundColor: tintColor + "15" }]}
            >
              <Text style={[styles.statText, { color: tintColor }]}>
                {item.importedTxIds.length} {i18n.stmt_imported || "imported"}
              </Text>
            </View>
            {item.skippedCount > 0 && (
              <View
                style={[styles.statBadge, { backgroundColor: "#F59E0B15" }]}
              >
                <Text style={[styles.statText, { color: "#F59E0B" }]}>
                  {item.skippedCount} {i18n.stmt_skipped || "skipped"}
                </Text>
              </View>
            )}
            {item.period && (
              <View
                style={[
                  styles.statBadge,
                  { backgroundColor: textColor + "08" },
                ]}
              >
                <Text
                  style={[styles.statText, { color: textColor, opacity: 0.6 }]}
                >
                  {item.period}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={[styles.deleteBtn, { backgroundColor: "#F43F5E12" }]}
            activeOpacity={0.6}
          >
            <Ionicons name="trash-outline" size={15} color="#F43F5E" />
            <Text style={styles.deleteBtnText}>
              {i18n.delete || "Delete"}
            </Text>
          </TouchableOpacity>
        </View>

        {item.parseWarning && (
          <View style={[styles.warningRow, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="warning-outline" size={14} color="#92400E" />
            <Text style={styles.warningText}>{item.parseWarning}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View
          style={[
            styles.dialog,
            { backgroundColor, borderColor },
          ]}
        >
          <View style={[styles.dialogHeader, { borderBottomColor: borderColor }]}>
            <View style={styles.headerLeft}>
              <Ionicons name="folder-open-outline" size={22} color={tintColor} />
              <Text style={[styles.dialogTitle, { color: textColor }]}>
                {i18n.stmt_title || "Bank Statements"}
              </Text>
              {statements.length > 0 && (
                <View
                  style={[styles.countBadge, { backgroundColor: tintColor + "15" }]}
                >
                  <Text style={[styles.countBadgeText, { color: tintColor }]}>
                    {statements.length}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerRight}>
              {onImport && (
                <TouchableOpacity
                  onPress={onImport}
                  style={[styles.importBtn, { backgroundColor: tintColor }]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={16}
                    color={backgroundColor}
                  />
                  <Text
                    style={[styles.importBtnText, { color: backgroundColor }]}
                  >
                    {i18n.import || "Import"}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={textColor} />
              </TouchableOpacity>
            </View>
          </View>

          {statements.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>📄</Text>
              <Text
                style={[styles.emptyText, { color: textColor, opacity: 0.5 }]}
              >
                {i18n.stmt_empty || "No statements imported yet"}
              </Text>
              <Text
                style={{
                  color: textColor,
                  opacity: 0.4,
                  fontSize: 13,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {i18n.stmt_empty_hint ||
                  "Use the Import button to upload bank statements"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={statements}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: {
    width: 560,
    maxWidth: "90%",
    maxHeight: "80%",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },
  dialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  importBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 8,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleArea: {
    flex: 1,
    gap: 2,
  },
  cardFileName: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardMeta: {
    fontSize: 12,
    opacity: 0.5,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },
  statBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  deleteBtnText: {
    color: "#F43F5E",
    fontSize: 12,
    fontWeight: "600",
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  warningText: {
    fontSize: 12,
    color: "#92400E",
    flex: 1,
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
