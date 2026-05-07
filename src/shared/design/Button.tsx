import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { useFMTheme } from "./theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "danger";
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
  style?: ViewStyle;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  full,
  loading,
  disabled,
  onPress,
  style,
}: ButtonProps) {
  const t = useFMTheme();
  const isDisabled = disabled || loading;

  const h = size === "sm" ? 28 : size === "lg" ? 44 : 36;
  const px = size === "sm" ? 10 : size === "lg" ? 18 : 14;
  const fs = size === "sm" ? 12 : 13;

  const variants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: t.ink, fg: t.bg, border: t.ink },
    secondary: { bg: t.surface, fg: t.ink, border: t.lineStrong },
    ghost: { bg: "transparent", fg: t.ink, border: "transparent" },
    accent: { bg: t.accent, fg: "#ffffff", border: t.accent },
    danger: { bg: t.surface, fg: t.neg, border: t.lineStrong },
  };
  const v = variants[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          height: h,
          paddingHorizontal: px,
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: 1,
          borderRadius: 6,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          width: full ? "100%" : undefined,
        },
        styles.row,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : (
        <>
          {icon ? <View style={{ marginRight: 6, opacity: 0.95 }}>{withColor(icon, v.fg)}</View> : null}
          <Text
            style={{
              fontFamily: FMFonts.sansMedium,
              fontSize: fs,
              color: v.fg,
              letterSpacing: -0.1,
              lineHeight: fs * 1.15,
            }}
          >
            {children}
          </Text>
          {iconRight ? <View style={{ marginLeft: 6, opacity: 0.95 }}>{withColor(iconRight, v.fg)}</View> : null}
        </>
      )}
    </Pressable>
  );
}

// Re-color icon children that accept a `color` prop.
function withColor(node: React.ReactNode, color: string): React.ReactNode {
  if (React.isValidElement(node) && node.props && (node.props as any).color === undefined) {
    return React.cloneElement(node as React.ReactElement<any>, { color });
  }
  return node;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
