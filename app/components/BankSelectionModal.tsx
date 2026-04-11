import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { ASPSP } from "../hooks/useBankConnections";

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

export function BankSelectionModal({
  visible,
  onClose,
  loadingBanks,
  filteredBanks,
  searchQuery,
  onSearch,
  onSelectBank,
  textColor,
  backgroundColor,
  tintColor,
  i18n,
}: BankSelectionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {i18n.select_bank_title}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.searchContainer,
              { backgroundColor: tintColor + "10" },
            ]}
          >
            <Ionicons name="search" size={20} color={textColor} />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder={i18n.search_bank_placeholder}
              placeholderTextColor={textColor + "50"}
              value={searchQuery}
              onChangeText={onSearch}
            />
          </View>

          {loadingBanks ? (
            <ActivityIndicator size="large" color={tintColor} />
          ) : (
            <FlatList
              data={filteredBanks}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bankItem}
                  onPress={() => onSelectBank(item)}
                >
                  <Text style={[styles.bankItemName, { color: textColor }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingTop: 100, // Leave space at top
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    height: "100%",
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.1)",
  },
  bankItemName: {
    fontSize: 16,
    fontWeight: "500",
  },
});
