import React from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";

import { FMHit, FMRadius } from "@/src/constants/theme";
import { PressState, stateColor } from "./state";
import { useFMTheme } from "./theme";

export type IconButtonVariant = "standard" | "filled" | "tonal" | "outlined" | "outline" | "ghost";

interface IconButtonProps {
  /** Icon element; it is re-colored to the button's foreground if it has no color. */
  icon: React.ReactElement<{ color?: string; filled?: boolean }>;
  /** Required: icon-only controls must have an accessible name. */
  label: string;
  onPress?: () => void;
  /**
   * M3 icon button: standard (no container), filled, tonal, outlined.
   * Legacy: "outline" → outlined, "ghost" → standard.
   */
  variant?: IconButtonVariant;
  /** Toggle buttons: selected state (fills the icon, tonal container for standard). */
  selected?: boolean;
  /** Visual size; the touch target is always grown to >= 44 via hitSlop. */
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Round icon-only button (M3). Visual 40 by default; touch target >= 44.
export function IconButton({
  icon,
  label,
  onPress,
  variant = "standard",
  selected,
  size = 40,
  disabled,
  style,
}: IconButtonProps) {
  const t = useFMTheme();
  const slop = Math.max(0, Math.ceil((FMHit.touch - size) / 2));
  const kind = variant === "outline" ? "outlined" : variant === "ghost" ? "standard" : variant;

  const spec = {
    standard: { bg: selected ? t.secondaryContainer : "transparent", fg: selected ? t.onSecondaryContainer : t.onSurfaceVariant, border: "transparent" },
    filled: { bg: t.primary, fg: t.onPrimary, border: "transparent" },
    tonal: { bg: t.secondaryContainer, fg: t.onSecondaryContainer, border: "transparent" },
    outlined: { bg: "transparent", fg: t.onSurfaceVariant, border: t.outlineVariant },
  }[kind];

  const node =
    icon.props.color === undefined
      ? React.cloneElement(icon, { color: spec.fg, filled: selected || icon.props.filled })
      : icon;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={slop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected }}
      style={(s) => [
        styles.base,
        {
          width: size,
          height: size,
          borderColor: spec.border,
          borderWidth: spec.border === "transparent" ? 0 : 1,
          backgroundColor: stateColor(spec.bg, spec.fg, s as PressState),
          opacity: disabled ? 0.38 : 1,
        },
        style,
      ]}
    >
      {node}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: FMRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
