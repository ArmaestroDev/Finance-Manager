import React from "react";
import { Platform, Pressable, StyleProp, View, ViewStyle } from "react-native";

import { FMRadius } from "@/src/constants/theme";
import { PressState, stateColor } from "./state";
import { useFMTheme } from "./theme";

export type CardVariant = "filled" | "tonal" | "outlined" | "elevated";

interface CardProps {
  children: React.ReactNode;
  /**
   * filled   — default container on the page background (no border)
   * tonal    — emphasised container (surfaceContainerHigh)
   * outlined — for cards that sit on another card
   * elevated — floating content (menus, popovers)
   */
  variant?: CardVariant;
  padding?: number;
  radius?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// M3 card. Filled tonal surfaces instead of hairline borders.
export function Card({
  children,
  variant = "filled",
  padding = 16,
  radius = FMRadius.lg,
  onPress,
  accessibilityLabel,
  style,
}: CardProps) {
  const t = useFMTheme();
  const bg =
    variant === "tonal" ? t.surfaceContainerHigh : variant === "outlined" ? "transparent" : t.surface;
  const base: ViewStyle = {
    backgroundColor: bg,
    borderRadius: radius,
    padding,
    borderWidth: variant === "outlined" ? 1 : 0,
    borderColor: t.outlineVariant,
    ...(variant === "elevated" ? elevation(2) : null),
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={(s) => [base, { backgroundColor: stateColor(bg, t.ink, s as PressState) }, style]}
    >
      {children}
    </Pressable>
  );
}

/** M3 elevation levels 1–3 as a soft shadow (web/iOS) + Android elevation. */
export function elevation(level: 1 | 2 | 3): ViewStyle {
  const y = level === 1 ? 1 : level === 2 ? 2 : 4;
  const r = level === 1 ? 3 : level === 2 ? 6 : 10;
  if (Platform.OS === "web") {
    return { boxShadow: `0 ${y}px ${r}px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.12)` } as ViewStyle;
  }
  return {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: y },
    shadowOpacity: 0.18,
    shadowRadius: r,
    elevation: level * 2,
  };
}
