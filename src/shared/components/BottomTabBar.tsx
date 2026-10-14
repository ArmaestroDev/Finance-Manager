import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Strings } from "@/src/constants/Strings";
import { FMFonts } from "@/src/constants/theme";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  Fab,
  IconBank,
  IconCoins,
  IconHome,
  IconPeople,
  IconPlus,
  PressState,
  stateColor,
  useFMTheme,
} from "@/src/shared/design";
import { useQuickAdd } from "./QuickAddSheet";

interface TabDef {
  name: string;
  labelKey: keyof typeof Strings.de;
  icon: (color: string, filled: boolean) => React.ReactNode;
}

const TABS: readonly TabDef[] = [
  { name: "index", labelKey: "overview_title", icon: (c, f) => <IconHome size={20} color={c} filled={f} /> },
  { name: "accounts", labelKey: "tab_accounts", icon: (c, f) => <IconBank size={20} color={c} filled={f} /> },
  { name: "debts", labelKey: "tab_debts", icon: (c, f) => <IconPeople size={20} color={c} filled={f} /> },
  { name: "invest", labelKey: "tab_invest", icon: (c, f) => <IconCoins size={20} color={c} filled={f} /> },
];

// M3 navigation bar (4 destinations, active-indicator pill) plus the
// quick-add FAB floating above it at the bottom-right.
export function BottomTabBar(props: BottomTabBarProps) {
  const t = useFMTheme();
  const insets = useSafeAreaInsets();
  const quick = useQuickAdd();
  const { i18n } = useSettings();

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

  return (
    <View>
      <Fab
        icon={<IconPlus size={22} />}
        label={i18n.quick_add}
        onPress={onPlus}
        style={styles.fab}
      />
      <View
        accessibilityRole="tablist"
        style={[styles.bar, { backgroundColor: t.surfaceContainer, paddingBottom: insets.bottom }]}
      >
        {TABS.map((tab) => (
          <TabItem
            key={tab.name}
            tab={tab}
            active={screensByName[tab.name]?.index === props.state.index}
            label={i18n[tab.labelKey]}
            onPress={() => onPress(tab)}
          />
        ))}
      </View>
    </View>
  );
}

interface TabItemProps {
  tab: TabDef;
  active: boolean;
  label: string;
  onPress: () => void;
}

function TabItem({ tab, active, label, onPress }: TabItemProps) {
  const t = useFMTheme();
  const iconColor = active ? t.onSecondaryContainer : t.onSurfaceVariant;
  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {(s) => (
        <>
          <View
            style={[
              styles.indicator,
              {
                backgroundColor: stateColor(
                  active ? t.secondaryContainer : "transparent",
                  t.onSurface,
                  s as PressState,
                ),
              },
            ]}
          >
            {tab.icon(iconColor, active)}
          </View>
          <Text
            style={{
              fontFamily: active ? FMFonts.sansSemibold : FMFonts.sansMedium,
              fontSize: 12,
              lineHeight: 16,
              color: active ? t.ink : t.onSurfaceVariant,
              marginTop: 4,
              letterSpacing: 0.4,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 12,
    paddingHorizontal: 8,
    minHeight: 80,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    minHeight: 56,
  },
  indicator: {
    width: 64,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    right: 16,
    top: -72,
    zIndex: 5,
  },
});
