import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { FMFonts, FMType } from "@/src/constants/theme";
import { IconInfo, useFMTheme } from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { formatDate } from "@/src/shared/utils/date";
import { useTransactionsContext } from "../context/TransactionsContext";

interface RangeCoverageHintProps {
  /** Only this account; all connected accounts when omitted. */
  accountId?: string;
  style?: ViewStyle;
}

/**
 * Subtle one-liner when the selected range starts before the data of a
 * connected account (older than the bank API serves, no statement imported).
 * Replaces the old "range not supported" error alert.
 */
export function RangeCoverageHint({ accountId, style }: RangeCoverageHintProps) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  const { coverageGaps } = useTransactionsContext();
  const gaps = accountId ? coverageGaps.filter((g) => g.accountId === accountId) : coverageGaps;
  if (gaps.length === 0) return null;
  // Several accounts: the earliest date any of them has data from.
  const from = gaps.reduce((min, g) => (g.availableFrom < min ? g.availableFrom : min), gaps[0].availableFrom);
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>
      <IconInfo size={14} color={t.inkSoft} />
      <Text
        style={{ fontFamily: FMFonts.sans, fontSize: FMType.caption, color: t.inkSoft, flexShrink: 1 }}
        numberOfLines={2}
      >
        {i18n.range_gap_hint.replace("{date}", formatDate(from))}
      </Text>
    </View>
  );
}
