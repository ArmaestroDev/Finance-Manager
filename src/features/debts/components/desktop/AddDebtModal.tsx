import React, { useState } from "react";
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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

  const handleClose = () => { setDebtAmount(""); setDebtDesc(""); setSelectedEntityId(null); setDebtDirection("I_OWE"); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor }]}>
          <Text style={[styles.title, { color: textColor }]}>{i18n.add_debt_title}</Text>

          {/* Two-column: person picker left, form right */}
          <View style={styles.twoColumn}>
            {/* Left: person selector */}
            <View style={styles.leftCol}>
              <Text style={[styles.label, { color: textColor }]}>{i18n.person_label}</Text>
              <View style={styles.personList}>
                {entities.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    onPress={() => setSelectedEntityId(e.id)}
                    style={[
                      styles.personBtn,
                      { backgroundColor: selectedEntityId === e.id ? tintColor : textColor + "10" },
                    ]}
                  >
                    <View style={[styles.personAvatar, { backgroundColor: selectedEntityId === e.id ? "#fff3" : tintColor + "30" }]}>
                      <Text style={{ color: selectedEntityId === e.id ? "#fff" : tintColor, fontWeight: "700", fontSize: 13 }}>
                        {e.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ color: selectedEntityId === e.id ? "#fff" : textColor, fontWeight: "500" }}>
                      {e.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Right: amount, description, direction */}
            <View style={styles.rightCol}>
              <Text style={[styles.label, { color: textColor }]}>{i18n.amount_label}</Text>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: textColor + "25", backgroundColor: textColor + "08" }]}
                placeholder="0.00"
                placeholderTextColor={textColor + "50"}
                keyboardType="numeric"
                value={debtAmount}
                onChangeText={setDebtAmount}
              />
              <Text style={[styles.label, { color: textColor, marginTop: 8 }]}>{i18n.desc_label}</Text>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: textColor + "25", backgroundColor: textColor + "08" }]}
                placeholder={i18n.placeholder_desc}
                placeholderTextColor={textColor + "50"}
                value={debtDesc}
                onChangeText={setDebtDesc}
              />
              <Text style={[styles.label, { color: textColor, marginTop: 8 }]}>{i18n.who_owes_who}</Text>
              <View style={styles.dirRow}>
                <TouchableOpacity
                  style={[styles.dirBtn, { backgroundColor: debtDirection === "I_OWE" ? "#e74c3c" : textColor + "10" }]}
                  onPress={() => setDebtDirection("I_OWE")}
                >
                  <Text style={{ color: debtDirection === "I_OWE" ? "#fff" : textColor, fontWeight: "600" }}>
                    {i18n.i_owe_them}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dirBtn, { backgroundColor: debtDirection === "OWES_ME" ? "#2ecc71" : textColor + "10" }]}
                  onPress={() => setDebtDirection("OWES_ME")}
                >
                  <Text style={{ color: debtDirection === "OWES_ME" ? "#fff" : textColor, fontWeight: "600" }}>
                    {i18n.they_owe_me}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity onPress={handleClose} style={[styles.btn, { backgroundColor: textColor + "12" }]}>
              <Text style={{ color: textColor, fontWeight: "600" }}>{i18n.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddDebt} style={[styles.btn, { backgroundColor: tintColor }]}>
              <Text style={{ color: backgroundColor, fontWeight: "600" }}>{i18n.save}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 620, borderRadius: 20, padding: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  twoColumn: { flexDirection: "row", gap: 20, marginBottom: 20 },
  leftCol: { flex: 1 },
  rightCol: { flex: 1.2 },
  label: { fontSize: 12, fontWeight: "600", opacity: 0.6, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  personList: { gap: 8 },
  personBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10 },
  personAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  input: { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 15, marginBottom: 4 },
  dirRow: { flexDirection: "row", gap: 8 },
  dirBtn: { flex: 1, padding: 11, borderRadius: 10, alignItems: "center" },
  buttons: { flexDirection: "row", gap: 12 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 999, alignItems: "center" },
});
