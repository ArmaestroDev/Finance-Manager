import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Strings } from "@/src/constants/Strings";
import { FMFonts, FMType } from "@/src/constants/theme";
import { Label, splitForHero, useFMTheme } from "@/src/shared/design";
import { formatWholeEUR } from "./investFormat";

interface ResultHeroProps {
  value: number;
  invested: number;
  gain: number;
  years: string;
  masked: boolean;
  heroSize: number;
  i18n: typeof Strings.de;
}

// Final value + invested / gain legend (the legend keys match the chart lines).
export function ResultHero({ value, invested, gain, years, masked, heroSize, i18n }: ResultHeroProps) {
  const t = useFMTheme();
  const hero = splitForHero(value, masked);
  return (
    <View>
      <Label>{i18n.invest_final_value_short.replace("{years}", years)}</Label>
      <View style={styles.heroRow}>
        <Text
          style={{
            fontFamily: FMFonts.display,
            fontSize: heroSize,
            lineHeight: Math.round(heroSize * 1.15),
            color: t.primary,
            fontVariant: ["tabular-nums"],
          }}
        >
          {hero.sign}
          {hero.integer}
          <Text style={{ color: t.inkSoft }}>{hero.fraction}</Text>
        </Text>
        <Text style={{ fontFamily: FMFonts.display, fontSize: FMType.h1, color: t.inkSoft, marginLeft: 6 }}>€</Text>
      </View>
      <View style={styles.legend}>
        <View style={{ flex: 1 }}>
          <View style={styles.key}>
            <View style={[styles.dash, { borderColor: t.inkMuted, borderStyle: "dashed" }]} />
            <Label>{i18n.total_invested}</Label>
          </View>
          <Text style={[styles.stat, { color: t.ink }]}>{masked ? "••••••" : formatWholeEUR(invested)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.key}>
            <View style={[styles.dash, { borderColor: t.primary }]} />
            <Label>{i18n.total_gain}</Label>
          </View>
          <Text style={[styles.stat, { color: t.pos }]}>{masked ? "••••••" : `+${formatWholeEUR(gain)}`}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: "row", alignItems: "baseline", marginTop: 4 },
  legend: { flexDirection: "row", gap: 16, marginTop: 16 },
  key: { flexDirection: "row", alignItems: "center", gap: 6 },
  dash: { width: 14, height: 0, borderTopWidth: 2 },
  stat: {
    fontFamily: FMFonts.sansMedium,
    fontSize: FMType.subhead,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
});
