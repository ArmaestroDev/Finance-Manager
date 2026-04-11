import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface TransactionCategory {
  id: string;
  name: string;
  color: string;
}

interface CategoryManageModalProps {
  visible: boolean;
  categories: TransactionCategory[];
  categoryColors: string[];
  onAdd: (name: string, color: string) => Promise<void>;
  onUpdate: (id: string, updates: { name: string; color: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  backgroundColor: string;
  textColor: string;
  tintColor: string;
}

export function CategoryManageModal({
  visible,
  categories,
  categoryColors,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
  backgroundColor,
  textColor,
  tintColor,
}: CategoryManageModalProps) {
  const [editingCat, setEditingCat] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);

  const handleClose = () => {
    setEditingCat(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, { backgroundColor, maxWidth: 380 }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {editingCat ? "Edit Category" : "Manage Categories"}
            </Text>

            {editingCat ? (
              /* Edit/Create form */
              <View>
                <TextInput
                  style={[
                    styles.input,
                    { color: textColor, borderColor: tintColor },
                  ]}
                  placeholder="Category name"
                  placeholderTextColor={textColor + "50"}
                  value={editingCat.name}
                  onChangeText={(t) =>
                    setEditingCat({ ...editingCat, name: t })
                  }
                />
                <Text
                  style={{
                    color: textColor,
                    opacity: 0.6,
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  Color
                </Text>
                <View style={styles.colorGrid}>
                  {categoryColors.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() =>
                        setEditingCat({ ...editingCat, color: c })
                      }
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c },
                        editingCat.color === c && styles.colorSwatchSelected,
                      ]}
                    />
                  ))}
                </View>
                <View style={[styles.modalButtons, { marginTop: 16 }]}>
                  <TouchableOpacity
                    onPress={() => setEditingCat(null)}
                    style={styles.modalButton}
                  >
                    <Text style={{ color: textColor }}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!editingCat.name.trim()) return;
                      if (editingCat.id) {
                        await onUpdate(editingCat.id, {
                          name: editingCat.name,
                          color: editingCat.color,
                        });
                      } else {
                        await onAdd(editingCat.name, editingCat.color);
                      }
                      setEditingCat(null);
                    }}
                    style={[
                      styles.modalButton,
                      { backgroundColor: tintColor },
                    ]}
                  >
                    <Text
                      style={{ color: backgroundColor, fontWeight: "600" }}
                    >
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Category list */
              <View>
                {categories.length === 0 && (
                  <Text
                    style={{
                      color: textColor,
                      opacity: 0.5,
                      textAlign: "center",
                      marginBottom: 16,
                    }}
                  >
                    No categories yet
                  </Text>
                )}
                {categories.map((cat) => (
                  <View key={cat.id} style={styles.catManageRow}>
                    <View
                      style={[
                        styles.catManageDot,
                        { backgroundColor: cat.color },
                      ]}
                    />
                    <Text
                      style={[styles.catManageName, { color: textColor }]}
                    >
                      {cat.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setEditingCat({
                          id: cat.id,
                          name: cat.name,
                          color: cat.color,
                        })
                      }
                      style={{ padding: 6 }}
                    >
                      <Ionicons name="pencil" size={16} color={textColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const doDelete = async () => {
                          await onDelete(cat.id);
                        };
                        if (Platform.OS === "web") {
                          if (window.confirm(`Delete "${cat.name}"?`))
                            doDelete();
                        } else {
                          Alert.alert(
                            "Delete Category",
                            `Delete "${cat.name}"?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete",
                                style: "destructive",
                                onPress: doDelete,
                              },
                            ],
                          );
                        }
                      }}
                      style={{ padding: 6 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#FF6B6B"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={() =>
                    setEditingCat({
                      id: "",
                      name: "",
                      color: categoryColors[0],
                    })
                  }
                  style={[styles.addCatButton, { borderColor: tintColor }]}
                >
                  <Ionicons name="add" size={18} color={tintColor} />
                  <Text style={{ color: tintColor, fontWeight: "600" }}>
                    New Category
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClose}
                  style={[
                    styles.modalButton,
                    { marginTop: 16, backgroundColor: textColor + "15" },
                  ]}
                >
                  <Text style={{ color: textColor, fontWeight: "600" }}>
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
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
    maxHeight: "80%",
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
  colorGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
    marginBottom: 12,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  catManageRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  catManageDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  catManageName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500" as const,
  },
  addCatButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: "dashed" as const,
    borderRadius: 8,
    marginTop: 12,
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
