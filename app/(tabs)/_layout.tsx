import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "../../src/shared/components/haptic-tab";
import { IconSymbol } from "../../src/shared/components/ui/icon-symbol";
import { Colors } from "../../src/constants/theme";
import { useSettings } from "../../src/shared/context/SettingsContext";
import { useColorScheme } from "../../src/shared/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { i18n } = useSettings(); // Added hook

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: i18n.tab_home,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: i18n.tab_accounts,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="creditcard.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: i18n.tab_debts,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="person.2.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="invest"
        options={{
          title: "Invest",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={24}
              name="chart.line.uptrend.xyaxis"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: i18n.tab_connections,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="link" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
