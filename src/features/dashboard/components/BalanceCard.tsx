import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface BalanceCardProps {
  title: string;
  amount: string;
  backgroundColor: string;
  textColor: string;
}

export function BalanceCard({
  title,
  amount,
  backgroundColor,
  textColor,
}: BalanceCardProps) {
  return (
    <View style={[styles.card, { backgroundColor }]}>
      <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.cardAmount, { color: textColor }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    opacity: 0.9,
  },
  cardAmount: {
    fontSize: 32,
    fontWeight: "700",
  },
});
