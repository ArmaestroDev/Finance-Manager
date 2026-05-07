import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { useFMTheme } from "./theme";

interface PillProps {
  children: React.ReactNode;
  color?: string;
  active?: boolean;
  size?: "sm" | "md";
  onPress?: () => void;
  style?: ViewStyle;
}

// Pill — for category chips, statuses, filters.
export function Pill({ children, color, active = false, size = "sm", onPress, style }: PillProps) {
  const t = useFMTheme();
  const px = size === "sm" ? 8 : 12;
  const py = size === "sm" ? 3 : 5;
  const fs = size === "sm" ? 11 : 12;

  const content = (
    <View
      style={[
        styles.pill,
        {
          paddingHorizontal: px,
          paddingVertical: py,
          backgroundColor: active ? t.ink : t.surface,
          borderColor: active ? t.ink : t.lineStrong,
        },
        style,
      ]}
    >
      {color ? (
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: color,
            marginRight: 6,
          }}
        />
      ) : null}
      <Text
        style={{
          fontSize: fs,
          fontFamily: FMFonts.sansMedium,
          color: active ? t.bg : t.inkSoft,
          lineHeight: fs * 1.1,
        }}
      >
        {children}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
});
