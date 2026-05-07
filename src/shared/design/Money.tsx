import React from "react";
import { StyleSheet, Text, TextStyle, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { formatEUR } from "./format";
import { useFMTheme } from "./theme";

interface MoneyProps {
  value: number;
  size?: number;
  total?: boolean;
  masked?: boolean;
  weight?: 400 | 500 | 600 | 700;
  dimZero?: boolean;
  align?: "left" | "right" | "center";
  style?: TextStyle;
}

// FMMoney — the canonical money renderer.
//   - sign + weight differential always
//   - subtle color (pos/neg) — passes 4.5:1 in both modes
//   - optional ▲▼ arrow for totals
//   - mono digits for tabular alignment
export function Money({
  value,
  size = 14,
  total = false,
  masked = false,
  weight,
  dimZero = true,
  align,
  style,
}: MoneyProps) {
  const t = useFMTheme();
  const tone = value > 0 ? t.pos : value < 0 ? t.neg : t.inkMuted;
  const w = weight ?? (total ? 600 : 500);
  const family = w >= 600
    ? FMFonts.monoSemibold
    : w >= 500
      ? FMFonts.monoMedium
      : FMFonts.mono;
  const display = formatEUR(value, { showSign: total, masked });
  const showArrow = total && !masked && value !== 0;
  const color = dimZero && value === 0 ? t.inkMuted : tone;

  const baseStyle: TextStyle = {
    fontFamily: family,
    fontSize: size,
    color,
    letterSpacing: -0.1,
    fontVariant: ["tabular-nums"],
    textAlign: align,
  };

  if (!showArrow) {
    return <Text style={[baseStyle, style]}>{display}</Text>;
  }

  return (
    <View style={[styles.row, align === "right" && styles.rowRight, align === "center" && styles.rowCenter]}>
      <Text
        style={{
          fontFamily: family,
          fontSize: size * 0.7,
          color,
          marginRight: 4,
          opacity: 0.85,
        }}
      >
        {value > 0 ? "▲" : "▼"}
      </Text>
      <Text style={[baseStyle, style]}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  rowRight: { justifyContent: "flex-end" },
  rowCenter: { justifyContent: "center" },
});
