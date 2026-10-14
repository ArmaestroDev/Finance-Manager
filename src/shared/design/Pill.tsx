import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { FMFonts, FMRadius } from "@/src/constants/theme";
import { PressState, stateColor } from "./state";
import { useFMTheme } from "./theme";

interface PillProps {
  children: React.ReactNode;
  /** Leading colour dot (categories). */
  color?: string;
  active?: boolean;
  size?: "sm" | "md";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Compact tonal chip for categories, statuses and inline filters.
// Unselected: surfaceContainerHigh fill (no outline); selected: secondaryContainer.
export function Pill({ children, color, active = false, size = "sm", onPress, style }: PillProps) {
  const t = useFMTheme();
  const h = size === "sm" ? 28 : 32;
  const fs = size === "sm" ? 12 : 14;
  const bg = active ? t.secondaryContainer : t.surfaceContainerHigh;
  const fg = active ? t.onSecondaryContainer : t.onSurfaceVariant;

  const content = (s: PressState) => (
    <View
      style={[
        styles.pill,
        { height: h, paddingHorizontal: size === "sm" ? 10 : 12, backgroundColor: stateColor(bg, fg, s) },
        style,
      ]}
    >
      {color ? (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />
      ) : null}
      <Text
        style={{ fontSize: fs, fontFamily: FMFonts.sansMedium, color: fg, letterSpacing: 0.2 }}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={{ top: 8, bottom: 8 }}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        {(s) => content(s as PressState)}
      </Pressable>
    );
  }
  return content({ pressed: false });
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: FMRadius.sm,
    alignSelf: "flex-start",
  },
});
