import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface TransactionCategory { id: string; name: string; color: string; }

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

export function CategoryManageModal({ visible, categories, categoryColors, onAdd, onUpdate, onDelete, onClose, backgroundColor, textColor, tintColor }: CategoryManageModalProps) {
  const [editingCat, setEditingCat] = useState<{ id: string; name: string; color: string } | null>(null);

  const handleClose = () => { setEditingCat(null); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          {/* Two-column: category list left, edit form right */}
          <View style={styles.twoColumn}>
            {/* Left: list */}
            <View style={styles.leftCol}>
              <Text style={[styles.colTitle, { color: textColor }]}>Categories</Text>
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {categories.length === 0 && (
                  <Text style={{ color: textColor, opacity: 0.5, textAlign: "center", marginTop: 24 }}>No categories yet</Text>
                )}
                {categories.map((cat) => (
                  <View key={cat.id} style={styles.catRow}>
                    <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                    <Text style={[styles.catName, { color: textColor }]} numberOfLines={1}>{cat.name}</Text>
                    <TouchableOpacity onPress={() => setEditingCat({ id: cat.id, name: cat.name, color: cat.color })} style={styles.actionBtn}>
                      <Ionicons name="pencil" size={14} color={tintColor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const doDelete = async () => { await onDelete(cat.id); };
                        if (Platform.OS === "web") { if (window.confirm(`Delete "${cat.name}"?`)) doDelete(); }
                        else { Alert.alert("Delete Category", `Delete "${cat.name}"?`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: doDelete }]); }
                      }}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="trash-outline" size={14} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                onPress={() => setEditingCat({ id: "", name: "", color: categoryColors[0] })}
                style={[styles.newCatBtn, { borderColor: tintColor }]}
              >
                <Ionicons name="add" size={16} color={tintColor} />
                <Text style={{ color: tintColor, fontWeight: "600", fontSize: 13 }}>New Category</Text>
              </TouchableOpacity>
            </View>

            {/* Right: edit / create form */}
            <View style={[styles.rightCol, { borderLeftColor: textColor + "15", borderLeftWidth: 1 }]}>
              {editingCat ? (
                <>
                  <Text style={[styles.colTitle, { color: textColor }]}>
                    {editingCat.id ? "Edit Category" : "New Category"}
                  </Text>
                  <Text style={[styles.fieldLabel, { color: textColor }]}>Name</Text>
                  <TextInput
                    style={[styles.input, { color: textColor, borderColor: tintColor }]}
                    placeholder="Category name"
                    placeholderTextColor={textColor + "50"}
                    value={editingCat.name}
                    onChangeText={(t) => setEditingCat({ ...editingCat, name: t })}
                  />
                  <Text style={[styles.fieldLabel, { color: textColor, marginTop: 16 }]}>Color</Text>
                  <View style={styles.colorGrid}>
                    {categoryColors.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setEditingCat({ ...editingCat, color: c })}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: c },
                          editingCat.color === c && styles.colorSwatchSelected,
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.editButtons}>
                    <TouchableOpacity onPress={() => setEditingCat(null)} style={[styles.editBtn, { backgroundColor: textColor + "12" }]}>
                      <Text style={{ color: textColor, fontWeight: "600" }}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        if (!editingCat.name.trim()) return;
                        if (editingCat.id) await onUpdate(editingCat.id, { name: editingCat.name, color: editingCat.color });
                        else await onAdd(editingCat.name, editingCat.color);
                        setEditingCat(null);
                      }}
                      style={[styles.editBtn, { backgroundColor: tintColor }]}
                    >
                      <Text style={{ color: backgroundColor, fontWeight: "600" }}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                  <Ionicons name="pricetag-outline" size={40} color={textColor + "30"} />
                  <Text style={{ color: textColor, opacity: 0.4, marginTop: 12, fontSize: 14 }}>Select a category to edit</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: textColor + "12" }]}>
            <Text style={{ color: textColor, fontWeight: "600" }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalContent: { width: "100%", maxWidth: 640, maxHeight: "85%", borderRadius: 20, padding: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  twoColumn: { flexDirection: "row", gap: 24, marginBottom: 20, flex: 1 },
  leftCol: { flex: 1, maxHeight: 440 },
  rightCol: { flex: 1, paddingLeft: 24, maxHeight: 440 },
  colTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  catRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(128,128,128,0.15)", gap: 8 },
  catDot: { width: 12, height: 12, borderRadius: 6 },
  catName: { flex: 1, fontSize: 14, fontWeight: "500" },
  actionBtn: { padding: 6 },
  newCatBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderWidth: 1, borderStyle: "dashed", borderRadius: 8, marginTop: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "600", opacity: 0.6, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 15, marginBottom: 4 },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  colorSwatchSelected: { borderWidth: 3, borderColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
  editButtons: { flexDirection: "row", gap: 10, marginTop: 8 },
  editBtn: { flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: "center" },
  closeBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, alignItems: "center" },
});
