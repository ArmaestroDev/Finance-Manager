import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FMFonts } from "@/src/constants/theme";
import {
  IconBank,
  IconCoins,
  IconPeople,
  IconPlus,
  IconTrend,
  useFMTheme,
} from "@/src/shared/design";
import { useQuickAdd } from "./QuickAddSheet";

interface TabDef {
  name: string;
  label: string;
  icon: (color: string) => React.ReactNode;
}

const TABS: readonly TabDef[] = [
  { name: "index", label: "Overview", icon: (c) => <IconTrend size={20} color={c} /> },
  { name: "accounts", label: "Accounts", icon: (c) => <IconBank size={20} color={c} /> },
  { name: "debts", label: "Debts", icon: (c) => <IconPeople size={20} color={c} /> },
  { name: "invest", label: "Invest", icon: (c) => <IconCoins size={20} color={c} /> },
];

// Custom bottom tab bar — 4 tabs with a center primary "+" that opens the
// QuickAdd sheet (matches the design's prototype navigation).
export function BottomTabBar(props: BottomTabBarProps) {
  const t = useFMTheme();
  const insets = useSafeAreaInsets();
  const quick = useQuickAdd();

  // The screens registered in the Tabs navigator. We map them to the design's
  // tab order so an unknown screen registered later still gets a slot.
  const screensByName = useMemo(() => {
    const m: Record<string, { route: BottomTabBarProps["state"]["routes"][number]; index: number }> = {};
    props.state.routes.forEach((route, i) => {
      m[route.name] = { route, index: i };
    });
    return m;
  }, [props.state.routes]);

  const onPress = (tab: TabDef) => {
    const meta = screensByName[tab.name];
    if (!meta) return;
    const focused = props.state.index === meta.index;
    const event = props.navigation.emit({
      type: "tabPress",
      target: meta.route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync().catch(() => {});
      }
      props.navigation.navigate(meta.route.name as never);
    }
  };

  const onPlus = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    quick.open();
  };

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: t.surface,
          borderTopColor: t.line,
          paddingBottom: 8 + insets.bottom,
        },
      ]}
    >
      {left.map((tab) => (
        <TabItem
          key={tab.name}
          tab={tab}
          active={screensByName[tab.name]?.index === props.state.index}
          onPress={() => onPress(tab)}
        />
      ))}

      <View style={styles.plusWrap}>
        <Pressable
          onPress={onPlus}
          style={({ pressed }) => [
            styles.plus,
            {
              backgroundColor: t.accent,
              shadowColor: t.accent,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          <IconPlus size={20} color="#fff" />
        </Pressable>
      </View>

      {right.map((tab) => (
        <TabItem
          key={tab.name}
          tab={tab}
          active={screensByName[tab.name]?.index === props.state.index}
          onPress={() => onPress(tab)}
        />
      ))}
    </View>
  );
}

interface TabItemProps {
  tab: TabDef;
  active: boolean;
  onPress: () => void;
}

function TabItem({ tab, active, onPress }: TabItemProps) {
  const t = useFMTheme();
  const color = active ? t.ink : t.inkMuted;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
    >
      <View style={styles.indicatorWrap}>
        {active ? <View style={[styles.indicator, { backgroundColor: t.ink }]} /> : null}
      </View>
      {tab.icon(color)}
      <Text
        style={{
          fontFamily: active ? FMFonts.sansSemibold : FMFonts.sansMedium,
          fontSize: 9.5,
          color,
          marginTop: 3,
          letterSpacing: -0.1,
        }}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    borderTopWidth: 1,
    paddingTop: 9,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 0,
  },
  indicatorWrap: {
    height: 9,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: -9,
    marginBottom: 0,
  },
  indicator: {
    width: 24,
    height: 2,
    borderRadius: 1,
  },
  plusWrap: {
    width: 64,
    alignItems: "center",
  },
  plus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginTop: -2,
  },
});
