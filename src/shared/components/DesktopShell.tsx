import { router, usePathname } from "expo-router";
import React, { useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import type { Strings } from "@/src/constants/Strings";
import { FMFonts } from "@/src/constants/theme";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  Fab,
  IconBack,
  IconBank,
  IconButton,
  IconCog,
  IconCoins,
  IconHome,
  IconLink,
  IconPeople,
  IconPlus,
  IconRefresh,
  IconSearch,
  PressState,
  stateColor,
  useFMTheme,
} from "@/src/shared/design";
import { useQuickAdd } from "./QuickAddSheet";
import { useSearch } from "./SearchSheet";

const RAIL_WIDTH = 88; // M3 rail

interface NavItem {
  id: string;
  href: string;
  labelKey: keyof typeof Strings.de;
  icon: (color: string, filled: boolean) => React.ReactNode;
  pathPrefix: string;
}

const NAV: readonly NavItem[] = [
  {
    id: "overview",
    href: "/(tabs)",
    labelKey: "overview_title",
    icon: (c, f) => <IconHome size={20} color={c} filled={f} />,
    pathPrefix: "/",
  },
  {
    id: "accounts",
    href: "/(tabs)/accounts",
    labelKey: "tab_accounts",
    icon: (c, f) => <IconBank size={20} color={c} filled={f} />,
    pathPrefix: "/accounts",
  },
  {
    id: "debts",
    href: "/(tabs)/debts",
    labelKey: "tab_debts",
    icon: (c, f) => <IconPeople size={20} color={c} filled={f} />,
    pathPrefix: "/debts",
  },
  {
    id: "invest",
    href: "/(tabs)/invest",
    labelKey: "tab_invest",
    icon: (c, f) => <IconCoins size={20} color={c} filled={f} />,
    pathPrefix: "/invest",
  },
  {
    id: "connections",
    href: "/connections",
    labelKey: "tab_connections",
    icon: (c, f) => <IconLink size={20} color={c} filled={f} />,
    pathPrefix: "/connections",
  },
];

interface DesktopShellProps {
  children: React.ReactNode;
  /** Override the highlighted destination (stack screens under a tab). */
  activeId?: NavItem["id"];
  /** Top app bar title. Defaults to `breadcrumb`, then the active destination. */
  title?: string;
  /** Legacy alias for `title`. */
  breadcrumb?: string;
  /** Leading back arrow in the top app bar. */
  onBack?: () => void;
  /** Trailing actions in the top app bar (buttons / icon buttons). */
  actions?: React.ReactNode;
  /** Adds a refresh icon button to the top app bar. */
  onRefresh?: () => void;
  /** When false, children manage their own scrolling. */
  scrollable?: boolean;
}

// Desktop chrome: M3 navigation rail (FAB + destinations + settings) and a
// top app bar (title · search · refresh · screen actions). Every desktop
// screen renders inside it, so page structure is identical everywhere.
export function DesktopShell({
  children,
  activeId,
  title,
  breadcrumb,
  onBack,
  actions,
  onRefresh,
  scrollable = true,
}: DesktopShellProps) {
  const t = useFMTheme();
  // Narrow desktop windows: the search bar becomes an icon so the screen's
  // actions and the title still fit (DECISIONS.md §2.5).
  const { width: windowWidth } = useWindowDimensions();
  const compactSearch = windowWidth < 1320;
  const pathname = usePathname() ?? "/";
  const quick = useQuickAdd();
  const search = useSearch();
  const { i18n } = useSettings();

  const isSettings = pathname.startsWith("/settings");
  const computedActiveId = useMemo(() => {
    if (activeId) return activeId;
    const sorted = [...NAV].sort((a, b) => b.pathPrefix.length - a.pathPrefix.length);
    const found = sorted.find((n) => {
      if (n.id === "overview") return pathname === "/" || pathname === "/(tabs)" || pathname === "";
      return pathname.startsWith(n.pathPrefix);
    });
    return found?.id ?? null;
  }, [activeId, pathname]);

  const active = NAV.find((n) => n.id === computedActiveId) ?? null;
  const heading =
    title ?? breadcrumb ?? (isSettings ? i18n.settings_title : active ? i18n[active.labelKey] : "");

  return (
    <View style={[styles.shell, { backgroundColor: t.bg }]}>
      {/* Navigation rail */}
      <View style={[styles.rail, { backgroundColor: t.bg }]} role="navigation">
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
          tintColor={t.primary}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <Fab icon={<IconPlus size={22} />} label={i18n.quick_add} onPress={() => quick.open()} style={{ marginBottom: 24 }} />
        <View style={{ gap: 12, alignItems: "center" }}>
          {NAV.map((item) => (
            <RailItem
              key={item.id}
              label={i18n[item.labelKey]}
              active={item.id === computedActiveId}
              icon={item.icon}
              onPress={() => router.push(item.href as never)}
            />
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <RailItem
          label={i18n.settings_title}
          active={isSettings}
          icon={(c, f) => <IconCog size={20} color={c} filled={f} />}
          onPress={() => router.push("/settings" as never)}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topbar}>
          {onBack ? (
            <IconButton icon={<IconBack size={20} />} label={i18n.back} onPress={onBack} style={{ marginRight: 8, marginLeft: -8 }} />
          ) : null}
          <Text
            style={{ fontFamily: FMFonts.sans, fontSize: 22, lineHeight: 28, color: t.ink, flexShrink: 1, minWidth: 80 }}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {heading}
          </Text>
          <View style={{ flex: 1, minWidth: 16 }} />
          {compactSearch ? (
            <IconButton icon={<IconSearch size={18} />} label={i18n.search_label} onPress={() => search.open()} />
          ) : (
            <Pressable
              onPress={() => search.open()}
              accessibilityRole="search"
              accessibilityLabel={i18n.search_label}
            >
              {(s) => (
                <View
                  style={[
                    styles.search,
                    { backgroundColor: stateColor(t.surfaceContainerHigh, t.ink, s as PressState) },
                  ]}
                >
                  <IconSearch size={18} color={t.onSurfaceVariant} />
                  <Text
                    style={{ marginLeft: 12, fontFamily: FMFonts.sans, fontSize: 15, color: t.onSurfaceVariant }}
                    numberOfLines={1}
                  >
                    {i18n.search_label}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
          {onRefresh ? (
            <IconButton
              icon={<IconRefresh size={18} />}
              label={i18n.shared_refresh}
              onPress={onRefresh}
              style={{ marginLeft: 8 }}
            />
          ) : null}
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>

        <View style={{ flex: 1, minHeight: 0 }}>
          {scrollable ? (
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
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

function RailItem({
  label,
  active,
  icon,
  onPress,
}: {
  label: string;
  active: boolean;
  icon: (color: string, filled: boolean) => React.ReactNode;
  onPress: () => void;
}) {
  const t = useFMTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={styles.railItem}
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
            {icon(active ? t.onSecondaryContainer : t.onSurfaceVariant, active)}
          </View>
          <Text
            numberOfLines={1}
            style={{
              marginTop: 4,
              fontSize: 12,
              lineHeight: 16,
              letterSpacing: 0,
              paddingHorizontal: 2,
              fontFamily: active ? FMFonts.sansSemibold : FMFonts.sansMedium,
              color: active ? t.ink : t.onSurfaceVariant,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: "row",
    minHeight: "100%",
  },
  rail: {
    width: RAIL_WIDTH,
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 24,
  },
  logo: {
    width: 28,
    height: 28,
    marginBottom: 20,
  },
  railItem: {
    width: RAIL_WIDTH,
    alignItems: "center",
  },
  indicator: {
    width: 56,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  topbar: {
    height: 72,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  search: {
    height: 44,
    width: 320,
    maxWidth: "100%",
    borderRadius: 22,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 12,
    flexShrink: 0,
  },
});
