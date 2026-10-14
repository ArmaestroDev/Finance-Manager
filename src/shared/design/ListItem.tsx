import React, { useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { PressState, stateColor } from "./state";
import { useFMTheme } from "./theme";

interface ListItemProps {
  /** Avatar / icon on the left. */
  leading?: React.ReactNode;
  title: React.ReactNode;
  /** Supporting text (one line). */
  subtitle?: React.ReactNode;
  /** Trailing value (amount, chevron…). Part of the pressable row. */
  trailing?: React.ReactNode;
  /**
   * Interactive trailing control (icon button, button, switch). Rendered next
   * to the row's pressable area instead of inside it, so a pressable row never
   * nests a <button> in a <button> on web.
   */
  trailingAction?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Divider under the item (inset to the text column when there's a leading). */
  divider?: boolean;
  selected?: boolean;
  /** Max lines for title and supporting text (default 1). */
  lines?: number;
  /** Background the item sits on — used to compute the state layer. */
  background?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// M3 list item: leading · headline + supporting text · trailing.
// 56dp (one line) / 72dp (two lines) min height, 16dp side padding.
export function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  trailingAction,
  onPress,
  onLongPress,
  divider,
  selected,
  lines = 1,
  background,
  accessibilityLabel,
  style,
}: ListItemProps) {
  const t = useFMTheme();
  const bg = selected ? t.secondaryContainer : (background ?? "transparent");
  const [state, setState] = useState<PressState>({ pressed: false, hovered: false });
  const pressable = !!(onPress || onLongPress);
  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.text}>
        {typeof title === "string" ? (
          <Text style={[styles.title, { color: selected ? t.onSecondaryContainer : t.ink }]} numberOfLines={lines}>
            {title}
          </Text>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === "string" ? (
            <Text style={[styles.sub, { color: t.inkSoft }]} numberOfLines={lines}>
              {subtitle}
            </Text>
          ) : (
            subtitle
          )
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </>
  );
  return (
    <View
      style={[
        styles.row,
        { minHeight: subtitle ? 64 : 56, backgroundColor: stateColor(bg, t.ink, pressable ? state : { pressed: false }) },
        style,
        // The pressable area carries the padding so its hit target reaches the edges.
        { paddingHorizontal: 0, paddingVertical: 0 },
      ]}
    >
      {pressable ? (
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          onHoverIn={() => setState((p) => ({ ...p, hovered: true }))}
          onHoverOut={() => setState((p) => ({ ...p, hovered: false }))}
          onPressIn={() => setState((p) => ({ ...p, pressed: true }))}
          onPressOut={() => setState((p) => ({ ...p, pressed: false }))}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ selected }}
          style={[styles.inner, padFrom(style), trailingAction ? { paddingRight: 4 } : null]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={[styles.inner, padFrom(style), trailingAction ? { paddingRight: 4 } : null]}>{content}</View>
      )}
      {trailingAction ? <View style={styles.action}>{trailingAction}</View> : null}
      {divider ? (
        <View
          style={[styles.divider, { backgroundColor: t.line, left: leading ? 72 : 16, pointerEvents: "none" }]}
        />
      ) : null}
    </View>
  );
}

// Callers pass row padding through `style` (e.g. paddingHorizontal: 24 in
// full-bleed dialogs); it belongs on the pressable area.
function padFrom(style: StyleProp<ViewStyle>): ViewStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  const out: ViewStyle = {};
  for (const k of [
    "padding",
    "paddingHorizontal",
    "paddingVertical",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "paddingBottom",
  ] as const) {
    if (flat[k] !== undefined) (out as Record<string, unknown>)[k] = flat[k];
  }
  return out;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  inner: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  action: { justifyContent: "center", paddingRight: 12 },
  leading: { marginRight: 16 },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: FMFonts.sans, fontSize: 16, lineHeight: 22, letterSpacing: 0.15 },
  sub: { fontFamily: FMFonts.sans, fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  trailing: { marginLeft: 16, alignItems: "flex-end" },
  divider: { position: "absolute", right: 0, bottom: 0, height: 1 },
});
