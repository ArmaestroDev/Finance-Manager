import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { FMFonts, FMRadius } from "@/src/constants/theme";
import { IconCheck } from "./Icon";
import { PressState, stateColor } from "./state";
import { useFMTheme } from "./theme";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactElement<{ color?: string }>;
}

interface SegmentedButtonsProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Stretch to the parent's width (segments share it equally). */
  full?: boolean;
  /** Hide the check mark on the selected segment (e.g. when icons are used). */
  noCheck?: boolean;
  style?: StyleProp<ViewStyle>;
}

// M3 segmented buttons: single-select, 40dp, fully rounded, outlined; the
// selected segment gets a secondaryContainer fill and a check mark.
export function SegmentedButtons<T extends string>({
  options,
  value,
  onChange,
  full,
  noCheck,
  style,
}: SegmentedButtonsProps<T>) {
  const t = useFMTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.wrap, { borderColor: t.outline, alignSelf: full ? "stretch" : "flex-start" }, style]}
    >
      {options.map((o, i) => {
        const sel = o.value === value;
        const fg = sel ? t.onSecondaryContainer : t.ink;
        const bg = sel ? t.secondaryContainer : "transparent";
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: sel, selected: sel }}
            style={(s) => [
              styles.seg,
              {
                // Share the width but let longer labels take what they need.
                flexGrow: full ? 1 : 0,
                flexShrink: 1,
                flexBasis: "auto",
                backgroundColor: stateColor(bg, fg, s as PressState),
                borderLeftWidth: i === 0 ? 0 : 1,
                borderLeftColor: t.outline,
              },
            ]}
          >
            {sel && !noCheck ? (
              <View style={{ marginRight: 6 }}>
                <IconCheck size={15} color={fg} />
              </View>
            ) : o.icon ? (
              <View style={{ marginRight: 6 }}>{React.cloneElement(o.icon, { color: fg })}</View>
            ) : null}
            <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: FMRadius.full,
    overflow: "hidden",
    height: 40,
  },
  seg: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    minWidth: 48,
  },
  label: { fontFamily: FMFonts.sansMedium, fontSize: 14, letterSpacing: 0.1 },
});
