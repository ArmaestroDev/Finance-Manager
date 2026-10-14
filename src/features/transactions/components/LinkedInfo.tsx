import React from "react";
import { Text, View } from "react-native";
import { FMFonts, FMType } from "@/src/constants/theme";
import { IconLink, formatEUR, useFMTheme } from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { useTransactionLinks } from "../context/TransactionLinksContext";

interface LinkedInfoProps {
  /** Stable id of the row's transaction. */
  txId: string;
  masked?: boolean;
  align?: "flex-start" | "flex-end";
}

/**
 * Compact link marker for transaction rows:
 *  - reimbursed expense → original amount struck through + "+50 € back";
 *  - linked child (reimbursement / "pay from account") → "Linked".
 * Renders nothing for unlinked transactions.
 */
export function LinkedInfo({ txId, masked, align = "flex-end" }: LinkedInfoProps) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  const { linkIndex } = useTransactionLinks();

  const summary = linkIndex.summaries.get(txId);
  if (summary && summary.reimbursed > 0) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: align, marginTop: 2 }}>
        <Text
          style={{
            fontFamily: FMFonts.sans,
            fontSize: FMType.caption,
            color: t.inkSoft,
            textDecorationLine: "line-through",
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatEUR(-summary.original, { masked })}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: t.posSoft, paddingHorizontal: 6, height: 20, borderRadius: 6 }}>
          <IconLink size={11} color={t.pos} />
          <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.caption, color: t.pos, fontVariant: ["tabular-nums"] }}>
            {i18n.link_badge_back.replace("{amount}", formatEUR(summary.reimbursed, { showSign: true, masked }))}
          </Text>
        </View>
      </View>
    );
  }
  if (linkIndex.childToParent.has(txId)) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: align, marginTop: 2 }}>
        <IconLink size={12} color={t.inkSoft} />
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.caption, color: t.inkSoft }}>
          {i18n.link_badge_linked}
        </Text>
      </View>
    );
  }
  return null;
}
