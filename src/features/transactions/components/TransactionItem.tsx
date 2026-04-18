import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Transaction } from "../../../services/enableBanking";
import { getTransactionAmount } from "../utils/transactions";
import { cleanRemittanceInfo } from "../../../shared/utils/financeHelpers";
import { Colors } from "../../../constants/theme";
import { useColorScheme } from "../../../shared/hooks/use-color-scheme";
import { IconSymbol } from "../../../shared/components/ui/icon-symbol";

interface TransactionCategory {
  id: string;
  name: string;
  color: string;
}

interface TransactionItemProps {
  item: Transaction;
  textColor?: string;
  getCategoryForTransaction: (txId: string) => TransactionCategory | null;
  onPress: (tx: Transaction) => void;
}

export function TransactionItem({
  item,
  getCategoryForTransaction,
  onPress,
}: TransactionItemProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  
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
      <View style={styles.transactionItem}>
        <View style={[styles.iconContainer, { backgroundColor: txCat?.color ? txCat.color + "25" : "#6B728020" }]}>
          <IconSymbol 
            name="creditcard.fill" 
            size={20} 
            color={txCat?.color || "#6B7280"} 
          />
        </View>
        <View style={styles.transactionLeft}>
          <Text style={[styles.transactionName, { color: theme.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text
            style={[
              styles.transactionDate,
              { color: theme.textSecondary },
            ]}
          >
            {date} {reference ? `• ${reference}` : ""}
          </Text>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: isNegative ? theme.text : theme.income },
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
    paddingHorizontal: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  transactionLeft: {
    flex: 1,
    marginRight: 16,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
});
