import React from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface CashModalProps {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onSave: () => void;
  onClose: () => void;
  textColor: string;
  backgroundColor: string;
  tintColor: string;
  i18n: any;
}

export function CashModal({ visible, value, onChangeText, onSave, onClose, textColor, backgroundColor, tintColor, i18n }: CashModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor }]}>
          <Text style={[styles.title, { color: textColor }]}>{i18n.update_cash_title}</Text>
          <Text style={[styles.hint, { color: textColor, opacity: 0.5 }]}>Enter your current cash on hand in EUR</Text>
          <View style={styles.inputRow}>
            <Text style={[styles.prefix, { color: textColor, opacity: 0.5 }]}>€</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor: tintColor }]}
              keyboardType="numeric"
              value={value}
              onChangeText={onChangeText}
              autoFocus
              selectTextOnFocus
            />
          </View>
          <View style={styles.buttons}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, { backgroundColor: textColor + "12" }]}>
              <Text style={{ color: textColor, fontWeight: "600" }}>{i18n.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSave} style={[styles.btn, { backgroundColor: tintColor }]}>
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
  dialog: { width: "100%", maxWidth: 400, borderRadius: 20, padding: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
  hint: { fontSize: 13, marginBottom: 20 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
  prefix: { fontSize: 24, fontWeight: "700" },
  input: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 14, fontSize: 22, fontWeight: "700" },
  buttons: { flexDirection: "row", gap: 12 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: "center" },
});
