import { router, usePathname } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import {
  Chip,
  IconBank,
  IconCoins,
  IconCog,
  IconLink,
  IconPeople,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrend,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { useQuickAdd } from "./QuickAddSheet";
import { useSearch } from "./SearchSheet";

const COLLAPSED_WIDTH = 72;
const EXPANDED_WIDTH = 220;

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: (size: number, color: string) => React.ReactNode;
  pathPrefix: string;
}

const NAV: readonly NavItem[] = [
  { id: "overview", href: "/(tabs)", label: "Dashboard", icon: (s, c) => <IconTrend size={s} color={c} />, pathPrefix: "/" },
  { id: "accounts", href: "/(tabs)/accounts", label: "Accounts", icon: (s, c) => <IconBank size={s} color={c} />, pathPrefix: "/accounts" },
  { id: "debts", href: "/(tabs)/debts", label: "Debts", icon: (s, c) => <IconPeople size={s} color={c} />, pathPrefix: "/debts" },
  { id: "invest", href: "/(tabs)/invest", label: "Invest", icon: (s, c) => <IconCoins size={s} color={c} />, pathPrefix: "/invest" },
  { id: "connections", href: "/connections", label: "Connections", icon: (s, c) => <IconLink size={s} color={c} />, pathPrefix: "/connections" },
];

interface DesktopShellProps {
  children: React.ReactNode;
  // Override the active id when route detection isn't enough
  // (e.g., on stack-pushed screens that should highlight a parent tab).
  activeId?: NavItem["id"];
  // Override the breadcrumb tail (defaults to active item label, except for
  // the dashboard tab where the trailing label is omitted).
  breadcrumb?: string;
  // Optional onRefresh to wire to the Refresh chip.
  onRefresh?: () => void;
  // When false, the shell renders a plain container instead of a ScrollView
  // so the screen can manage its own sticky header / inner scrolling.
  scrollable?: boolean;
}

// Persistent left rail + topbar shell. Used on web for every screen.
// Sidebar is collapsed to icons by default and expands on hover.
export function DesktopShell({ children, activeId, breadcrumb, onRefresh, scrollable = true }: DesktopShellProps) {
  const t = useFMTheme();
  const pathname = usePathname() ?? "/";
  const quick = useQuickAdd();
  const search = useSearch();
  const { i18n } = useSettings();

  const computedActiveId = useMemo(() => {
    if (activeId) return activeId;
    // Pathname-based detection; longest prefix wins.
    const sorted = [...NAV].sort((a, b) => b.pathPrefix.length - a.pathPrefix.length);
    const found = sorted.find((n) => {
      if (n.id === "overview") return pathname === "/" || pathname === "/(tabs)" || pathname === "";
      return pathname.startsWith(n.pathPrefix);
    });
    return found?.id ?? "overview";
  }, [activeId, pathname]);

  const active = NAV.find((n) => n.id === computedActiveId) ?? NAV[0];

  const [hovered, setHovered] = useState(false);
  const widthAnim = useRef(new Animated.Value(COLLAPSED_WIDTH)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: hovered ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: hovered ? 1 : 0,
        duration: hovered ? 200 : 90,
        delay: hovered ? 60 : 0,
        useNativeDriver: false,
      }),
    ]).start();
  }, [hovered, widthAnim, labelOpacity]);

  const hoverHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };

  const isOverviewActive = computedActiveId === "overview";
  // Trailing breadcrumb segment: explicit override > active label (except for
  // the dashboard root, which collapses to just "Dashboard").
  const breadcrumbTail = breadcrumb ?? (isOverviewActive ? null : active.label);

  return (
    <View style={[styles.shell, { backgroundColor: t.bg }]}>
      {/* Sidebar (overlay so content doesn't reflow on hover) */}
      <Animated.View
        {...(hoverHandlers as any)}
        style={[
          styles.sidebar,
          {
            width: widthAnim,
            backgroundColor: t.surfaceAlt,
            borderRightColor: t.line,
          },
        ]}
      >
        <View style={styles.logoRow}>
          <Text
            style={{ fontFamily: FMFonts.display, fontSize: 20, color: t.ink, lineHeight: 22, letterSpacing: -0.3 }}
            numberOfLines={1}
          >
            F
            <Animated.Text style={{ opacity: labelOpacity }}>inance</Animated.Text>
            <Text style={{ color: t.accent }}>.</Text>
          </Text>
          <Animated.Text
            numberOfLines={1}
            style={{
              opacity: labelOpacity,
              fontSize: 10,
              fontFamily: FMFonts.sansSemibold,
              color: t.inkMuted,
              marginTop: 3,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Manager
          </Animated.Text>
        </View>

        <View style={{ gap: 1 }}>
          {NAV.map((item) => {
            const isActive = item.id === computedActiveId;
            return (
              <Pressable
                key={item.id}
                onPress={() => router.push(item.href as never)}
                style={({ pressed }) => [
                  styles.navItem,
                  {
                    backgroundColor: isActive ? t.surface : "transparent",
                    borderColor: isActive ? t.line : "transparent",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={{ width: 18, alignItems: "center" }}>
                  {item.icon(15, isActive ? t.accent : t.inkMuted)}
                </View>
                <Animated.Text
                  numberOfLines={1}
                  style={{
                    marginLeft: 9,
                    fontSize: 12.5,
                    fontFamily: isActive ? FMFonts.sansSemibold : FMFonts.sansMedium,
                    color: isActive ? t.ink : t.inkSoft,
                    opacity: labelOpacity,
                  }}
                >
                  {item.label}
                </Animated.Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={() => router.push("/settings" as never)}
          style={({ pressed }) => [
            styles.userCard,
            {
              backgroundColor: t.surface,
              borderColor: t.line,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: t.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 11, color: "#fff" }}>L</Text>
          </View>
          <Animated.View style={{ flex: 1, marginLeft: 8, opacity: labelOpacity }}>
            <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 12, color: t.ink }} numberOfLines={1}>
              You
            </Text>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 10, color: t.inkMuted, marginTop: 1 }} numberOfLines={1}>
              Local · EUR
            </Text>
          </Animated.View>
          <Animated.View style={{ opacity: labelOpacity }}>
            <IconCog size={13} color={t.inkMuted} />
          </Animated.View>
        </Pressable>
      </Animated.View>

      {/* Content (offset by collapsed sidebar width; expanded sidebar overlays) */}
      <View style={[styles.content, { marginLeft: COLLAPSED_WIDTH }]}>
        {/* Topbar */}
        <View style={[styles.topbar, { backgroundColor: t.surface, borderBottomColor: t.line }]}>
          <View style={styles.crumb}>
            <Pressable onPress={() => router.push("/(tabs)" as never)}>
              {({ hovered: hov, pressed }: any) => (
                <Text
                  style={{
                    fontFamily:
                      isOverviewActive && !breadcrumb ? FMFonts.sansSemibold : FMFonts.sansMedium,
                    fontSize: 12,
                    color:
                      isOverviewActive && !breadcrumb
                        ? t.ink
                        : hov
                          ? t.ink
                          : t.inkMuted,
                    opacity: pressed ? 0.7 : 1,
                  }}
                >
                  Dashboard
                </Text>
              )}
            </Pressable>
            {breadcrumbTail ? (
              <>
                <Text style={{ marginHorizontal: 8, color: t.inkMuted, fontSize: 12 }}>/</Text>
                <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 12, color: t.ink }}>
                  {breadcrumbTail}
                </Text>
              </>
            ) : null}
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Chip
              onPress={() => search.open()}
              icon={<IconSearch size={12} color={t.inkSoft} />}
            >
              Search
            </Chip>
            <Chip
              onPress={() => quick.open()}
              icon={<IconPlus size={11} color={t.inkSoft} />}
            >
              {i18n.quick_add}
            </Chip>
            {onRefresh ? (
              <Chip onPress={onRefresh} icon={<IconRefresh size={12} color={t.inkSoft} />}>
                Refresh
              </Chip>
            ) : null}
          </View>
        </View>

        <View style={{ flex: 1, minHeight: 0 }}>
          {scrollable ? (
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: "row",
    minHeight: "100%" as unknown as number,
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    borderRightWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 22,
    paddingBottom: 18,
    overflow: "hidden",
  },
  logoRow: {
    paddingHorizontal: 6,
    marginBottom: 24,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 5,
    borderWidth: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  topbar: {
    height: 48,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  crumb: {
    flexDirection: "row",
    alignItems: "center",
  },
});
