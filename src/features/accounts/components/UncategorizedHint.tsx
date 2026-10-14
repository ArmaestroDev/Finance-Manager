import React from "react";
import { Pressable, Text } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { IconWarn, useFMTheme } from "@/src/shared/design";

// One line under the account stats: uncategorized rows aren't in the totals
// (so an all-uncategorized account reads 0 / 0 / 0). Tapping it categorizes.
export function UncategorizedHint({ count, onPress }: { count: number; onPress: () => void }) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  if (count <= 0) return null;
  const label = i18n.acct_uncat_hint.replace("{count}", String(count));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, alignSelf: "flex-start" }}
    >
      <IconWarn size={16} color={t.warn} />
      <Text style={{ fontFamily: FMFonts.sans, fontSize: FMType.small, color: t.warn }}>{label}</Text>
    </Pressable>
  );
}
