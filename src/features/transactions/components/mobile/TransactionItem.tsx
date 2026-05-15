import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Money, useFMTheme } from "@/src/shared/design";
import type { Transaction } from "@/src/services/enableBanking";
import { cleanRemittanceInfo } from "@/src/shared/utils/financeHelpers";
import {
  getStableTxId,
  getTransactionAmount,
  pickTransactionTitle,
} from "../../utils/transactions";

interface TransactionCategory {
  id: string;
  name: string;
  color: string;
}

interface TransactionItemProps {
  item: Transaction;
  textColor?: string;
  masked?: boolean;
  getCategoryForTransaction: (txId: string) => TransactionCategory | null;
  onPress: (tx: Transaction) => void;
}

// Mobile transaction row. Clean touch layout matching the canonical
// DashboardScreen "recent" rows: small category color dot, merchant title
// (medium), reference secondary line, category NAME label, amount via Money.
export function TransactionItem({
  item,
  masked = false,
  getCategoryForTransaction,
  onPress,
}: TransactionItemProps) {
  const t = useFMTheme();

  const amount = getTransactionAmount(item);
  const title = pickTransactionTitle(item);
  const reference = cleanRemittanceInfo(item.remittance_information);
  const txId = getStableTxId(item);
  const txCat = getCategoryForTransaction(txId);
  // Hide the reference line when it merely echoes the title.
  const showReference =
    !!reference && reference.toLowerCase() !== title.toLowerCase();

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: t.surface, borderColor: t.line },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={[
          styles.dot,
          txCat
            ? { backgroundColor: txCat.color }
            : {
                backgroundColor: "transparent",
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: t.inkMuted,
              },
        ]}
      />
      <View style={styles.body}>
        <Text
          style={{ fontFamily: FMFonts.sansMedium, fontSize: 13, color: t.ink }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {showReference ? (
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 11,
              color: t.inkMuted,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {reference}
          </Text>
        ) : null}
        <Text
          style={{
            fontFamily: FMFonts.sansSemibold,
            fontSize: 10,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: txCat ? txCat.color : t.warn,
            marginTop: showReference ? 5 : 4,
          }}
          numberOfLines={1}
        >
          {txCat ? txCat.name : "Uncategorized"}
        </Text>
      </View>
      <Money value={amount} masked={masked} size={13} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 12,
  },
  body: {
    flex: 1,
    marginRight: 12,
  },
});
