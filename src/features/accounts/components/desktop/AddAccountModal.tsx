import React from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { AccountCategory } from "../../context/AccountsContext";

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
  name: string;
  setName: (name: string) => void;
  balance: string;
  setBalance: (balance: string) => void;
  category: AccountCategory;
  setCategory: (category: AccountCategory) => void;
  textColor: string;
  backgroundColor: string;
  tintColor: string;
  i18n: any;
}

export function AddAccountModal({ visible, onClose, onAdd, name, setName, balance, setBalance, category, setCategory, textColor, backgroundColor, tintColor, i18n }: AddAccountModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor }]}>
          <Text style={[styles.title, { color: textColor }]}>{i18n.add_manual_title}</Text>
          <View style={styles.fieldsRow}>
            <View style={styles.fieldWide}>
              <Text style={[styles.label, { color: textColor }]}>{i18n.name_label}</Text>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: textColor + "30", backgroundColor: textColor + "08" }]}
                placeholder={i18n.placeholder_name}
                placeholderTextColor={textColor + "50"}
                value={name}
                onChangeText={setName}
              />
            </View>
            <View style={styles.fieldNarrow}>
              <Text style={[styles.label, { color: textColor }]}>{i18n.balance_label}</Text>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: textColor + "30", backgroundColor: textColor + "08" }]}
                placeholder="0.00"
                placeholderTextColor={textColor + "50"}
                keyboardType="numeric"
                value={balance}
                onChangeText={setBalance}
              />
            </View>
          </View>
          <Text style={[styles.label, { color: textColor }]}>{i18n.category_label}</Text>
          <View style={styles.categoryRow}>
            {(["Giro", "Savings", "Stock"] as AccountCategory[]).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catBtn, { backgroundColor: category === cat ? tintColor : textColor + "10" }]}
                onPress={() => setCategory(cat)}
              >
                <Text style={{ color: category === cat ? backgroundColor : textColor, fontWeight: "600" }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.buttons}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, { backgroundColor: textColor + "12" }]}>
              <Text style={{ color: textColor, fontWeight: "600" }}>{i18n.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAdd} style={[styles.btn, { backgroundColor: tintColor }]}>
              <Text style={{ color: backgroundColor, fontWeight: "600" }}>{i18n.create_btn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 560, borderRadius: 20, padding: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 24 },
  fieldsRow: { flexDirection: "row", gap: 16, marginBottom: 20 },
  fieldWide: { flex: 2 },
  fieldNarrow: { flex: 1 },
  label: { fontSize: 12, fontWeight: "600", opacity: 0.6, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  categoryRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  catBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  buttons: { flexDirection: "row", gap: 12 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: "center" },
});
