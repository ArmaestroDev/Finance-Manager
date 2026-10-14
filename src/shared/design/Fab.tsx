import React from "react";
import { Pressable, StyleProp, Text, ViewStyle } from "react-native";

import { FMFonts, FMRadius } from "@/src/constants/theme";
import { elevation } from "./Card";
import { PressState, stateColor } from "./state";
import { useFMTheme } from "./theme";

interface FabProps {
  icon: React.ReactElement<{ color?: string; size?: number }>;
  /** Accessible name; also the visible text when `extended`. */
  label: string;
  extended?: boolean;
  onPress?: () => void;
  /** "primary" (primaryContainer) or "surface" (surfaceContainerHigh). */
  tone?: "primary" | "surface";
  style?: StyleProp<ViewStyle>;
}

// M3 floating action button: 56dp, 16dp corners, primaryContainer.
export function Fab({ icon, label, extended, onPress, tone = "primary", style }: FabProps) {
  const t = useFMTheme();
  const bg = tone === "primary" ? t.primaryContainer : t.surfaceContainerHigh;
  const fg = tone === "primary" ? t.onPrimaryContainer : t.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={(s) => [
        {
          height: 56,
          minWidth: 56,
          paddingHorizontal: extended ? 16 : 0,
          borderRadius: FMRadius.lg,
          backgroundColor: stateColor(bg, fg, s as PressState),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          ...elevation(3),
        },
        style,
      ]}
    >
      {React.cloneElement(icon, { color: fg, size: icon.props.size ?? 20 })}
      {extended ? (
        <Text style={{ marginLeft: 12, fontFamily: FMFonts.sansMedium, fontSize: 15, color: fg, letterSpacing: 0.1 }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
