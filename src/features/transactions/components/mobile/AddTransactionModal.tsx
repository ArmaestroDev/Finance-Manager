import React, { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface AddTransactionModalProps {
  visible: boolean;
  onAdd: (title: string, amount: string) => void;
  onClose: () => void;
  backgroundColor: string;
  textColor: string;
  tintColor: string;
  i18n: Record<string, string>;
}

export function AddTransactionModal({ visible, onAdd, onClose, backgroundColor, textColor, tintColor, i18n }: AddTransactionModalProps) {
  const [txTitle, setTxTitle] = useState("");
  const [txAmount, setTxAmount] = useState("");

  const handleAdd = () => {
    if (!txTitle.trim() || !txAmount.trim()) return;
    onAdd(txTitle, txAmount);
    setTxTitle(""); setTxAmount("");
  };

  const handleClose = () => { setTxTitle(""); setTxAmount(""); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <Text style={[styles.modalTitle, { color: textColor }]}>Add Transaction</Text>
          <TextInput style={[styles.input, { color: textColor, borderColor: tintColor }]} placeholder="Transaction name" placeholderTextColor={textColor + "50"} value={txTitle} onChangeText={setTxTitle} />
          <TextInput style={[styles.input, { color: textColor, borderColor: tintColor }]} placeholder="Amount (use - for expenses)" placeholderTextColor={textColor + "50"} keyboardType="numeric" value={txAmount} onChangeText={setTxAmount} />
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={handleClose} style={styles.modalButton}><Text style={{ color: textColor }}>{i18n.cancel}</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleAdd} style={[styles.modalButton, { backgroundColor: tintColor }]}><Text style={{ color: backgroundColor, fontWeight: "600" }}>Add</Text></TouchableOpacity>
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
