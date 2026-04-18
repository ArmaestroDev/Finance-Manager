import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { Transaction } from "../../../../services/enableBanking";

interface EditTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onUpdate: (editingTx: Transaction, editTitle: string, editAmount: string) => void;
  onDelete: (editingTx: Transaction) => void;
  onClose: () => void;
  backgroundColor: string;
  textColor: string;
  tintColor: string;
  i18n: Record<string, string>;
}

export function EditTransactionModal({ visible, transaction, onUpdate, onDelete, onClose, backgroundColor, textColor, tintColor, i18n }: EditTransactionModalProps) {
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");

  useEffect(() => {
    if (transaction) {
      setEditTitle(transaction.remittance_information?.[0] || transaction.creditor?.name || "");
      setEditAmount(transaction.transaction_amount.amount);
    }
  }, [transaction]);

  if (!transaction) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <Text style={[styles.modalTitle, { color: textColor }]}>Edit Transaction</Text>
          <View style={styles.fieldsRow}>
            <View style={styles.fieldWide}>
              <Text style={[styles.fieldLabel, { color: textColor, opacity: 0.6 }]}>Name</Text>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: textColor + "30", backgroundColor: textColor + "08" }]}
                placeholder="Transaction name"
                placeholderTextColor={textColor + "50"}
                value={editTitle}
                onChangeText={setEditTitle}
              />
            </View>
            <View style={styles.fieldNarrow}>
              <Text style={[styles.fieldLabel, { color: textColor, opacity: 0.6 }]}>Amount</Text>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: textColor + "30", backgroundColor: textColor + "08" }]}
                placeholder="Amount"
                placeholderTextColor={textColor + "50"}
                keyboardType="numeric"
                value={editAmount}
                onChangeText={setEditAmount}
              />
            </View>
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose} style={[styles.modalButton, { backgroundColor: textColor + "12" }]}>
              <Text style={{ color: textColor, fontWeight: "600" }}>{i18n.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { onDelete(transaction); onClose(); }} style={[styles.modalButton, { backgroundColor: "#FF6B6B" }]}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>{i18n.delete}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { onUpdate(transaction, editTitle, editAmount); onClose(); }} style={[styles.modalButton, { backgroundColor: tintColor }]}>
              <Text style={{ color: backgroundColor, fontWeight: "600" }}>{i18n.save}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalContent: { width: "100%", maxWidth: 580, borderRadius: 20, padding: 32, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 22, fontWeight: "700", marginBottom: 24 },
  fieldsRow: { flexDirection: "row", gap: 16, marginBottom: 24 },
  fieldWide: { flex: 2 },
  fieldNarrow: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  modalButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, alignItems: "center", justifyContent: "center" },
});
