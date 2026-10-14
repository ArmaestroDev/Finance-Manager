import React from "react";
import { StyleProp, Text, TextStyle } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { useFMTheme } from "./theme";

interface LabelProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
}

// Small sentence-case label (M3 labelMedium) for column headers, stat labels
// and form groups. No uppercase eyebrows — M3 keeps labels in sentence case.
export function Label({ children, style, color }: LabelProps) {
  const t = useFMTheme();
  return (
    <Text
      style={[
        {
          fontSize: 12,
          lineHeight: 16,
          fontFamily: FMFonts.sansMedium,
          letterSpacing: 0.3,
          color: color ?? t.inkSoft,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// Section heading inside a page or card (M3 titleMedium).
export function SectionTitle({ children, style, color }: LabelProps) {
  const t = useFMTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[
        {
          fontSize: 16,
          lineHeight: 24,
          fontFamily: FMFonts.sansMedium,
          letterSpacing: 0.15,
          color: color ?? t.ink,
        },
        style,
      ]}
      numberOfLines={1}
    >
      {children}
    </Text>
  );
}
