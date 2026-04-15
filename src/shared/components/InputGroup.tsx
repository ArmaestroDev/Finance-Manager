import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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

export function InputGroup({
  label,
  subLabel,
  value,
  onChange,
  prefix,
  suffix,
  textColor,
  backgroundColor,
}: InputGroupProps) {
  const handleIncrement = () => {
    const val = parseFloat(value) || 0;
    onChange((val + 1).toString());
  };
  const handleDecrement = () => {
    const val = parseFloat(value) || 0;
    onChange(Math.max(0, val - 1).toString());
  };

  return (
    <View style={[styles.inputGroup, { backgroundColor }]}>
      <View style={styles.inputLabelContainer}>
        <Text style={[styles.inputLabel, { color: textColor }]}>{label}</Text>
        <Text style={styles.inputSubLabel}>{subLabel}</Text>
      </View>
      <View style={styles.inputControls}>
        <TouchableOpacity onPress={handleDecrement} style={styles.controlBtn}>
          <Text style={[styles.controlBtnText, { color: textColor }]}>-</Text>
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          {prefix && (
            <Text style={[styles.affix, { color: textColor }]}>{prefix}</Text>
          )}
          <TextInput
            style={[
              styles.input,
              { color: textColor, backgroundColor: "transparent" },
              Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {},
            ]}
            value={value}
            onChangeText={onChange}
            keyboardType="numeric"
          />
          {suffix && (
            <Text style={[styles.affix, { color: textColor }]}>{suffix}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleIncrement} style={styles.controlBtn}>
          <Text style={[styles.controlBtnText, { color: textColor }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  inputLabelContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputSubLabel: {
    fontSize: 12,
    color: "gray",
  },
  inputControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnText: {
    fontSize: 20,
    fontWeight: "600",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    minWidth: 40,
    padding: 0,
  },
  affix: {
    fontSize: 16,
    fontWeight: "600",
  },
});
