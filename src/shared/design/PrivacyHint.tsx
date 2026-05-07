import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { IconEyeOff } from "./Icon";
import { useFMTheme } from "./theme";

interface PrivacyHintProps {
  text?: string;
}

// Banner that appears when balance masking is on.
export function PrivacyHint({ text = "Balances hidden — change in Settings · Privacy" }: PrivacyHintProps) {
  const t = useFMTheme();
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: t.surfaceAlt,
          borderColor: t.line,
        },
      ]}
    >
      <IconEyeOff size={11} color={t.inkSoft} />
      <Text
        style={{
          fontFamily: FMFonts.sans,
          fontSize: 11,
          color: t.inkSoft,
          marginLeft: 8,
          flex: 1,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 6,
  },
});
