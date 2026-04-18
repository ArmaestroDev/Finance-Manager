import React, { useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { DebtEntity } from "../../context/DebtsContext";

interface AddDebtModalProps {
  visible: boolean;
  entities: DebtEntity[];
  onAdd: (entityId: string, amount: number, description: string, direction: "I_OWE" | "OWES_ME", date: string) => Promise<void> | Promise<string>;
  onClose: () => void;
  backgroundColor: string;
  textColor: string;
  tintColor: string;
  i18n: Record<string, string>;
}

export function AddDebtModal({ visible, entities, onAdd, onClose, backgroundColor, textColor, tintColor, i18n }: AddDebtModalProps) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtDesc, setDebtDesc] = useState("");
  const [debtDirection, setDebtDirection] = useState<"I_OWE" | "OWES_ME">("I_OWE");

  const handleAddDebt = async () => {
    if (!selectedEntityId || !debtAmount) return;
    const amount = parseFloat(debtAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) { Alert.alert("Invalid Amount", "Please enter a valid positive amount."); return; }
    await onAdd(selectedEntityId, amount, debtDesc || "Debt", debtDirection, new Date().toISOString());
    handleClose();
  };

  const handleClose = () => {
    setDebtAmount(""); setDebtDesc(""); setSelectedEntityId(null); setDebtDirection("I_OWE"); onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <Text style={[styles.modalTitle, { color: textColor }]}>{i18n.add_debt_title}</Text>
          <Text style={[styles.label, { color: textColor }]}>{i18n.person_label}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, maxHeight: 50 }}>
            {entities.map((e) => (
              <TouchableOpacity key={e.id} onPress={() => setSelectedEntityId(e.id)}
                style={[styles.chip, { backgroundColor: selectedEntityId === e.id ? tintColor : textColor + "10", borderColor: selectedEntityId === e.id ? tintColor : "transparent" }]}>
                <Text style={{ color: selectedEntityId === e.id ? "#fff" : textColor }}>{e.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.label, { color: textColor }]}>{i18n.amount_label}</Text>
          <TextInput style={[styles.input, { color: textColor, borderColor: tintColor }]} placeholder="0.00" placeholderTextColor={textColor + "50"} keyboardType="numeric" value={debtAmount} onChangeText={setDebtAmount} />
          <Text style={[styles.label, { color: textColor }]}>{i18n.desc_label}</Text>
          <TextInput style={[styles.input, { color: textColor, borderColor: tintColor }]} placeholder={i18n.placeholder_desc} placeholderTextColor={textColor + "50"} value={debtDesc} onChangeText={setDebtDesc} />
          <Text style={[styles.label, { color: textColor }]}>{i18n.who_owes_who}</Text>
          <View style={styles.directionRow}>
            <TouchableOpacity style={[styles.directionButton, { backgroundColor: debtDirection === "I_OWE" ? "#e74c3c" : textColor + "10", flex: 1, marginRight: 8 }]} onPress={() => setDebtDirection("I_OWE")}>
              <Text style={{ color: debtDirection === "I_OWE" ? "white" : textColor }}>{i18n.i_owe_them}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.directionButton, { backgroundColor: debtDirection === "OWES_ME" ? "#2ecc71" : textColor + "10", flex: 1, marginLeft: 8 }]} onPress={() => setDebtDirection("OWES_ME")}>
              <Text style={{ color: debtDirection === "OWES_ME" ? "white" : textColor }}>{i18n.they_owe_me}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={handleClose} style={styles.modalButton}><Text style={{ color: textColor }}>{i18n.cancel}</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleAddDebt} style={[styles.modalButton, { backgroundColor: tintColor }]}><Text style={{ color: backgroundColor, fontWeight: "600" }}>{i18n.save}</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", maxWidth: 400, borderRadius: 20, padding: 20, maxHeight: "80%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: "500", opacity: 0.7 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  directionRow: { flexDirection: "row", marginBottom: 8 },
  directionButton: { padding: 12, borderRadius: 12, alignItems: "center" },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", marginTop: 24, gap: 12 },
  modalButton: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 999, alignItems: "center", justifyContent: "center" },
});
