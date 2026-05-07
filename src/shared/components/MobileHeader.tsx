import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FMFonts } from "@/src/constants/theme";
import { useFMTheme } from "@/src/shared/design";

interface MobileHeaderProps {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  back?: React.ReactNode;
  style?: ViewStyle;
}

// Mobile screen header: serif title, optional sub, optional right slot.
// Honors top safe-area inset.
export function MobileHeader({ title, sub, right, back, style }: MobileHeaderProps) {
  const t = useFMTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 14, backgroundColor: t.bg }, style]}>
      {back ? <View style={styles.backRow}>{back}</View> : null}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: FMFonts.display,
              fontSize: 26,
              color: t.ink,
              lineHeight: 28,
              letterSpacing: -0.3,
            }}
          >
            {title}
          </Text>
          {sub ? (
            <Text
              style={{
                fontFamily: FMFonts.sans,
                fontSize: 11,
                color: t.inkSoft,
                marginTop: 4,
              }}
            >
              {sub}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
});
