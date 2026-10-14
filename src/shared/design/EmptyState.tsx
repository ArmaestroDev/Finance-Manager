import React from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { useFMTheme } from "./theme";

interface EmptyStateProps {
  icon?: React.ReactElement<{ color?: string; size?: number }>;
  title: string;
  /** One short line, only if it helps the user act. */
  body?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Consistent empty state: tonal icon disc, one-line title, optional hint + action.
export function EmptyState({ icon, title, body, action, style }: EmptyStateProps) {
  const t = useFMTheme();
  return (
    <View style={[{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 }, style]}>
      {icon ? (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: t.secondaryContainer,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          {React.cloneElement(icon, { color: t.onSecondaryContainer, size: 22 })}
        </View>
      ) : null}
      <Text
        style={{ fontFamily: FMFonts.sansMedium, fontSize: 16, lineHeight: 24, color: t.ink, textAlign: "center" }}
      >
        {title}
      </Text>
      {body ? (
        <Text
          style={{
            fontFamily: FMFonts.sans,
            fontSize: 14,
            lineHeight: 20,
            color: t.inkSoft,
            textAlign: "center",
            marginTop: 4,
            maxWidth: 360,
          }}
        >
          {body}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}
