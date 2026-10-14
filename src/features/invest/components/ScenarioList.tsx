import React from "react";
import { Text, View } from "react-native";

import type { Strings } from "@/src/constants/Strings";
import { FMFonts, FMType } from "@/src/constants/theme";
import { Avatar, ListItem, formatEURCompact, useFMTheme } from "@/src/shared/design";
import type { Profile } from "../hooks/useInvestCalculator";
import { profileSummary, simulateProfileValue } from "./investFormat";

interface ScenarioListProps {
  profiles: Profile[];
  masked: boolean;
  onApply: (p: Profile) => void;
  onLongPress?: (p: Profile) => void;
  /** Horizontal inset (the card's padding) so state layers reach the card edge. */
  inset: number;
  i18n: typeof Strings.de;
}

// Saved scenarios as M3 list items: colour avatar · name + inputs · final value.
export function ScenarioList({ profiles, masked, onApply, onLongPress, inset, i18n }: ScenarioListProps) {
  const t = useFMTheme();
  return (
    <View style={{ marginHorizontal: -inset }}>
      {profiles.map((p) => (
        <ListItem
          key={p.id}
          onPress={() => onApply(p)}
          onLongPress={onLongPress ? () => onLongPress(p) : undefined}
          accessibilityLabel={p.name}
          leading={<Avatar label={p.name} color={p.color} />}
          title={p.name}
          subtitle={profileSummary(p, i18n)}
          trailing={
            <Text
              style={{
                fontFamily: FMFonts.sansMedium,
                fontSize: FMType.subhead,
                color: t.primary,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatEURCompact(simulateProfileValue(p), { masked })}
            </Text>
          }
          style={{ paddingHorizontal: inset }}
        />
      ))}
    </View>
  );
}
