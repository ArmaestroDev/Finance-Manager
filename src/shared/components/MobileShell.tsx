import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFMTheme } from "@/src/shared/design";
import { MobileHeader } from "./MobileHeader";

// Bottom clearance on tab screens so the last row can scroll clear of the
// quick-add FAB that floats above the navigation bar. Screens that own their own FlatList/SectionList can use
// this constant directly in their contentContainerStyle.
export const MOBILE_TAB_SPACE = 96;

interface MobileShellProps {
  children: React.ReactNode;
  /** Top app bar title. Omit to render no header. */
  title?: string;
  sub?: string;
  /** Header right slot — chips / icon actions. */
  right?: React.ReactNode;
  /** Header leading back arrow. */
  onBack?: () => void;
  /** Legacy custom leading node; prefer `onBack`. */
  back?: React.ReactNode;
  /** Wire pull-to-refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /**
   * When false the shell renders the children directly (no ScrollView) so a
   * screen can own its FlatList/SectionList scrolling. The header still renders.
   */
  scrollable?: boolean;
  /**
   * Reserve space for the floating bottom tab bar. True on the 4 tab screens,
   * false on pushed detail screens (account/[id], connections, settings) that
   * have no tab bar.
   */
  tabBar?: boolean;
  /** Extra contentContainer overrides (scrollable mode only). */
  contentStyle?: StyleProp<ViewStyle>;
  /** Replace the default MobileHeader entirely (rare — e.g. animated headers). */
  headerOverride?: React.ReactNode;
}

// Mobile screen shell — the mobile analog of DesktopShell. Owns the safe-area
// handling, the M3 top app bar, pull-to-refresh, and bottom-tab clearance so
// every mobile screen is structurally consistent. Mobile-only; web keeps
// DesktopShell untouched.
export function MobileShell({
  children,
  title,
  sub,
  right,
  onBack,
  back,
  onRefresh,
  refreshing = false,
  scrollable = true,
  tabBar = true,
  contentStyle,
  headerOverride,
}: MobileShellProps) {
  const t = useFMTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = tabBar ? MOBILE_TAB_SPACE : insets.bottom + 24;

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      {headerOverride ??
        (title ? (
          <MobileHeader title={title} sub={sub} right={right} onBack={onBack} back={back} />
        ) : null)}

      {scrollable ? (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: bottomPad },
            contentStyle,
          ]}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={t.accent}
              />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minHeight: 0 },
  scroll: {
    paddingHorizontal: 16,
  },
});
