import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { FMFonts, FMHit, FMRadius, FMState } from "@/src/constants/theme";
import { PressState, alpha, stateColor } from "./state";
import { useFMTheme } from "./theme";

/**
 * M3 button variants:
 *  - filled   — the one main action of a view
 *  - tonal    — important but secondary (secondaryContainer)
 *  - outlined — secondary actions next to a filled one
 *  - text     — low emphasis (dialog actions, inline links)
 *  - danger / dangerFilled — destructive actions
 * Legacy names are kept as aliases: primary/accent → filled,
 * secondary → outlined, ghost → text.
 */
export type ButtonVariant =
  | "filled"
  | "tonal"
  | "outlined"
  | "text"
  | "danger"
  | "dangerFilled"
  | "primary"
  | "accent"
  | "secondary"
  | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  full?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({
  children,
  variant = "filled",
  size = "md",
  icon,
  iconRight,
  full,
  loading,
  disabled,
  onPress,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const t = useFMTheme();
  const isDisabled = disabled || loading;

  const h = size === "sm" ? 32 : size === "lg" ? 48 : 40;
  const px = size === "sm" ? 12 : size === "lg" ? 24 : 20;
  const fs = size === "lg" ? 15 : 14;
  // Grow the touch area (not the visual) to the 44pt minimum.
  const slop = Math.max(0, Math.ceil((FMHit.touch - h) / 2));

  const kind =
    variant === "primary" || variant === "accent"
      ? "filled"
      : variant === "secondary"
        ? "outlined"
        : variant === "ghost"
          ? "text"
          : variant;

  const spec: Record<string, { bg: string; fg: string; border: string }> = {
    filled: { bg: t.primary, fg: t.onPrimary, border: "transparent" },
    tonal: { bg: t.secondaryContainer, fg: t.onSecondaryContainer, border: "transparent" },
    outlined: { bg: "transparent", fg: t.primary, border: t.outline },
    text: { bg: "transparent", fg: t.primary, border: "transparent" },
    danger: { bg: "transparent", fg: t.error, border: t.outline },
    dangerFilled: { bg: t.error, fg: t.onError, border: "transparent" },
  };
  const v = spec[kind];
  const fg = isDisabled ? alpha(t.onSurface, FMState.disabledContent) : v.fg;
  const hasIcon = !!icon;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={slop ? { top: slop, bottom: slop } : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={(s) => [
        styles.row,
        {
          height: h,
          paddingLeft: kind === "text" ? 12 : hasIcon ? px - 4 : px,
          paddingRight: kind === "text" ? 12 : iconRight ? px - 4 : px,
          backgroundColor: isDisabled
            ? v.bg === "transparent"
              ? "transparent"
              : alpha(t.onSurface, FMState.disabledContainer)
            : stateColor(v.bg, v.fg, s as PressState),
          borderColor: isDisabled && v.border !== "transparent" ? alpha(t.onSurface, FMState.disabledContainer) : v.border,
          borderWidth: v.border === "transparent" ? 0 : 1,
          width: full ? "100%" : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <View style={{ marginRight: 8 }}>{withColor(icon, fg)}</View> : null}
          <Text
            style={{
              fontFamily: FMFonts.sansMedium,
              fontSize: fs,
              color: fg,
              letterSpacing: 0.1,
              lineHeight: 20,
            }}
            numberOfLines={1}
          >
            {children}
          </Text>
          {iconRight ? <View style={{ marginLeft: 8 }}>{withColor(iconRight, fg)}</View> : null}
        </>
      )}
    </Pressable>
  );
}

// Re-color icon children: icons inherit the button's content colour (M3 —
// icon and label always share a colour), overriding any colour the caller set.
export function withColor(node: React.ReactNode, color: string): React.ReactNode {
  if (React.isValidElement<{ color?: string }>(node)) {
    return React.cloneElement(node, { color });
  }
  return node;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: FMRadius.full,
  },
});
