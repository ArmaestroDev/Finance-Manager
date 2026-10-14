import React, { useRef } from "react";
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, TextInput, TextStyle, View } from "react-native";

import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import { useFMTheme } from "@/src/shared/design";
import { parseLocaleNumber } from "@/src/shared/utils/number";

// The value box draws its own container; drop the browser focus ring.
const NO_WEB_OUTLINE = { outlineStyle: "none" } as unknown as TextStyle;

interface InvestSliderProps {
  label: string;
  value: string;
  onChange: (s: string) => void;
  suffix: string;
  max: number;
  step: number;
  decimals?: number;
}

// M3 slider (4dp track, 20dp round thumb, drag or tap) plus an editable value
// box for exact input. Shared by the desktop and mobile invest screens.
export function InvestSlider({ label, value, onChange, suffix, max, step, decimals = 0 }: InvestSliderProps) {
  const t = useFMTheme();
  const trackWidth = useRef(0);
  // PanResponder is created once; keep the latest props reachable from it.
  const latest = useRef({ max, step, decimals, onChange });
  latest.current = { max, step, decimals, onChange };

  const numeric = parseLocaleNumber(value) || 0;
  const pct = Math.min(1, Math.max(0, numeric / max));

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => commitFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => commitFromX(e.nativeEvent.locationX),
    }),
  ).current;

  function commitFromX(x: number) {
    const w = trackWidth.current;
    if (w <= 0) return;
    const { max: m, step: s, decimals: d, onChange: set } = latest.current;
    const ratio = Math.min(1, Math.max(0, (x - THUMB / 2) / (w - THUMB)));
    const snapped = Math.round((ratio * m) / s) * s;
    // Decimal comma, like every other number in the app (parseLocaleNumber reads both).
    set(d > 0 ? snapped.toFixed(d).replace(".", ",") : String(Math.round(snapped)));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: t.ink }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.valueBox, { backgroundColor: t.surfaceContainerHigh }]}>
          <TextInput
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            selectTextOnFocus
            accessibilityLabel={label}
            selectionColor={t.primary}
            style={[NO_WEB_OUTLINE, styles.input, { color: t.ink }]}
          />
          <Text style={[styles.suffix, { color: t.inkSoft }]}>{suffix}</Text>
        </View>
      </View>

      <View
        {...pan.panHandlers}
        onLayout={(e: LayoutChangeEvent) => {
          trackWidth.current = e.nativeEvent.layout.width;
        }}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max, now: numeric }}
        style={styles.hit}
      >
        <View style={[styles.track, { backgroundColor: t.surfaceContainerHighest, pointerEvents: "none" }]}>
          <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: t.primary }} />
        </View>
        <View
          style={[
            styles.thumb,
            { pointerEvents: "none", backgroundColor: t.primary, left: `${pct * 100}%`, marginLeft: -pct * THUMB },
          ]}
        />
      </View>
    </View>
  );
}

const THUMB = 20;

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { fontFamily: FMFonts.sans, fontSize: FMType.body, flexShrink: 1 },
  valueBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    borderRadius: FMRadius.sm,
    paddingHorizontal: 12,
  },
  input: {
    fontFamily: FMFonts.sansMedium,
    fontSize: FMType.subhead,
    textAlign: "right",
    width: 80,
    padding: 0,
    fontVariant: ["tabular-nums"],
  },
  suffix: { fontFamily: FMFonts.sans, fontSize: FMType.small, marginLeft: 4 },
  hit: { height: 44, justifyContent: "center" },
  track: { height: 4, borderRadius: 2, overflow: "hidden", marginHorizontal: THUMB / 2 },
  thumb: { position: "absolute", width: THUMB, height: THUMB, borderRadius: THUMB / 2 },
});
