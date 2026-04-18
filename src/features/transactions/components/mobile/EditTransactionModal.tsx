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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <Text style={[styles.modalTitle, { color: textColor }]}>Edit Transaction</Text>
          <TextInput style={[styles.input, { color: textColor, borderColor: tintColor }]} placeholder="Transaction name" placeholderTextColor={textColor + "50"} value={editTitle} onChangeText={setEditTitle} />
          <TextInput style={[styles.input, { color: textColor, borderColor: tintColor }]} placeholder="Amount" placeholderTextColor={textColor + "50"} keyboardType="numeric" value={editAmount} onChangeText={setEditAmount} />
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose} style={styles.modalButton}><Text style={{ color: textColor }}>{i18n.cancel}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { onDelete(transaction); onClose(); }} style={[styles.modalButton, { backgroundColor: "#FF6B6B" }]}><Text style={{ color: "#fff", fontWeight: "600" }}>{i18n.delete}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { onUpdate(transaction, editTitle, editAmount); onClose(); }} style={[styles.modalButton, { backgroundColor: tintColor }]}><Text style={{ color: backgroundColor, fontWeight: "600" }}>{i18n.save}</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", maxWidth: 320, borderRadius: 16, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 24, textAlign: "center" },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  modalButton: { flex: 1, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 999, alignItems: "center", justifyContent: "center" },
});
