import React, { useState } from "react";
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Colors } from "../../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";

interface InputGroupProps {
  label: string;
  subLabel: string;
  value: string;
  onChange: (val: string) => void;
  prefix?: string;
  suffix?: string;
  textColor: string;
  backgroundColor: string;
}

export function InputGroup({ label, subLabel, value, onChange, prefix, suffix, textColor, backgroundColor }: InputGroupProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [isFocused, setIsFocused] = useState(false);

  const handleIncrement = () => { const val = parseFloat(value) || 0; onChange((val + 1).toString()); };
  const handleDecrement = () => { const val = parseFloat(value) || 0; onChange(Math.max(0, val - 1).toString()); };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.inputLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.inputSubLabel, { color: theme.textSecondary }]}>{subLabel}</Text>
      </View>
      <View
        style={[
          styles.inputControls,
          { backgroundColor: theme.background },
          isFocused && { borderColor: theme.primary, borderWidth: 2 },
        ]}
      >
        <TouchableOpacity onPress={handleDecrement} style={styles.controlBtn}>
          <Text style={[styles.controlBtnText, { color: theme.textSecondary }]}>−</Text>
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          {prefix && <Text style={[styles.affix, { color: textColor }]}>{prefix}</Text>}
          <TextInput
            style={[
              styles.input,
              { color: textColor, backgroundColor: "transparent" },
              Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {},
            ]}
            value={value}
            onChangeText={onChange}
            keyboardType="numeric"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {suffix && <Text style={[styles.affix, { color: textColor }]}>{suffix}</Text>}
        </View>
        <TouchableOpacity onPress={handleIncrement} style={styles.controlBtn}>
          <Text style={[styles.controlBtnText, { color: theme.textSecondary }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginBottom: 16 },
  labelRow: { marginBottom: 6 },
  inputLabel: { fontSize: 13, fontWeight: "600" },
  inputSubLabel: { fontSize: 11, marginTop: 2 },
  inputControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnText: { fontSize: 18, fontWeight: "500", lineHeight: 22 },
  inputWrapper: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  input: { fontSize: 18, fontWeight: "600", textAlign: "center", minWidth: 40, padding: 0 },
  affix: { fontSize: 16, fontWeight: "600", opacity: 0.8 },
});
