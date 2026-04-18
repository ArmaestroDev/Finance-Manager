import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type AccountCategory = "Giro" | "Savings" | "Stock";

interface AccountCategoryModalProps {
  visible: boolean;
  currentCategory: AccountCategory;
  onSelect: (category: AccountCategory) => void;
  onClose: () => void;
  backgroundColor: string;
  textColor: string;
  tintColor: string;
}

export function AccountCategoryModal({ visible, currentCategory, onSelect, onClose, backgroundColor, textColor, tintColor }: AccountCategoryModalProps) {
  const categories: { value: AccountCategory; label: string; description: string }[] = [
    { value: "Giro", label: "Giro", description: "Checking / current account" },
    { value: "Savings", label: "Savings", description: "Savings account" },
    { value: "Stock", label: "Stock", description: "Investment / brokerage" },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor }]}>
          <Text style={[styles.title, { color: textColor }]}>Account Category</Text>
          <Text style={[styles.subtitle, { color: textColor, opacity: 0.5 }]}>
            Choose how this account is classified
          </Text>
          <View style={styles.options}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.optionRow,
                  { borderColor: currentCategory === cat.value ? tintColor : textColor + "15" },
                  currentCategory === cat.value && { backgroundColor: tintColor + "12" },
                ]}
                onPress={() => { onSelect(cat.value); onClose(); }}
              >
                <View style={[styles.radio, { borderColor: currentCategory === cat.value ? tintColor : textColor + "40" }]}>
                  {currentCategory === cat.value && <View style={[styles.radioDot, { backgroundColor: tintColor }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, { color: textColor }]}>{cat.label}</Text>
                  <Text style={[styles.optionDesc, { color: textColor, opacity: 0.5 }]}>{cat.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: textColor + "10" }]}>
            <Text style={{ color: textColor, fontWeight: "600" }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 440, borderRadius: 20, padding: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  options: { gap: 10, marginBottom: 20 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 12, borderWidth: 1.5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { fontSize: 15, fontWeight: "600" },
  optionDesc: { fontSize: 12, marginTop: 2 },
  closeBtn: { paddingVertical: 12, borderRadius: 999, alignItems: "center" },
});
