import React from "react";
import { StyleProp, Text, TextStyle } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { useFMTheme } from "./theme";

interface LabelProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
}

// Tiny uppercase header used everywhere above lists/sections.
export function Label({ children, style, color }: LabelProps) {
  const t = useFMTheme();
  return (
    <Text
      style={[
        {
          fontSize: 10,
          fontFamily: FMFonts.sansSemibold,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: color ?? t.inkMuted,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
