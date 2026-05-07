/**
 * Finance Manager — design tokens.
 * Confident, dense, data-forward. One accent. Tabular numerals everywhere.
 *
 * The shape mirrors FM_TOKENS from the design system: bg/surface/surfaceAlt/
 * line/lineStrong/ink/inkSoft/inkMuted/accent/accentInk/accentSoft/pos/neg/
 * posSoft/negSoft/warn/warnSoft + a 12-color category palette.
 *
 * Backwards-compat: legacy keys (text/textSecondary/background/surface/tint/
 * icon/tabIconDefault/tabIconSelected/primary/primaryLight/income/expense/
 * border) are preserved so unrebuilt components don't crash before they're
 * redesigned. New work should reach for the FM tokens directly.
 */

import { Platform } from "react-native";

export type ThemeMode = "light" | "dark";
export type ThemePalette =
  | "mulberry"
  | "red"
  | "purple"
  | "green"
  | "turquoise";

export interface FMTheme {
  // Surface
  bg: string;
  surface: string;
  surfaceAlt: string;
  line: string;
  lineStrong: string;
  // Ink
  ink: string;
  inkSoft: string;
  inkMuted: string;
  // Accent
  accent: string;
  accentInk: string;
  accentSoft: string;
  // Semantic
  pos: string;
  neg: string;
  posSoft: string;
  negSoft: string;
  warn: string;
  warnSoft: string;

  // ── Legacy keys (kept until every component has been redesigned) ──
  text: string;
  textSecondary: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  primary: string;
  primaryLight: string;
  income: string;
  expense: string;
  border: string;
}

const ACCENT_LIGHT = "#a4527a";
const ACCENT_DARK = "#c97aa0";
const ACCENT_INK_LIGHT = "#7d3a5b";
const ACCENT_INK_DARK = "#e4abc4";
const ACCENT_SOFT_LIGHT = "rgba(164, 82, 122, 0.10)";
const ACCENT_SOFT_DARK = "rgba(201, 122, 160, 0.16)";

const MULBERRY_LIGHT: FMTheme = {
  bg: "#f7f6f3",
  surface: "#ffffff",
  surfaceAlt: "#fbfaf7",
  line: "rgba(28, 24, 20, 0.08)",
  lineStrong: "rgba(28, 24, 20, 0.14)",
  ink: "#1a1714",
  inkSoft: "#5b554d",
  inkMuted: "#8a847a",
  accent: ACCENT_LIGHT,
  accentInk: ACCENT_INK_LIGHT,
  accentSoft: ACCENT_SOFT_LIGHT,
  pos: "#2f5d50",
  neg: "#b04a3a",
  posSoft: "rgba(47, 93, 80, 0.10)",
  negSoft: "rgba(176, 74, 58, 0.10)",
  warn: "#a87a2c",
  warnSoft: "rgba(168, 122, 44, 0.12)",

  text: "#1a1714",
  textSecondary: "#5b554d",
  background: "#f7f6f3",
  tint: ACCENT_LIGHT,
  icon: "#5b554d",
  tabIconDefault: "#8a847a",
  tabIconSelected: "#1a1714",
  primary: ACCENT_LIGHT,
  primaryLight: ACCENT_SOFT_LIGHT,
  income: "#2f5d50",
  expense: "#b04a3a",
  border: "rgba(28, 24, 20, 0.08)",
};

const MULBERRY_DARK: FMTheme = {
  bg: "#0f0e0c",
  surface: "#181614",
  surfaceAlt: "#1f1c19",
  line: "rgba(245, 240, 232, 0.09)",
  lineStrong: "rgba(245, 240, 232, 0.16)",
  ink: "#f3efe7",
  inkSoft: "#b6afa3",
  inkMuted: "#7e7868",
  accent: ACCENT_DARK,
  accentInk: ACCENT_INK_DARK,
  accentSoft: ACCENT_SOFT_DARK,
  pos: "#7eb39e",
  neg: "#d68876",
  posSoft: "rgba(126, 179, 158, 0.14)",
  negSoft: "rgba(214, 136, 118, 0.16)",
  warn: "#dca65f",
  warnSoft: "rgba(220, 166, 95, 0.14)",

  text: "#f3efe7",
  textSecondary: "#b6afa3",
  background: "#0f0e0c",
  tint: ACCENT_DARK,
  icon: "#b6afa3",
  tabIconDefault: "#7e7868",
  tabIconSelected: "#f3efe7",
  primary: ACCENT_DARK,
  primaryLight: ACCENT_SOFT_DARK,
  income: "#7eb39e",
  expense: "#d68876",
  border: "rgba(245, 240, 232, 0.09)",
};

const RED_LIGHT: FMTheme = {
  bg: "#FAF6F4",
  surface: "#FFFFFF",
  surfaceAlt: "#FBEFEC",
  line: "rgba(40, 9, 5, 0.10)",
  lineStrong: "rgba(40, 9, 5, 0.18)",
  ink: "#280905",
  inkSoft: "#5b2620",
  inkMuted: "#8a4d44",
  accent: "#C3110C",
  accentInk: "#740A03",
  accentSoft: "rgba(195, 17, 12, 0.10)",
  pos: "#2f5d50",
  neg: "#b04a3a",
  posSoft: "rgba(47, 93, 80, 0.10)",
  negSoft: "rgba(176, 74, 58, 0.10)",
  warn: "#a87a2c",
  warnSoft: "rgba(168, 122, 44, 0.12)",

  text: "#280905",
  textSecondary: "#5b2620",
  background: "#FAF6F4",
  tint: "#C3110C",
  icon: "#5b2620",
  tabIconDefault: "#8a4d44",
  tabIconSelected: "#280905",
  primary: "#C3110C",
  primaryLight: "rgba(195, 17, 12, 0.10)",
  income: "#2f5d50",
  expense: "#b04a3a",
  border: "rgba(40, 9, 5, 0.10)",
};

const RED_DARK: FMTheme = {
  bg: "#280905",
  surface: "#3a1410",
  surfaceAlt: "#4a1c17",
  line: "rgba(250, 246, 244, 0.10)",
  lineStrong: "rgba(250, 246, 244, 0.20)",
  ink: "#FAF6F4",
  inkSoft: "#e8c9c0",
  inkMuted: "#b88d80",
  accent: "#E6501B",
  accentInk: "#FFD0BB",
  accentSoft: "rgba(230, 80, 27, 0.18)",
  pos: "#7eb39e",
  neg: "#d68876",
  posSoft: "rgba(126, 179, 158, 0.14)",
  negSoft: "rgba(214, 136, 118, 0.16)",
  warn: "#dca65f",
  warnSoft: "rgba(220, 166, 95, 0.14)",

  text: "#FAF6F4",
  textSecondary: "#e8c9c0",
  background: "#280905",
  tint: "#E6501B",
  icon: "#e8c9c0",
  tabIconDefault: "#b88d80",
  tabIconSelected: "#FAF6F4",
  primary: "#E6501B",
  primaryLight: "rgba(230, 80, 27, 0.18)",
  income: "#7eb39e",
  expense: "#d68876",
  border: "rgba(250, 246, 244, 0.10)",
};

const PURPLE_LIGHT: FMTheme = {
  bg: "#fefdfd",
  surface: "#ffffff",
  surfaceAlt: "#f4f0f8",
  line: "rgba(58, 49, 83, 0.10)",
  lineStrong: "rgba(58, 49, 83, 0.18)",
  ink: "#010101",
  inkSoft: "#3a3153",
  inkMuted: "#b1aebb",
  accent: "#5f43b2",
  accentInk: "#3a3153",
  accentSoft: "rgba(95, 67, 178, 0.12)",
  pos: "#2f5d50",
  neg: "#b04a3a",
  posSoft: "rgba(47, 93, 80, 0.10)",
  negSoft: "rgba(176, 74, 58, 0.10)",
  warn: "#a87a2c",
  warnSoft: "rgba(168, 122, 44, 0.12)",

  text: "#010101",
  textSecondary: "#3a3153",
  background: "#fefdfd",
  tint: "#5f43b2",
  icon: "#3a3153",
  tabIconDefault: "#b1aebb",
  tabIconSelected: "#010101",
  primary: "#5f43b2",
  primaryLight: "rgba(95, 67, 178, 0.12)",
  income: "#2f5d50",
  expense: "#b04a3a",
  border: "rgba(58, 49, 83, 0.10)",
};

const PURPLE_DARK: FMTheme = {
  bg: "#010101",
  surface: "#1a1426",
  surfaceAlt: "#3a3153",
  line: "rgba(254, 253, 253, 0.10)",
  lineStrong: "rgba(254, 253, 253, 0.20)",
  ink: "#fefdfd",
  inkSoft: "#b1aebb",
  inkMuted: "#6e687c",
  accent: "#5f43b2",
  accentInk: "#b1aebb",
  accentSoft: "rgba(95, 67, 178, 0.22)",
  pos: "#7eb39e",
  neg: "#d68876",
  posSoft: "rgba(126, 179, 158, 0.14)",
  negSoft: "rgba(214, 136, 118, 0.16)",
  warn: "#dca65f",
  warnSoft: "rgba(220, 166, 95, 0.14)",

  text: "#fefdfd",
  textSecondary: "#b1aebb",
  background: "#010101",
  tint: "#5f43b2",
  icon: "#b1aebb",
  tabIconDefault: "#6e687c",
  tabIconSelected: "#fefdfd",
  primary: "#5f43b2",
  primaryLight: "rgba(95, 67, 178, 0.22)",
  income: "#7eb39e",
  expense: "#d68876",
  border: "rgba(254, 253, 253, 0.10)",
};

const GREEN_LIGHT: FMTheme = {
  bg: "#FFFADC",
  surface: "#FFFFFF",
  surfaceAlt: "#FBF6D2",
  line: "rgba(26, 31, 10, 0.10)",
  lineStrong: "rgba(26, 31, 10, 0.18)",
  ink: "#1a1f0a",
  inkSoft: "#3d4717",
  inkMuted: "#6b7530",
  accent: "#A4DD00",
  accentInk: "#3d4717",
  accentSoft: "rgba(164, 221, 0, 0.16)",
  pos: "#A4DD00",
  neg: "#b04a3a",
  posSoft: "rgba(164, 221, 0, 0.16)",
  negSoft: "rgba(176, 74, 58, 0.10)",
  warn: "#a87a2c",
  warnSoft: "rgba(168, 122, 44, 0.12)",

  text: "#1a1f0a",
  textSecondary: "#3d4717",
  background: "#FFFADC",
  tint: "#A4DD00",
  icon: "#3d4717",
  tabIconDefault: "#6b7530",
  tabIconSelected: "#1a1f0a",
  primary: "#A4DD00",
  primaryLight: "rgba(164, 221, 0, 0.16)",
  income: "#A4DD00",
  expense: "#b04a3a",
  border: "rgba(26, 31, 10, 0.10)",
};

const GREEN_DARK: FMTheme = {
  bg: "#1a1f0a",
  surface: "#252b10",
  surfaceAlt: "#2f361a",
  line: "rgba(255, 250, 220, 0.10)",
  lineStrong: "rgba(255, 250, 220, 0.20)",
  ink: "#FFFADC",
  inkSoft: "#dad5a3",
  inkMuted: "#8a946a",
  accent: "#B6F500",
  accentInk: "#1a1f0a",
  accentSoft: "rgba(182, 245, 0, 0.16)",
  pos: "#B6F500",
  neg: "#d68876",
  posSoft: "rgba(182, 245, 0, 0.16)",
  negSoft: "rgba(214, 136, 118, 0.16)",
  warn: "#dca65f",
  warnSoft: "rgba(220, 166, 95, 0.14)",

  text: "#FFFADC",
  textSecondary: "#dad5a3",
  background: "#1a1f0a",
  tint: "#B6F500",
  icon: "#dad5a3",
  tabIconDefault: "#8a946a",
  tabIconSelected: "#FFFADC",
  primary: "#B6F500",
  primaryLight: "rgba(182, 245, 0, 0.16)",
  income: "#B6F500",
  expense: "#d68876",
  border: "rgba(255, 250, 220, 0.10)",
};

const TURQUOISE_LIGHT: FMTheme = {
  bg: "#F5ECE0",
  surface: "#FFFFFF",
  surfaceAlt: "#EFE3D2",
  line: "rgba(14, 26, 31, 0.10)",
  lineStrong: "rgba(14, 26, 31, 0.18)",
  ink: "#0e1a1f",
  inkSoft: "#336D82",
  inkMuted: "#5F99AE",
  accent: "#336D82",
  accentInk: "#693382",
  accentSoft: "rgba(51, 109, 130, 0.12)",
  pos: "#2f5d50",
  neg: "#b04a3a",
  posSoft: "rgba(47, 93, 80, 0.10)",
  negSoft: "rgba(176, 74, 58, 0.10)",
  warn: "#a87a2c",
  warnSoft: "rgba(168, 122, 44, 0.12)",

  text: "#0e1a1f",
  textSecondary: "#336D82",
  background: "#F5ECE0",
  tint: "#336D82",
  icon: "#336D82",
  tabIconDefault: "#5F99AE",
  tabIconSelected: "#0e1a1f",
  primary: "#336D82",
  primaryLight: "rgba(51, 109, 130, 0.12)",
  income: "#2f5d50",
  expense: "#b04a3a",
  border: "rgba(14, 26, 31, 0.10)",
};

const TURQUOISE_DARK: FMTheme = {
  bg: "#0e1a1f",
  surface: "#16252b",
  surfaceAlt: "#1f2f37",
  line: "rgba(245, 236, 224, 0.10)",
  lineStrong: "rgba(245, 236, 224, 0.20)",
  ink: "#F5ECE0",
  inkSoft: "#9fc4d3",
  inkMuted: "#5F99AE",
  accent: "#5F99AE",
  accentInk: "#9b6cb5",
  accentSoft: "rgba(95, 153, 174, 0.18)",
  pos: "#7eb39e",
  neg: "#d68876",
  posSoft: "rgba(126, 179, 158, 0.14)",
  negSoft: "rgba(214, 136, 118, 0.16)",
  warn: "#dca65f",
  warnSoft: "rgba(220, 166, 95, 0.14)",

  text: "#F5ECE0",
  textSecondary: "#9fc4d3",
  background: "#0e1a1f",
  tint: "#5F99AE",
  icon: "#9fc4d3",
  tabIconDefault: "#5F99AE",
  tabIconSelected: "#F5ECE0",
  primary: "#5F99AE",
  primaryLight: "rgba(95, 153, 174, 0.18)",
  income: "#7eb39e",
  expense: "#d68876",
  border: "rgba(245, 236, 224, 0.10)",
};

export const FMColors: Record<ThemePalette, Record<ThemeMode, FMTheme>> = {
  mulberry: { light: MULBERRY_LIGHT, dark: MULBERRY_DARK },
  red: { light: RED_LIGHT, dark: RED_DARK },
  purple: { light: PURPLE_LIGHT, dark: PURPLE_DARK },
  green: { light: GREEN_LIGHT, dark: GREEN_DARK },
  turquoise: { light: TURQUOISE_LIGHT, dark: TURQUOISE_DARK },
};

// Legacy alias so existing imports keep working.
export const Colors = FMColors.mulberry;

// 12-color category palette — works on both modes; muted, not toy-bright.
export const CategoryPalette: readonly string[] = [
  "#2f5d50", // forest
  "#3b6790", // slate-blue
  "#7c5e9b", // plum
  "#a4527a", // mulberry
  "#b04a3a", // terra
  "#c47a2c", // amber
  "#a87a2c", // ochre
  "#5e7a3a", // moss
  "#3a7a6f", // teal
  "#5d6470", // graphite
  "#8a6a4a", // walnut
  "#444e3d", // olive
];

// Typography. One neutral family — Geist — across the whole product.
// Hierarchy comes from size + weight + tracking, not from a separate display
// or mono family. Money columns use `fontVariant: ['tabular-nums']` on
// individual Text nodes to get monospaced digits without a separate mono font.
const FONT_REGULAR = "Geist_400Regular";
const FONT_MEDIUM = "Geist_500Medium";
const FONT_SEMIBOLD = "Geist_600SemiBold";
const FONT_BOLD = "Geist_700Bold";

export const FMFonts = {
  // Aliases below all resolve to Geist. The shape is preserved for parity
  // with the original design tokens; weight is what differentiates them now.
  display: FONT_SEMIBOLD, // hero balances
  displayItalic: FONT_SEMIBOLD,
  sans: FONT_REGULAR,
  sansMedium: FONT_MEDIUM,
  sansSemibold: FONT_SEMIBOLD,
  sansBold: FONT_BOLD,
  mono: FONT_REGULAR, // pair with fontVariant: ['tabular-nums']
  monoMedium: FONT_MEDIUM,
  monoSemibold: FONT_SEMIBOLD,
} as const;

// Legacy `Fonts` shim — older components consume this.
export const Fonts = Platform.select({
  ios: {
    sans: FONT_REGULAR,
    serif: FONT_REGULAR,
    rounded: FONT_REGULAR,
    mono: FONT_REGULAR,
  },
  default: {
    sans: FONT_REGULAR,
    serif: FONT_REGULAR,
    rounded: FONT_REGULAR,
    mono: FONT_REGULAR,
  },
  web: {
    sans: `${FONT_REGULAR}, "Geist", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    serif: `${FONT_REGULAR}, "Geist", system-ui, sans-serif`,
    rounded: `${FONT_REGULAR}, "Geist", system-ui, sans-serif`,
    mono: `${FONT_REGULAR}, "Geist", system-ui, sans-serif`,
  },
});

// Spacing scale — most components use 4/6/8/10/12/14/16/18/20/24/28/32 directly,
// but having named values makes intent legible and search-replaceable.
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  hero: 32,
} as const;

export const Radii = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  xxl: 12,
  hero: 14,
  pill: 999,
} as const;
