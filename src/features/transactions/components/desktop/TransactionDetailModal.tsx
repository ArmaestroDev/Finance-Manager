import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Transaction } from "../../../../services/enableBanking";
import { getTransactionAmount } from "../../utils/transactions";
import { cleanRemittanceInfo } from "../../../../shared/utils/financeHelpers";

interface TransactionCategory { id: string; name: string; color: string; }

interface TransactionDetailModalProps {
  visible: boolean;
  transaction: Transaction | null;
  categories: TransactionCategory[];
  getCategoryForTransaction: (txId: string) => TransactionCategory | null;
  onAssignCategory: (txId: string, categoryId: string | null) => void;
  onClose: () => void;
  onEdit?: (tx: Transaction) => void;
  type: "connected" | "manual";
  backgroundColor: string;
  textColor: string;
  tintColor: string;
}

export function TransactionDetailModal({ visible, transaction, categories, getCategoryForTransaction, onAssignCategory, onClose, onEdit, type, backgroundColor, textColor, tintColor }: TransactionDetailModalProps) {
  if (!transaction) return null;

  const amount = getTransactionAmount(transaction);
  const isNeg = amount < 0;
  const txId =
    transaction.transaction_id ||
    `gen_${transaction.booking_date || ""}_${transaction.transaction_amount.amount}_${transaction.creditor?.name || transaction.debtor?.name || ""}`;
  const txCat = getCategoryForTransaction(txId);

  const fields: { label: string; value: string }[] = [];
  if (transaction.creditor?.name) fields.push({ label: "Creditor", value: transaction.creditor.name });
  if (transaction.debtor?.name) fields.push({ label: "Debtor", value: transaction.debtor.name });
  if (transaction.booking_date) fields.push({ label: "Booking Date", value: new Date(transaction.booking_date).toLocaleDateString() });
  if (transaction.value_date) fields.push({ label: "Value Date", value: new Date(transaction.value_date).toLocaleDateString() });
  if (transaction.credit_debit_indicator) fields.push({ label: "Type", value: transaction.credit_debit_indicator === "CRDT" ? "Credit" : "Debit" });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor }]}>
          <Text style={[styles.title, { color: textColor }]}>Transaction Details</Text>

          {/* Amount — large and prominent */}
          <View style={[styles.amountBanner, { backgroundColor: isNeg ? textColor + "08" : "#2ecc7115" }]}>
            <Text style={[styles.amountText, { color: isNeg ? textColor : "#2ecc71" }]}>
              {isNeg ? "" : "+"}
              {new Intl.NumberFormat("de-DE", { style: "currency", currency: transaction.transaction_amount.currency }).format(amount)}
            </Text>
          </View>

          <View style={styles.twoColumn}>
            {/* Left: detail fields */}
            <View style={styles.leftCol}>
              {fields.map((f) => (
                <View key={f.label} style={[styles.fieldRow, { borderBottomColor: textColor + "10" }]}>
                  <Text style={[styles.fieldLabel, { color: textColor }]}>{f.label}</Text>
                  <Text style={[styles.fieldValue, { color: textColor }]}>{f.value}</Text>
                </View>
              ))}
              {transaction.remittance_information && transaction.remittance_information.length > 0 && (
                <View style={[styles.fieldRow, { flexDirection: "column", alignItems: "flex-start", borderBottomColor: textColor + "10" }]}>
                  <Text style={[styles.fieldLabel, { color: textColor, marginBottom: 4 }]}>Reference</Text>
                  <Text style={[styles.fieldValue, { color: textColor, opacity: 0.7, textAlign: "left" }]}>
                    {cleanRemittanceInfo(transaction.remittance_information)}
                  </Text>
                </View>
              )}
              {transaction.transaction_id && (
                <View style={{ paddingVertical: 8 }}>
                  <Text style={[styles.fieldLabel, { color: textColor, marginBottom: 2 }]}>Transaction ID</Text>
                  <Text style={{ color: textColor, opacity: 0.4, fontSize: 11 }}>{transaction.transaction_id}</Text>
                </View>
              )}
            </View>

            {/* Right: category assignment */}
            <View style={[styles.rightCol, { borderLeftColor: textColor + "15", borderLeftWidth: 1 }]}>
              <Text style={[styles.catTitle, { color: textColor }]}>Category</Text>
              <View style={styles.catPills}>
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => onAssignCategory(txId, null)}
                  style={[styles.catPill, { backgroundColor: !txCat ? textColor : textColor + "15", borderColor: textColor + "30" }]}
                >
                  <Text style={{ color: !txCat ? backgroundColor : textColor, fontSize: 12, fontWeight: "600" }}>None</Text>
                </TouchableOpacity>
                {categories.map((cat) => {
                  const isIncomeCat = cat.name.toLowerCase() === "einkommen" || cat.name.toLowerCase() === "income";
                  const isDisabled = isNeg ? isIncomeCat : !isIncomeCat;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.6}
                      onPress={() => !isDisabled && onAssignCategory(txId, cat.id)}
                      disabled={isDisabled}
                      style={[styles.catPill, {
                        backgroundColor: txCat?.id === cat.id ? cat.color : cat.color + (isDisabled ? "0A" : "20"),
                        borderColor: isDisabled ? cat.color + "30" : cat.color,
                        opacity: isDisabled ? 0.4 : 1,
                      }]}
                    >
                      <Text style={{ color: txCat?.id === cat.id ? "#fff" : textColor, fontSize: 12, fontWeight: "600" }}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.buttons}>
            {type === "manual" && onEdit && (
              <TouchableOpacity onPress={() => { onClose(); onEdit(transaction); }} style={[styles.btn, { backgroundColor: tintColor }]}>
                <Text style={{ color: backgroundColor, fontWeight: "600" }}>Edit</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={[styles.btn, { backgroundColor: textColor + "15" }]}>
              <Text style={{ color: textColor, fontWeight: "600" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 640, maxHeight: "85%", borderRadius: 20, padding: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  amountBanner: { padding: 20, borderRadius: 14, alignItems: "center", marginBottom: 20 },
  amountText: { fontSize: 36, fontWeight: "800" },
  twoColumn: { flexDirection: "row", gap: 20, marginBottom: 20 },
  leftCol: { flex: 1.2 },
  rightCol: { flex: 1, paddingLeft: 20 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  fieldLabel: { fontSize: 13, opacity: 0.5, fontWeight: "500" },
  fieldValue: { fontSize: 14, fontWeight: "500", flexShrink: 1, textAlign: "right" },
  catTitle: { fontSize: 14, fontWeight: "700", marginBottom: 12 },
  catPills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  buttons: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  btn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, alignItems: "center" },
});
