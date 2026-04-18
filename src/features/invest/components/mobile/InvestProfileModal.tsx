import React, { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PROFILE_COLORS } from "../../hooks/useInvestCalculator";

interface InvestProfileModalProps {
  visible: boolean;
  isEditing: boolean;
  onSave: (name: string, color: string) => void;
  onClose: () => void;
  textColor: string;
  cardColor: string;
  i18n: Record<string, string>;
}

export function InvestProfileModal({ visible, isEditing, onSave, onClose, textColor, cardColor, i18n }: InvestProfileModalProps) {
  const [profileName, setProfileName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PROFILE_COLORS[0]);

  const handleSave = () => { onSave(profileName, selectedColor); setProfileName(""); onClose(); };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalView, { backgroundColor: cardColor }]}>
          <Text style={[styles.modalTitle, { color: textColor }]}>{isEditing ? i18n.edit_profile_title : i18n.save_profile_title}</Text>
          <Text style={[styles.inputLabel, { color: textColor, marginTop: 10 }]}>{i18n.profile_name_label}</Text>
          <TextInput style={[styles.modalInput, { color: textColor, borderColor: textColor }]} value={profileName} onChangeText={setProfileName} placeholder="e.g. Retirement, House" placeholderTextColor="gray" />
          <Text style={[styles.inputLabel, { color: textColor, marginTop: 10 }]}>{i18n.profile_color_label}</Text>
          <View style={styles.colorPicker}>
            {PROFILE_COLORS.map((color) => (
              <TouchableOpacity key={color} style={[styles.colorOption, { backgroundColor: color }, selectedColor === color && styles.selectedColor]} onPress={() => setSelectedColor(color)} />
            ))}
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={onClose}><Text style={styles.modalBtnText}>{i18n.cancel}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnSave} onPress={handleSave}><Text style={styles.modalBtnText}>{isEditing ? i18n.update : i18n.save}</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalView: { width: "80%", borderRadius: 20, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  inputLabel: { fontSize: 14, fontWeight: "600" },
  modalInput: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 5, marginBottom: 15 },
  colorPicker: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10, marginBottom: 20 },
  colorOption: { width: 30, height: 30, borderRadius: 15 },
  selectedColor: { borderWidth: 2, borderColor: "white" },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  modalBtnCancel: { flex: 1, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  modalBtnSave: { flex: 1, backgroundColor: "#00afdb", paddingVertical: 16, paddingHorizontal: 24, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  modalBtnText: { color: "white", fontWeight: "bold" },
});
