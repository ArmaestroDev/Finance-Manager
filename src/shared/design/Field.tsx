import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { useFMTheme } from "./theme";

interface FieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  /** Render the value monospaced (with tabular-nums) — useful for amounts/IBAN. */
  mono?: boolean;
  containerStyle?: ViewStyle;
}

// Labelled text field. Designed for compact stack layouts in modals.
export function Field({
  label,
  hint,
  prefix,
  suffix,
  mono,
  containerStyle,
  ...rest
}: FieldProps) {
  const t = useFMTheme();
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={[styles.label, { color: t.inkSoft }]}>{label}</Text>
      <View style={[styles.row, { borderColor: t.lineStrong, backgroundColor: t.surface }]}>
        {prefix ? (
          <Text style={{ fontFamily: FMFonts.sans, fontSize: 13, color: t.inkMuted, marginRight: 6 }}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          {...rest}
          placeholderTextColor={t.inkMuted}
          style={{
            flex: 1,
            fontFamily: mono ? FMFonts.sansMedium : FMFonts.sansMedium,
            fontSize: 13,
            color: t.ink,
            paddingVertical: 0,
            ...(mono ? { fontVariant: ["tabular-nums"] as any } : {}),
          }}
        />
        {suffix ? (
          <Text style={{ fontFamily: FMFonts.sans, fontSize: 13, color: t.inkMuted, marginLeft: 6 }}>
            {suffix}
          </Text>
        ) : null}
      </View>
      {hint ? (
        <Text style={[styles.hint, { color: t.inkMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  label: {
    fontFamily: FMFonts.sansMedium,
    fontSize: 11,
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  hint: {
    fontFamily: FMFonts.sans,
    fontSize: 11,
    marginTop: 4,
  },
});
