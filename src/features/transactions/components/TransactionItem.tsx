import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Transaction } from "../../../services/enableBanking";
import { getTransactionAmount } from "../utils/transactions";
import { cleanRemittanceInfo } from "../../../shared/utils/financeHelpers";

interface TransactionCategory {
  id: string;
  name: string;
  color: string;
}

interface TransactionItemProps {
  item: Transaction;
  textColor: string;
  getCategoryForTransaction: (txId: string) => TransactionCategory | null;
  onPress: (tx: Transaction) => void;
}

export function TransactionItem({
  item,
  textColor,
  getCategoryForTransaction,
  onPress,
}: TransactionItemProps) {
  const amount = getTransactionAmount(item);
  const isNegative = amount < 0;
  const name =
    item.creditor?.name || item.debtor?.name || "Unknown Transaction";
  const date = new Date(
    item.booking_date || item.value_date || "",
  ).toLocaleDateString();
  const reference = cleanRemittanceInfo(item.remittance_information);
  const txId =
    item.transaction_id ||
    `gen_${item.booking_date || ""}_${item.transaction_amount.amount}_${item.creditor?.name || item.debtor?.name || ""}`;
  const txCat = getCategoryForTransaction(txId);

  return (
    <TouchableOpacity onPress={() => onPress(item)}>
      <View
        style={[styles.transactionItem, { borderBottomColor: textColor }]}
      >
        {txCat && (
          <View
            style={[styles.categoryDot, { backgroundColor: txCat.color }]}
          />
        )}
        <View style={styles.transactionLeft}>
          <Text style={[styles.transactionName, { color: textColor }]}>
            {name}
          </Text>
          <Text
            style={[
              styles.transactionDate,
              { color: textColor, opacity: 0.6 },
            ]}
          >
            {date}
          </Text>
          {reference && (
            <Text
              style={[
                styles.referenceText,
                { color: textColor, opacity: 0.5 },
              ]}
              numberOfLines={2}
            >
              {reference}
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: isNegative ? textColor : "#2ecc71" },
          ]}
        >
          {isNegative ? "" : "+"}
          {new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: item.transaction_amount.currency,
          }).format(amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  transactionLeft: {
    flex: 1,
    marginRight: 16,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
  },
  referenceText: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
});
