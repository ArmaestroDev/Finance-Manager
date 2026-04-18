import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../../../../constants/theme";
import { useColorScheme } from "../../../../shared/hooks/use-color-scheme";

interface BalanceCardProps {
  title: string;
  amount: string;
  backgroundColor?: string;
  textColor?: string;
}

export function BalanceCard({ title, amount, backgroundColor, textColor }: BalanceCardProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <View style={[styles.card, { backgroundColor: backgroundColor || theme.surface }]}>
      <Text style={[styles.cardTitle, { color: textColor || theme.textSecondary }]}>{title}</Text>
      <Text style={[styles.cardAmount, { color: textColor || theme.text }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 28,
    borderRadius: 20,
    alignItems: "flex-start",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  cardAmount: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1,
  },
});
