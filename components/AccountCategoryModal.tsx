import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

export function AccountCategoryModal({
  visible,
  currentCategory,
  onSelect,
  onClose,
  backgroundColor,
  textColor,
  tintColor,
}: AccountCategoryModalProps) {
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
            Account Category
          </Text>
          <View style={styles.categoryContainer}>
            {(["Giro", "Savings", "Stock"] as AccountCategory[]).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor:
                      currentCategory === cat ? tintColor : tintColor + "10",
                  },
                ]}
                onPress={() => {
                  onSelect(cat);
                  onClose();
                }}
              >
                <Text
                  style={{
                    color:
                      currentCategory === cat ? backgroundColor : textColor,
                    fontWeight: "600",
                  }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.closeButton,
              { backgroundColor: textColor + "15" },
            ]}
          >
            <Text style={{ color: textColor, fontWeight: "600" }}>Close</Text>
          </TouchableOpacity>
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
  categoryContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});
