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
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: cardColor }]}>
          <Text style={[styles.title, { color: textColor }]}>{isEditing ? i18n.edit_profile_title : i18n.save_profile_title}</Text>
          <View style={styles.formRow}>
            <View style={styles.leftCol}>
              <Text style={[styles.label, { color: textColor }]}>{i18n.profile_name_label}</Text>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: textColor + "30" }]}
                value={profileName}
                onChangeText={setProfileName}
                placeholder="e.g. Retirement, House"
                placeholderTextColor="gray"
              />
            </View>
            <View style={styles.rightCol}>
              <Text style={[styles.label, { color: textColor }]}>{i18n.profile_color_label}</Text>
              <View style={styles.colorGrid}>
                {PROFILE_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorDot, { backgroundColor: color }, selectedColor === color && styles.selectedDot]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
            </View>
          </View>
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: textColor + "12" }]} onPress={onClose}>
              <Text style={{ color: textColor, fontWeight: "600" }}>{i18n.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: "#00afdb" }]} onPress={handleSave}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>{isEditing ? i18n.update : i18n.save}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 540, borderRadius: 20, padding: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 24 },
  formRow: { flexDirection: "row", gap: 24, marginBottom: 24 },
  leftCol: { flex: 1 },
  rightCol: { flex: 1 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
  selectedDot: { borderWidth: 3, borderColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  buttons: { flexDirection: "row", gap: 12 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: "center" },
});
