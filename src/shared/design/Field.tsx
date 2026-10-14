import React, { useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { useFMTheme } from "./theme";

// Kill the browser's default focus ring; the field draws its own M3 focus
// indicator (2dp primary outline).
const NO_WEB_OUTLINE = { outlineStyle: "none" } as unknown as TextStyle;

interface FieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  /** Supporting text under the field. */
  hint?: string;
  /** Error message: replaces the hint and turns the outline red. */
  error?: string;
  prefix?: string;
  suffix?: string;
  /** Tabular digits — amounts, IBANs. */
  mono?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

// M3 outlined text field with the label above the container (web-friendly
// variant of the floating label). 4dp corners, 1dp outline, 2dp primary on focus.
export function Field({
  label,
  hint,
  error,
  prefix,
  suffix,
  mono,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: FieldProps) {
  const t = useFMTheme();
  const isMobile = useIsMobileLayout();
  const [focused, setFocused] = useState(false);
  // >=16 on touch layouts so iOS Safari doesn't zoom the page on focus.
  const inputSize = isMobile ? FMType.subhead : FMType.bodyLg;
  const borderColor = error ? t.error : focused ? t.primary : t.outline;
  const bw = focused || error ? 2 : 1;
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: error ? t.error : focused ? t.primary : t.inkSoft }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.row,
          // Keep the content from shifting when the outline thickens.
          { borderColor, borderWidth: bw, paddingHorizontal: 16 - bw },
        ]}
      >
        {prefix ? (
          <Text style={{ fontFamily: FMFonts.sans, fontSize: inputSize, color: t.inkSoft, marginRight: 6 }}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          {...rest}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={t.inkMuted}
          cursorColor={t.primary}
          selectionColor={t.primary}
          style={[
            NO_WEB_OUTLINE,
            {
              flex: 1,
              // Without this, the input keeps its intrinsic (~20ch) width and
              // refuses to shrink, spilling past the field border on web.
              minWidth: 0,
              fontFamily: FMFonts.sans,
              fontSize: inputSize,
              color: t.ink,
              paddingVertical: 0,
              fontVariant: mono ? ["tabular-nums"] : undefined,
            },
          ]}
        />
        {suffix ? (
          <Text style={{ fontFamily: FMFonts.sans, fontSize: inputSize, color: t.inkSoft, marginLeft: 6 }}>
            {suffix}
          </Text>
        ) : null}
      </View>
      {error || hint ? (
        <Text style={[styles.hint, { color: error ? t.error : t.inkSoft }]}>{error ?? hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  label: {
    fontFamily: FMFonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingVertical: 10,
    borderRadius: FMRadius.xs,
    overflow: "hidden",
  },
  hint: {
    fontFamily: FMFonts.sans,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    marginTop: 4,
    paddingHorizontal: 16,
  },
});
