import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Transaction } from "../../../../services/enableBanking";
import { getTransactionAmount } from "../../utils/transactions";
import { cleanRemittanceInfo } from "../../../../shared/utils/financeHelpers";
import { formatDate } from "../../../../shared/utils/date";

interface TransactionCategory {
  id: string;
  name: string;
  color: string;
}

interface TransactionDetailModalProps {
  visible: boolean;
  transaction: Transaction | null;
  categories: TransactionCategory[];
  getCategoryForTransaction: (txId: string) => TransactionCategory | null;
  onAssignCategory: (txId: string, categoryId: string | null) => void;
  onClose: () => void;
  onEdit?: (tx: Transaction) => void;
  type: "connected" | "manual";
  backgroundColor: string;
  textColor: string;
  tintColor: string;
}

export function TransactionDetailModal({
  visible,
  transaction,
  categories,
  getCategoryForTransaction,
  onAssignCategory,
  onClose,
  onEdit,
  type,
  backgroundColor,
  textColor,
  tintColor,
}: TransactionDetailModalProps) {
  if (!transaction) return null;

  const amount = getTransactionAmount(transaction);
  const isNeg = amount < 0;
  const txId =
    transaction.transaction_id ||
    `gen_${transaction.booking_date || ""}_${transaction.transaction_amount.amount}_${transaction.creditor?.name || transaction.debtor?.name || ""}`;
  const txCat = getCategoryForTransaction(txId);

  const handleAssign = (categoryId: string | null) => {
    onAssignCategory(txId, categoryId);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, { backgroundColor, maxWidth: 380 }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Transaction Details
            </Text>

            {/* Category Assignment */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  color: textColor,
                  opacity: 0.6,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                Category
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => handleAssign(null)}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: !txCat
                        ? textColor
                        : textColor + "15",
                      borderColor: textColor + "30",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: !txCat ? backgroundColor : textColor,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => {
                  const isIncomeCat = cat.name.toLowerCase() === "einkommen" || cat.name.toLowerCase() === "income";
                  const isDisabled = isNeg ? isIncomeCat : !isIncomeCat;

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.6}
                      onPress={() => !isDisabled && handleAssign(cat.id)}
                      disabled={isDisabled}
                      style={[
                        styles.catPill,
                        {
                          backgroundColor:
                            txCat?.id === cat.id
                              ? cat.color
                              : cat.color + (isDisabled ? "0A" : "20"),
                          borderColor: isDisabled ? cat.color + "30" : cat.color,
                          opacity: isDisabled ? 0.4 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            txCat?.id === cat.id ? "#fff" : textColor,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Amount */}
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: isNeg ? textColor : "#2ecc71",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              {isNeg ? "" : "+"}
              {new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: transaction.transaction_amount.currency,
              }).format(amount)}
            </Text>

            {/* Detail fields */}
            {transaction.creditor?.name && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: textColor }]}>
                  Creditor
                </Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                  {transaction.creditor.name}
                </Text>
              </View>
            )}
            {transaction.debtor?.name && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: textColor }]}>
                  Debtor
                </Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                  {transaction.debtor.name}
                </Text>
              </View>
            )}
            {transaction.booking_date && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: textColor }]}>
                  Booking Date
                </Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                  {formatDate(transaction.booking_date)}
                </Text>
              </View>
            )}
            {transaction.value_date && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: textColor }]}>
                  Value Date
                </Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                  {formatDate(transaction.value_date)}
                </Text>
              </View>
            )}
            {transaction.credit_debit_indicator && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: textColor }]}>
                  Type
                </Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                  {transaction.credit_debit_indicator === "CRDT"
                    ? "Credit"
                    : "Debit"}
                </Text>
              </View>
            )}
            {transaction.remittance_information &&
              transaction.remittance_information.length > 0 && (
                <View
                  style={[
                    styles.detailRow,
                    {
                      flexDirection: "column",
                      alignItems: "flex-start",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: textColor, marginBottom: 4 },
                    ]}
                  >
                    Reference
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: textColor, opacity: 0.7 },
                    ]}
                  >
                    {cleanRemittanceInfo(transaction.remittance_information)}
                  </Text>
                </View>
              )}
            {transaction.transaction_id && (
              <View
                style={[
                  styles.detailRow,
                  {
                    flexDirection: "column",
                    alignItems: "flex-start",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.detailLabel,
                    { color: textColor, marginBottom: 4 },
                  ]}
                >
                  Transaction ID
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    { color: textColor, opacity: 0.5, fontSize: 11 },
                  ]}
                >
                  {transaction.transaction_id}
                </Text>
              </View>
            )}

            {/* Buttons */}
            <View style={[styles.modalButtons, { marginTop: 20 }]}>
              {type === "manual" && onEdit && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onEdit(transaction);
                  }}
                  style={[styles.modalButton, { backgroundColor: tintColor }]}
                >
                  <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                    Edit
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.modalButton,
                  { backgroundColor: textColor + "15" },
                ]}
              >
                <Text style={{ color: textColor, fontWeight: "600" }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
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
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  detailRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  detailLabel: {
    fontSize: 13,
    opacity: 0.6,
    fontWeight: "500" as const,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500" as const,
    flexShrink: 1,
    textAlign: "right" as const,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
