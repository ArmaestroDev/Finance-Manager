import React from "react";
import { View, ViewStyle } from "react-native";

import { useFMTheme } from "./theme";

interface RuleProps {
  style?: ViewStyle;
  strong?: boolean;
  vertical?: boolean;
}

// Hairline divider — horizontal by default, vertical when `vertical` is set.
export function Rule({ style, strong = false, vertical = false }: RuleProps) {
  const t = useFMTheme();
  const color = strong ? t.lineStrong : t.line;
  return (
    <View
      style={[
        vertical
          ? { width: 1, alignSelf: "stretch", backgroundColor: color }
          : { height: 1, alignSelf: "stretch", backgroundColor: color },
        style,
      ]}
    />
  );
}
