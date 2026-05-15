import { Tabs } from "expo-router";

import { BottomTabBar } from "@/src/shared/components/BottomTabBar";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";

// In desktop layout the persistent DesktopShell (rendered inside each screen)
// provides navigation, so the bottom tab bar is hidden. In mobile layout
// (native, or a narrow web viewport) we render our 4-tab + center-"+" bar.
// Width-driven so resizing the browser live-swaps the chrome.
export default function TabLayout() {
  const isMobile = useIsMobileLayout();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isMobile ? undefined : { display: "none" },
      }}
      tabBar={isMobile ? (props) => <BottomTabBar {...props} /> : () => null}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="accounts" />
      <Tabs.Screen name="debts" />
      <Tabs.Screen name="invest" />
    </Tabs>
  );
}
