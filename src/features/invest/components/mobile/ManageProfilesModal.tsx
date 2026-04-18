import React from "react";
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Profile } from "../../hooks/useInvestCalculator";

interface ManageProfilesModalProps {
  visible: boolean;
  profiles: Profile[];
  onEdit: (profile: Profile) => void;
  onDelete: (id: string) => Promise<void>;
  onCreateNew: () => void;
  onClose: () => void;
  textColor: string;
  cardColor: string;
  i18n: Record<string, string>;
}

export function ManageProfilesModal({ visible, profiles, onEdit, onDelete, onCreateNew, onClose, textColor, cardColor, i18n }: ManageProfilesModalProps) {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalView, { backgroundColor: cardColor, height: "60%" }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.modalTitle, { color: textColor, marginBottom: 0 }]}>{i18n.manage_profiles}</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 24, color: textColor }}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {profiles.map((profile) => (
              <View key={profile.id} style={styles.profileRow}>
                <View style={styles.profileInfo}>
                  <View style={[styles.colorDot, { backgroundColor: profile.color }]} />
                  <Text style={[styles.profileName, { color: textColor }]}>{profile.name}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 15 }}>
                  <TouchableOpacity onPress={() => { onClose(); setTimeout(() => onEdit(profile), 100); }}>
                    <Text style={{ color: "#00afdb", fontWeight: "bold" }}>{i18n.edit}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    if (Platform.OS === "web") {
                      if (window.confirm(i18n.delete_profile_msg.replace("{name}", profile.name))) onDelete(profile.id);
                    } else {
                      Alert.alert(i18n.delete_profile_title, i18n.delete_profile_msg.replace("{name}", profile.name),
                        [{ text: i18n.cancel, style: "cancel" }, { text: i18n.delete, style: "destructive", onPress: () => onDelete(profile.id) }]);
                    }
                  }}>
                    <Text style={{ color: "#fe3d3d", fontWeight: "bold" }}>{i18n.delete}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.createProfileBtn} onPress={() => { onClose(); setTimeout(() => onCreateNew(), 100); }}>
            <Text style={styles.createBtnText}>{i18n.create_profile}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalView: { width: "80%", borderRadius: 20, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  profileRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(128,128,128,0.2)" },
  profileInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  profileName: { fontWeight: "600", fontSize: 16 },
  createProfileBtn: { backgroundColor: "#00afdb", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignItems: "center", marginTop: 20, width: "100%" },
  createBtnText: { color: "white", fontWeight: "bold" },
});
