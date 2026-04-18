import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { DebtItem, DebtEntity } from "../../context/DebtsContext";

interface DebtDetailModalProps {
  visible: boolean;
  entity: DebtEntity | null;
  debts: DebtItem[];
  netBalance: number;
  onClose: () => void;
  backgroundColor: string;
  textColor: string;
  tintColor: string;
  i18n: Record<string, string>;
}

export function DebtDetailModal({ visible, entity, debts, netBalance, onClose, backgroundColor, textColor, tintColor, i18n }: DebtDetailModalProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Math.abs(amount));

  const entityDebts = entity
    ? debts.filter((d) => d.entityId === entity.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  if (!entity) return null;

  const totalOwed = entityDebts.filter((d) => d.type === "OWES_ME").reduce((s, d) => s + d.amount, 0);
  const totalOwe = entityDebts.filter((d) => d.type === "I_OWE").reduce((s, d) => s + d.amount, 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{entity.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: textColor }]}>{entity.name}</Text>
              <Text style={{ color: textColor, opacity: 0.5, fontSize: 13 }}>{entityDebts.length} transactions</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={textColor} />
            </TouchableOpacity>
          </View>

          {/* Two-column stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: "#2ecc7115" }]}>
              <Text style={{ color: "#2ecc71", fontSize: 11, fontWeight: "600", textTransform: "uppercase" }}>They Owe You</Text>
              <Text style={{ color: "#2ecc71", fontSize: 20, fontWeight: "800" }}>+{formatCurrency(totalOwed)}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: "#e74c3c15" }]}>
              <Text style={{ color: "#e74c3c", fontSize: 11, fontWeight: "600", textTransform: "uppercase" }}>You Owe</Text>
              <Text style={{ color: "#e74c3c", fontSize: 20, fontWeight: "800" }}>-{formatCurrency(totalOwe)}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: tintColor + "15" }]}>
              <Text style={{ color: tintColor, fontSize: 11, fontWeight: "600", textTransform: "uppercase" }}>Net</Text>
              <Text style={{ color: netBalance >= 0 ? "#2ecc71" : "#e74c3c", fontSize: 20, fontWeight: "800" }}>
                {netBalance >= 0 ? "+" : "-"}{formatCurrency(netBalance)}
              </Text>
            </View>
          </View>

          {/* History table */}
          <View style={[styles.tableHeader, { borderBottomColor: textColor + "15" }]}>
            <Text style={[styles.tableHeaderText, { color: textColor }]}>Date</Text>
            <Text style={[styles.tableHeaderText, { color: textColor, flex: 1 }]}>Description</Text>
            <Text style={[styles.tableHeaderText, { color: textColor }]}>Amount</Text>
          </View>
          <FlatList
            data={entityDebts}
            keyExtractor={(item) => item.id}
            style={styles.list}
            ListEmptyComponent={
              <Text style={{ color: textColor, opacity: 0.5, textAlign: "center", marginTop: 24 }}>{i18n.no_history}</Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.tableRow, { borderBottomColor: textColor + "0A" }]}>
                <Text style={[styles.dateCol, { color: textColor, opacity: 0.6 }]}>
                  {new Date(item.date).toLocaleDateString()}
                </Text>
                <Text style={[styles.descCol, { color: textColor }]} numberOfLines={1}>{item.description}</Text>
                <Text style={[styles.amountCol, { color: item.type === "OWES_ME" ? "#2ecc71" : "#e74c3c" }]}>
                  {item.type === "OWES_ME" ? "+" : "-"}{formatCurrency(item.amount)}
                </Text>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 600, height: "75%", borderRadius: 20, padding: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#8E1E5E", alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#fff", fontSize: 20, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700" },
  closeBtn: { padding: 8 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statBox: { flex: 1, padding: 16, borderRadius: 12, gap: 4 },
  tableHeader: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, marginBottom: 4 },
  tableHeaderText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.5, width: 90 },
  list: { flex: 1 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  dateCol: { width: 90, fontSize: 13 },
  descCol: { flex: 1, fontSize: 14, paddingRight: 8 },
  amountCol: { width: 100, textAlign: "right", fontSize: 14, fontWeight: "600" },
});
