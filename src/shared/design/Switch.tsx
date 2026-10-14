import React from "react";
import { Pressable, View } from "react-native";

import { IconCheck } from "./Icon";
import { useFMTheme } from "./theme";

interface SwitchProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  /** Accessible name (the visible row label). */
  label: string;
  disabled?: boolean;
}

// M3 switch: 52×32 track; unselected = outlined track with small thumb,
// selected = primary track with a large onPrimary thumb and a check.
export function Switch({ value, onValueChange, label, disabled }: SwitchProps) {
  const t = useFMTheme();
  const thumb = value ? 24 : 16;
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      style={{ opacity: disabled ? 0.38 : 1 }}
    >
      <View
        style={{
          width: 52,
          height: 32,
          borderRadius: 16,
          backgroundColor: value ? t.primary : t.surfaceContainerHighest,
          borderWidth: 2,
          borderColor: value ? t.primary : t.outline,
          justifyContent: "center",
          paddingHorizontal: value ? 2 : 6,
          alignItems: value ? "flex-end" : "flex-start",
        }}
      >
        <View
          style={{
            width: thumb,
            height: thumb,
            borderRadius: thumb / 2,
            backgroundColor: value ? t.onPrimary : t.outline,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {value ? <IconCheck size={14} color={t.onPrimaryContainer} /> : null}
        </View>
      </View>
    </Pressable>
  );
}
