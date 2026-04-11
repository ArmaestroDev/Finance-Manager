import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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

export function AddAccountModal({
  visible,
  onClose,
  onAdd,
  name,
  setName,
  balance,
  setBalance,
  category,
  setCategory,
  textColor,
  backgroundColor,
  tintColor,
  i18n,
}: AddAccountModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <Text style={[styles.modalTitle, { color: textColor }]}>
            {i18n.add_manual_title}
          </Text>

          <Text style={[styles.inputLabel, { color: textColor }]}>
            {i18n.name_label}
          </Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor: tintColor }]}
            placeholder={i18n.placeholder_name}
            placeholderTextColor={textColor + "50"}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.inputLabel, { color: textColor }]}>
            {i18n.balance_label}
          </Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor: tintColor }]}
            placeholder="0.00"
            placeholderTextColor={textColor + "50"}
            keyboardType="numeric"
            value={balance}
            onChangeText={setBalance}
          />

          <Text style={[styles.inputLabel, { color: textColor }]}>
            {i18n.category_label}
          </Text>
          <View style={styles.categoryContainer}>
            {(["Giro", "Savings", "Stock"] as AccountCategory[]).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor:
                      category === cat ? tintColor : tintColor + "10",
                  },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={{
                    color: category === cat ? backgroundColor : textColor,
                    fontWeight: "600",
                  }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose} style={styles.modalButton}>
              <Text style={{ color: textColor }}>{i18n.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onAdd}
              style={[styles.modalButton, { backgroundColor: tintColor }]}
            >
              <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                {i18n.create_btn}
              </Text>
            </TouchableOpacity>
          </View>
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
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  categoryContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
