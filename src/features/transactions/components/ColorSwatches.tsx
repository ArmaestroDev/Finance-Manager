import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { IconCheck, useFMTheme } from "@/src/shared/design";

interface ColorSwatchesProps {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
  /** Accessible name prefix, e.g. "Colour". */
  label: string;
}

// Round colour swatches; the selected one gets a 2dp ring and a check.
export function ColorSwatches({ colors, value, onChange, label }: ColorSwatchesProps) {
  const t = useFMTheme();
  // The darker / lighter of the two theme inks, independent of light/dark mode.
  const darkInk = isLight(t.ink) ? t.bg : t.ink;
  const lightInk = isLight(t.ink) ? t.ink : t.bg;
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {colors.map((c, i) => {
        const active = value === c;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            accessibilityRole="radio"
            accessibilityLabel={`${label} ${i + 1}`}
            accessibilityState={{ checked: active }}
            hitSlop={4}
            style={[styles.ring, { borderColor: active ? t.ink : "transparent" }]}
          >
            <View style={[styles.swatch, { backgroundColor: c }]}>
              {active ? <IconCheck size={16} color={isLight(c) ? darkInk : lightInk} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// Pick a readable check colour for the swatch (perceived luminance).
function isLight(hex: string): boolean {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ring: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
