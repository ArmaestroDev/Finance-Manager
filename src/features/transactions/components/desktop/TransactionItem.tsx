import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Transaction } from "../../../../services/enableBanking";
import { getTransactionAmount } from "../../utils/transactions";
import { cleanRemittanceInfo } from "../../../../shared/utils/financeHelpers";
import { Colors } from "../../../../constants/theme";
import { useColorScheme } from "../../../../shared/hooks/use-color-scheme";

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

export function TransactionItem({ item, getCategoryForTransaction, onPress }: TransactionItemProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const amount = getTransactionAmount(item);
  const isNegative = amount < 0;
  const name = item.creditor?.name || item.debtor?.name || "Unknown Transaction";
  const reference = cleanRemittanceInfo(item.remittance_information);
  const txId =
    item.transaction_id ||
    `gen_${item.booking_date || ""}_${item.transaction_amount.amount}_${item.creditor?.name || item.debtor?.name || ""}`;
  const txCat = getCategoryForTransaction(txId);

  return (
    <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={[styles.row, { borderBottomColor: theme.border }]}>
        {/* Category dot */}
        <View style={styles.catCol}>
          {txCat ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={[styles.catDot, { backgroundColor: txCat.color }]} />
              <Text style={{ color: txCat.color, fontSize: 12, fontWeight: "600" }} numberOfLines={1}>{txCat.name}</Text>
            </View>
          ) : (
            <View style={[styles.catDot, { backgroundColor: theme.border }]} />
          )}
        </View>
        {/* Merchant + reference */}
        <View style={styles.nameCol}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{name}</Text>
          {reference ? <Text style={[styles.reference, { color: theme.textSecondary }]} numberOfLines={1}>{reference}</Text> : null}
        </View>
        {/* Amount */}
        <Text style={[styles.amountCol, { color: isNegative ? theme.text : theme.income }]}>
          {isNegative ? "" : "+"}
          {new Intl.NumberFormat("de-DE", { style: "currency", currency: item.transaction_amount.currency }).format(amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  catCol: { width: 120 },
  nameCol: { flex: 1 },
  amountCol: { width: 120, textAlign: "right", fontSize: 14, fontWeight: "600" },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  name: { fontSize: 14, fontWeight: "600" },
  reference: { fontSize: 12, marginTop: 2 },
});
