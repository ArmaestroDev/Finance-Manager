import React from "react";
import { StyleSheet, Text, TextStyle, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Money } from "./Money";
import { useFMTheme } from "./theme";

interface BalanceProps {
  value: number;
  masked?: boolean;
  size?: number;
  total?: boolean;
  align?: "left" | "right" | "center";
  style?: TextStyle;
}

// Privacy-aware balance — when masked, draws a textured bar instead of
// digits so it's instantly recognizable as "hidden by you", not "we don't know".
export function Balance({ value, masked = false, size = 14, total = false, align, style }: BalanceProps) {
  const t = useFMTheme();
  if (!masked) {
    return <Money value={value} masked={false} size={size} total={total} align={align} style={style} />;
  }

  const family = total ? FMFonts.monoSemibold : FMFonts.monoMedium;
  return (
    <View
      style={[
        styles.row,
        align === "right" && styles.rowRight,
        align === "center" && styles.rowCenter,
      ]}
    >
      <View style={styles.barWrap}>
        <View
          style={{
            width: size * 4.2,
            height: Math.max(size * 0.65, 8),
            borderRadius: 2,
            overflow: "hidden",
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.lineStrong,
          }}
        >
          <MaskedFill color={t.lineStrong} />
        </View>
      </View>
      <Text
        style={[
          {
            fontFamily: family,
            fontSize: size * 0.95,
            color: t.inkMuted,
            marginLeft: 4,
            letterSpacing: -0.1,
          },
          style,
        ]}
      >
        €
      </Text>
    </View>
  );
}

// Approximates the diagonal-stripe pattern of the design source.
function MaskedFill({ color }: { color: string }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: -4 + i * 6,
            top: -8,
            bottom: -8,
            width: 2,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  rowRight: { justifyContent: "flex-end" },
  rowCenter: { justifyContent: "center" },
  barWrap: { flexDirection: "row", alignItems: "center" },
});
