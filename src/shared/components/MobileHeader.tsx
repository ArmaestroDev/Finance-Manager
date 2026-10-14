import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FMFonts } from "@/src/constants/theme";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { IconBack, IconButton, useFMTheme } from "@/src/shared/design";

interface MobileHeaderProps {
  title: string;
  /** Optional one-line supporting text. Use sparingly. */
  sub?: string;
  /** Trailing actions — icon buttons / a chip. */
  right?: React.ReactNode;
  /** Shows a leading back arrow. */
  onBack?: () => void;
  /** Custom leading node (legacy); prefer `onBack`. */
  back?: React.ReactNode;
  style?: ViewStyle;
}

// M3 small top app bar: [back] title ........ [actions]. 64dp + safe area.
export function MobileHeader({ title, sub, right, onBack, back, style }: MobileHeaderProps) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top, backgroundColor: t.bg }, style]}>
      <View style={styles.row}>
        {onBack ? (
          <IconButton icon={<IconBack size={20} />} label={i18n.back} onPress={onBack} style={{ marginLeft: -8, marginRight: 4 }} />
        ) : back ? (
          <View style={styles.back}>{back}</View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ fontFamily: FMFonts.sans, fontSize: 22, lineHeight: 28, color: t.ink }}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {sub ? (
            <Text
              style={{ fontFamily: FMFonts.sans, fontSize: 13, lineHeight: 18, color: t.inkSoft }}
              numberOfLines={1}
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
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: -8,
  },
  back: {
    marginRight: 8,
  },
});
