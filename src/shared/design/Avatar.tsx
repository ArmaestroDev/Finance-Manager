import React from "react";
import { Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { alpha } from "./state";
import { useFMTheme } from "./theme";

interface AvatarProps {
  /** Text to take the initial from. */
  label?: string;
  /** Icon instead of an initial (re-coloured to the content colour). */
  icon?: React.ReactElement<{ color?: string }>;
  /** Tint (e.g. a category colour). Defaults to the primary container. */
  color?: string;
  size?: number;
}

// Leading element of list items: round tonal container with an initial or icon.
export function Avatar({ label, icon, color, size = 40 }: AvatarProps) {
  const t = useFMTheme();
  const bg = color ? alpha(color, 0.18) : t.primaryContainer;
  const fg = color ?? t.onPrimaryContainer;
  const initial = (label ?? "").trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon ? (
        React.cloneElement(icon, { color: icon.props.color ?? (color ? t.ink : fg) })
      ) : (
        <Text
          style={{
            fontFamily: FMFonts.sansMedium,
            fontSize: Math.round(size * 0.4),
            color: color ? t.ink : fg,
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}
