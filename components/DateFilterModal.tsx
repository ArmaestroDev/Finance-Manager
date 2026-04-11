import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface DateFilterModalProps {
  visible: boolean;
  title: string;
  tempFrom: string;
  tempTo: string;
  onTempFromChange: (value: string) => void;
  onTempToChange: (value: string) => void;
  onApply: () => void;
  onCancel: () => void;
  backgroundColor: string;
  textColor: string;
  tintColor: string;
}

export function DateFilterModal({
  visible,
  title,
  tempFrom,
  tempTo,
  onTempFromChange,
  onTempToChange,
  onApply,
  onCancel,
  backgroundColor,
  textColor,
  tintColor,
}: DateFilterModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <Text style={[styles.modalTitle, { color: textColor }]}>
            {title}
          </Text>

          <View style={{ gap: 12, marginBottom: 16 }}>
            <View>
              <Text
                style={{ color: textColor, marginBottom: 4, fontSize: 12 }}
              >
                From (DD-MM-YYYY)
              </Text>
              <TextInput
                style={[
                  styles.dateInput,
                  { color: textColor, borderColor: tintColor },
                ]}
                value={tempFrom}
                onChangeText={onTempFromChange}
                placeholder="DD-MM-YYYY"
                placeholderTextColor={textColor + "50"}
              />
            </View>
            <View>
              <Text
                style={{ color: textColor, marginBottom: 4, fontSize: 12 }}
              >
                To (DD-MM-YYYY)
              </Text>
              <TextInput
                style={[
                  styles.dateInput,
                  { color: textColor, borderColor: tintColor },
                ]}
                value={tempTo}
                onChangeText={onTempToChange}
                placeholder="DD-MM-YYYY"
                placeholderTextColor={textColor + "50"}
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.modalButton}
            >
              <Text style={{ color: textColor }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onApply}
              style={[styles.modalButton, { backgroundColor: tintColor }]}
            >
              <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                Apply
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
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
});
