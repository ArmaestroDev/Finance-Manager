import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { useFMTheme } from "./theme";

interface ChipProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

// Small dropdown / status chip used in headers.
export function Chip({ children, icon, iconRight, active = false, onPress, style }: ChipProps) {
  const t = useFMTheme();
  const fg = active ? t.bg : t.inkSoft;
  const bg = active ? t.ink : t.surface;
  const border = active ? t.ink : t.lineStrong;

  const inner = (
    <View
      style={[
        styles.chip,
        { backgroundColor: bg, borderColor: border },
        style,
      ]}
    >
      {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
      <Text
        style={{
          fontFamily: FMFonts.sansMedium,
          fontSize: 11,
          color: fg,
          letterSpacing: -0.1,
          lineHeight: 13,
        }}
      >
        {children}
      </Text>
      {iconRight ? <View style={{ marginLeft: 6 }}>{iconRight}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    height: 26,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
});
