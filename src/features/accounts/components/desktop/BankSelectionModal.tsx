import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { ASPSP } from "../../hooks/useBankConnections";

interface BankSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  loadingBanks: boolean;
  filteredBanks: ASPSP[];
  searchQuery: string;
  onSearch: (text: string) => void;
  onSelectBank: (bank: ASPSP) => void;
  textColor: string;
  backgroundColor: string;
  tintColor: string;
  i18n: any;
}

export function BankSelectionModal({ visible, onClose, loadingBanks, filteredBanks, searchQuery, onSearch, onSelectBank, textColor, backgroundColor, tintColor, i18n }: BankSelectionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>{i18n.select_bank_title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={textColor} />
            </TouchableOpacity>
          </View>
          <View style={[styles.searchBar, { backgroundColor: textColor + "10" }]}>
            <Ionicons name="search" size={18} color={textColor + "80"} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder={i18n.search_bank_placeholder}
              placeholderTextColor={textColor + "50"}
              value={searchQuery}
              onChangeText={onSearch}
            />
          </View>
          {loadingBanks ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={tintColor} />
            </View>
          ) : (
            <FlatList
              data={filteredBanks}
              keyExtractor={(item) => item.name}
              style={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.bankRow, { borderBottomColor: textColor + "10" }]}
                  onPress={() => onSelectBank(item)}
                >
                  <View style={[styles.bankIcon, { backgroundColor: tintColor + "20" }]}>
                    <Text style={{ fontSize: 16 }}>🏦</Text>
                  </View>
                  <Text style={[styles.bankName, { color: textColor }]}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color={textColor + "40"} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Text style={{ color: textColor, opacity: 0.5 }}>No banks found</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 520, height: "70%", borderRadius: 20, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700" },
  closeBtn: { padding: 6 },
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 10, paddingHorizontal: 12, height: 42, marginBottom: 16, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  list: { flex: 1 },
  bankRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  bankIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  bankName: { flex: 1, fontSize: 15, fontWeight: "500" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 32 },
});
