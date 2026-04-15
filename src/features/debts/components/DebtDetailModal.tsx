import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { DebtItem, DebtEntity } from "../context/DebtsContext";

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

export function DebtDetailModal({
  visible,
  entity,
  debts,
  netBalance,
  onClose,
  backgroundColor,
  textColor,
  tintColor,
  i18n,
}: DebtDetailModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(Math.abs(amount));
  };

  const entityDebts = entity
    ? debts
        .filter((d) => d.entityId === entity.id)
        .sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        )
    : [];

  if (!entity) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, { backgroundColor, height: "80%" }]}
        >
          <View style={styles.detailHeader}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {entity.name}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.detailNet,
              { backgroundColor: tintColor + "12" },
            ]}
          >
            <Text style={{ color: textColor, fontSize: 12 }}>
              {i18n.net_balance}
            </Text>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: netBalance >= 0 ? "#2ecc71" : "#e74c3c",
              }}
            >
              {netBalance >= 0 ? "They owe you " : "You owe them "}
              {formatCurrency(netBalance)}
            </Text>
          </View>

          <Text
            style={{
              color: textColor,
              marginTop: 16,
              marginBottom: 8,
              fontWeight: "600",
            }}
          >
            {i18n.history}
          </Text>

          <FlatList
            data={entityDebts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <Text
                style={{
                  color: textColor,
                  opacity: 0.5,
                  textAlign: "center",
                  marginTop: 20,
                }}
              >
                {i18n.no_history}
              </Text>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.historyRow,
                  { borderBottomColor: textColor + "10" },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: textColor, fontWeight: "500" }}>
                    {item.description}
                  </Text>
                  <Text
                    style={{
                      color: textColor,
                      opacity: 0.5,
                      fontSize: 12,
                    }}
                  >
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={{
                    color:
                      item.type === "OWES_ME" ? "#2ecc71" : "#e74c3c",
                    fontWeight: "600",
                  }}
                >
                  {item.type === "OWES_ME" ? "+" : "-"}
                  {formatCurrency(item.amount)}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  detailNet: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
