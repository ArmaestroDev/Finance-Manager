import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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

export function CashModal({
  visible,
  value,
  onChangeText,
  onSave,
  onClose,
  textColor,
  backgroundColor,
  tintColor,
  i18n,
}: CashModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <Text style={[styles.modalTitle, { color: textColor }]}>
            {i18n.update_cash_title}
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              { color: textColor, borderColor: tintColor },
            ]}
            keyboardType="numeric"
            value={value}
            onChangeText={onChangeText}
            autoFocus
            selectTextOnFocus
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose} style={styles.modalButton}>
              <Text style={{ color: textColor }}>{i18n.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSave}
              style={[styles.modalButton, { backgroundColor: tintColor }]}
            >
              <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                {i18n.save}
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
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 24,
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
});
