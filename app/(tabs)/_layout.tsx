import { Tabs } from "expo-router";
import { Platform } from "react-native";

import { BottomTabBar } from "@/src/shared/components/BottomTabBar";

// On web we render the persistent DesktopShell from inside each (tabs) screen,
// so the bottom tab bar is hidden by setting `tabBarStyle: { display: 'none' }`.
// On native we replace the default tab bar with our 4-tab + center-"+" design.
export default function TabLayout() {
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isWeb ? { display: "none" } : undefined,
      }}
      tabBar={isWeb ? () => null : (props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="accounts" />
      <Tabs.Screen name="debts" />
      <Tabs.Screen name="invest" />
    </Tabs>
  );
}
