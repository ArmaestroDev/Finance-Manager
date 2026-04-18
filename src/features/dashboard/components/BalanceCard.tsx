import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../../../constants/theme";
import { useColorScheme } from "../../../shared/hooks/use-color-scheme";

interface BalanceCardProps {
  title: string;
  amount: string;
  backgroundColor?: string;
  textColor?: string;
}

export function BalanceCard({
  title,
  amount,
  backgroundColor,
  textColor,
}: BalanceCardProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>{title}</Text>
      <Text style={[styles.cardAmount, { color: theme.text }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 24,
    alignItems: "flex-start",
    justifyContent: "center",
    shadowColor: "#8E1E5E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardAmount: {
    fontSize: 36,
    fontWeight: "800",
  },
});
