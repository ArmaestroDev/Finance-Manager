import React from "react";
import { Alert, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: cardColor }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>{i18n.manage_profiles}</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 22, color: textColor }}>✕</Text></TouchableOpacity>
          </View>
          <FlatList
            data={profiles}
            keyExtractor={(item) => item.id}
            style={styles.list}
            ListEmptyComponent={<Text style={{ color: textColor, opacity: 0.5, textAlign: "center", marginTop: 24 }}>No saved profiles</Text>}
            renderItem={({ item }) => (
              <View style={[styles.profileRow, { borderBottomColor: textColor + "15" }]}>
                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                <Text style={[styles.profileName, { color: textColor }]}>{item.name}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#00afdb20" }]}
                    onPress={() => { onClose(); setTimeout(() => onEdit(item), 100); }}
                  >
                    <Text style={{ color: "#00afdb", fontWeight: "600", fontSize: 13 }}>{i18n.edit}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#fe3d3d20" }]}
                    onPress={() => {
                      if (Platform.OS === "web") {
                        if (window.confirm(i18n.delete_profile_msg.replace("{name}", item.name))) onDelete(item.id);
                      } else {
                        Alert.alert(i18n.delete_profile_title, i18n.delete_profile_msg.replace("{name}", item.name),
                          [{ text: i18n.cancel, style: "cancel" }, { text: i18n.delete, style: "destructive", onPress: () => onDelete(item.id) }]);
                      }
                    }}
                  >
                    <Text style={{ color: "#fe3d3d", fontWeight: "600", fontSize: 13 }}>{i18n.delete}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => { onClose(); setTimeout(onCreateNew, 100); }}
          >
            <Text style={styles.createBtnText}>{i18n.create_profile}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 480, maxHeight: "70%", borderRadius: 20, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "700" },
  list: { flex: 1 },
  profileRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  profileName: { flex: 1, fontSize: 15, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  createBtn: { backgroundColor: "#00afdb", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 16 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
