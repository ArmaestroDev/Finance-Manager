import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { IconEyeOff } from "./Icon";
import { useFMTheme } from "./theme";

interface PrivacyHintProps {
  text?: string;
}

// Banner that appears when balance masking is on.
export function PrivacyHint({ text }: PrivacyHintProps) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: t.secondaryContainer,
        },
      ]}
    >
      <IconEyeOff size={14} color={t.onSecondaryContainer} />
      <Text
        style={{
          fontFamily: FMFonts.sans,
          fontSize: FMType.small,
          color: t.onSecondaryContainer,
          marginLeft: 8,
          flex: 1,
        }}
      >
        {text ?? i18n.privacy_hint_banner}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
