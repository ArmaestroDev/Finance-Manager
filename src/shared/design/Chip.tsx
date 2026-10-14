import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { FMFonts, FMRadius } from "@/src/constants/theme";
import { withColor } from "./Button";
import { IconCheck } from "./Icon";
import { PressState, stateColor } from "./state";
import { useFMTheme } from "./theme";

interface ChipProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  /** Selected (filter chip) / active state. */
  active?: boolean;
  /** Filter chip: show a leading check mark when active. */
  filter?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// M3 chip (assist / filter). 32dp high, 8dp corners. Unselected: outlined;
// selected: secondaryContainer fill, no outline.
export function Chip({ children, icon, iconRight, active = false, filter, onPress, accessibilityLabel, style }: ChipProps) {
  const t = useFMTheme();
  const fg = active ? t.onSecondaryContainer : t.onSurfaceVariant;
  const bg = active ? t.secondaryContainer : "transparent";
  const lead = active && filter ? <IconCheck size={15} /> : icon;

  const body = (s: PressState) => (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: stateColor(bg, fg, s),
          borderColor: active ? "transparent" : t.outlineVariant,
          paddingLeft: lead ? 8 : 12,
          paddingRight: iconRight ? 8 : 12,
        },
        style,
      ]}
    >
      {lead ? <View style={{ marginRight: 8 }}>{withColor(lead, fg)}</View> : null}
      <Text
        style={{
          fontFamily: FMFonts.sansMedium,
          fontSize: 14,
          color: active ? t.onSecondaryContainer : t.ink,
          letterSpacing: 0.1,
          lineHeight: 20,
        }}
        numberOfLines={1}
      >
        {children}
      </Text>
      {iconRight ? <View style={{ marginLeft: 8 }}>{withColor(iconRight, fg)}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={{ top: 6, bottom: 6 }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: active }}
      >
        {(s) => body(s as PressState)}
      </Pressable>
    );
  }
  return body({ pressed: false });
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    borderWidth: 1,
    borderRadius: FMRadius.sm,
    alignSelf: "flex-start",
  },
});
