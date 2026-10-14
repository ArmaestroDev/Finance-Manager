/**
 * Finance Manager — design tokens (Material Design 3).
 *
 * Every palette is a full set of M3 color roles generated from the palette's
 * seed colour with Google's HCT tonal system (material-color-utilities):
 * primary/secondary/tertiary from the seed, neutrals from the palette's
 * original background hue, error from the M3 error hue. Values are baked in
 * (no runtime dependency) and every text/background pair is checked for WCAG
 * AA (>= 4.5:1). See DECISIONS.md §5.
 *
 * Two naming layers share one object:
 *  - App aliases (bg, surface, ink, accent, pos, neg, ...) — what most screens
 *    use. They point at M3 tones: `bg` is the page (M3 surface/background),
 *    `surface` is a card/pane (container), `surfaceAlt` a nested fill.
 *  - M3 roles (primary, primaryContainer, surfaceContainerHigh, outline, ...)
 *    for components that follow the M3 spec 1:1 (buttons, chips, nav).
 *
 * Note: the M3 role "surface" is exposed as `bg`; `surface` here is the card
 * colour (kept for compatibility with every existing screen).
 */

export type ThemeMode = "light" | "dark";
export type ThemePalette =
  | "mulberry"
  | "red"
  | "purple"
  | "green"
  | "turquoise";

export interface FMTheme {
  // ── App aliases ──
  /** Page background (M3 surface / background). */
  bg: string;
  /** Cards, panes, list containers. */
  surface: string;
  /** Nested fills inside cards: inputs, hover rows, tracks. */
  surfaceAlt: string;
  /** Hairline divider. */
  line: string;
  /** Stronger divider / decorative border (= outlineVariant). */
  lineStrong: string;
  /** Primary text (onSurface). */
  ink: string;
  /** Secondary text (onSurfaceVariant). */
  inkSoft: string;
  /** Tertiary text: meta, captions (AA on every surface). */
  inkMuted: string;
  /** Brand colour (= primary). */
  accent: string;
  /** Strong brand text (on light/neutral backgrounds). */
  accentInk: string;
  /** Tonal brand fill (= secondaryContainer): selected chips, nav indicator. */
  accentSoft: string;
  /** Foreground on an `accent` fill (= onPrimary). */
  onAccent: string;
  // Money semantics (harmonized toward the palette)
  pos: string;
  neg: string;
  posSoft: string;
  negSoft: string;
  warn: string;
  warnSoft: string;

  // ── M3 color roles ──
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  scrim: string;
}

export const FMColors: Record<ThemePalette, Record<ThemeMode, FMTheme>> = {
  mulberry: {
    light: {
      bg: "#f9eef0",
      surface: "#ffffff",
      surfaceAlt: "#f1e5e8",
      line: "#f1dee3",
      lineStrong: "#d4c2c7",
      ink: "#1f1a1c",
      inkSoft: "#504348",
      inkMuted: "#6e5f64",
      accent: "#95416c",
      accentInk: "#782953",
      accentSoft: "#fed9e6",
      onAccent: "#ffffff",
      pos: "#306b25",
      neg: "#a7354a",
      posSoft: "#b6faa2",
      negSoft: "#ffe1e3",
      warn: "#885200",
      warnSoft: "#ffe3ca",
      primary: "#95416c",
      onPrimary: "#ffffff",
      primaryContainer: "#ffd8e6",
      onPrimaryContainer: "#3d0025",
      secondary: "#725762",
      onSecondary: "#ffffff",
      secondaryContainer: "#fed9e6",
      onSecondaryContainer: "#2a151f",
      tertiary: "#7e5539",
      onTertiary: "#ffffff",
      tertiaryContainer: "#ffdcc6",
      onTertiaryContainer: "#301401",
      error: "#ba1a1a",
      onError: "#ffffff",
      errorContainer: "#ffdad6",
      onErrorContainer: "#410002",
      surfaceDim: "#e2d7da",
      surfaceBright: "#fff8f8",
      surfaceContainerLowest: "#ffffff",
      surfaceContainerLow: "#fcf1f3",
      surfaceContainer: "#f7ebed",
      surfaceContainerHigh: "#f1e5e8",
      surfaceContainerHighest: "#ebe0e2",
      onSurface: "#1f1a1c",
      onSurfaceVariant: "#504348",
      outline: "#827378",
      outlineVariant: "#d4c2c7",
      inverseSurface: "#352f31",
      inverseOnSurface: "#f9eef0",
      inversePrimary: "#ffafd2",
      scrim: "rgba(0, 0, 0, 0.4)",
    },
    dark: {
      bg: "#171214",
      surface: "#241e20",
      surfaceAlt: "#2e282a",
      line: "#392d32",
      lineStrong: "#504348",
      ink: "#ebe0e2",
      inkSoft: "#d4c2c7",
      inkMuted: "#b8a7ac",
      accent: "#ffafd2",
      accentInk: "#ffd8e6",
      accentSoft: "#59404a",
      onAccent: "#5c113c",
      pos: "#96d784",
      neg: "#ffb2b9",
      posSoft: "#064603",
      negSoft: "#770e29",
      warn: "#ffb868",
      warnSoft: "#573300",
      primary: "#ffafd2",
      onPrimary: "#5c113c",
      primaryContainer: "#782953",
      onPrimaryContainer: "#ffd8e6",
      secondary: "#e0bdca",
      onSecondary: "#412a34",
      secondaryContainer: "#59404a",
      onSecondaryContainer: "#fed9e6",
      tertiary: "#f2bb98",
      onTertiary: "#49280f",
      tertiaryContainer: "#633e23",
      onTertiaryContainer: "#ffdcc6",
      error: "#ffb4ab",
      onError: "#690005",
      errorContainer: "#93000a",
      onErrorContainer: "#ffdad6",
      surfaceDim: "#171214",
      surfaceBright: "#3e3739",
      surfaceContainerLowest: "#120d0f",
      surfaceContainerLow: "#1f1a1c",
      surfaceContainer: "#241e20",
      surfaceContainerHigh: "#2e282a",
      surfaceContainerHighest: "#393335",
      onSurface: "#ebe0e2",
      onSurfaceVariant: "#d4c2c7",
      outline: "#9d8c92",
      outlineVariant: "#504348",
      inverseSurface: "#ebe0e2",
      inverseOnSurface: "#352f31",
      inversePrimary: "#95416c",
      scrim: "rgba(0, 0, 0, 0.6)",
    },
  },
  red: {
    light: {
      bg: "#fbeeec",
      surface: "#ffffff",
      surfaceAlt: "#f3e5e3",
      line: "#f5ddda",
      lineStrong: "#d8c2be",
      ink: "#201a19",
      inkSoft: "#534341",
      inkMuted: "#715f5d",
      accent: "#be0b08",
      accentInk: "#930002",
      accentSoft: "#ffdad5",
      onAccent: "#ffffff",
      pos: "#306b25",
      neg: "#a7382c",
      posSoft: "#b6faa2",
      negSoft: "#ffe2dd",
      warn: "#885200",
      warnSoft: "#ffe3ca",
      primary: "#be0b08",
      onPrimary: "#ffffff",
      primaryContainer: "#ffdad5",
      onPrimaryContainer: "#410000",
      secondary: "#8b4d44",
      onSecondary: "#ffffff",
      secondaryContainer: "#ffdad5",
      onSecondaryContainer: "#380c07",
      tertiary: "#9a452a",
      onTertiary: "#ffffff",
      tertiaryContainer: "#ffdbd0",
      onTertiaryContainer: "#3a0b00",
      error: "#ba1a1a",
      onError: "#ffffff",
      errorContainer: "#ffdad6",
      onErrorContainer: "#410002",
      surfaceDim: "#e4d7d5",
      surfaceBright: "#fff8f6",
      surfaceContainerLowest: "#ffffff",
      surfaceContainerLow: "#fef1ee",
      surfaceContainer: "#f8ebe9",
      surfaceContainerHigh: "#f3e5e3",
      surfaceContainerHighest: "#ede0de",
      onSurface: "#201a19",
      onSurfaceVariant: "#534341",
      outline: "#857370",
      outlineVariant: "#d8c2be",
      inverseSurface: "#362f2e",
      inverseOnSurface: "#fbeeec",
      inversePrimary: "#ffb4a9",
      scrim: "rgba(0, 0, 0, 0.4)",
    },
    dark: {
      bg: "#181211",
      surface: "#251e1d",
      surfaceAlt: "#2f2827",
      line: "#3b2d2b",
      lineStrong: "#534341",
      ink: "#ede0de",
      inkSoft: "#d8c2be",
      inkMuted: "#bba7a3",
      accent: "#ffb4a9",
      accentInk: "#ffdad5",
      accentSoft: "#6f362e",
      onAccent: "#690001",
      pos: "#96d784",
      neg: "#ffb4a9",
      posSoft: "#064603",
      negSoft: "#76140d",
      warn: "#ffb868",
      warnSoft: "#573300",
      primary: "#ffb4a9",
      onPrimary: "#690001",
      primaryContainer: "#930002",
      onPrimaryContainer: "#ffdad5",
      secondary: "#ffb4a9",
      onSecondary: "#53211a",
      secondaryContainer: "#6f362e",
      onSecondaryContainer: "#ffdad5",
      tertiary: "#ffb59e",
      onTertiary: "#5d1802",
      tertiaryContainer: "#7b2e15",
      onTertiaryContainer: "#ffdbd0",
      error: "#ffb4ab",
      onError: "#690005",
      errorContainer: "#93000a",
      onErrorContainer: "#ffdad6",
      surfaceDim: "#181211",
      surfaceBright: "#3f3736",
      surfaceContainerLowest: "#120d0c",
      surfaceContainerLow: "#201a19",
      surfaceContainer: "#251e1d",
      surfaceContainerHigh: "#2f2827",
      surfaceContainerHighest: "#3b3332",
      onSurface: "#ede0de",
      onSurfaceVariant: "#d8c2be",
      outline: "#a08c89",
      outlineVariant: "#534341",
      inverseSurface: "#ede0de",
      inverseOnSurface: "#362f2e",
      inversePrimary: "#be0b08",
      scrim: "rgba(0, 0, 0, 0.6)",
    },
  },
  purple: {
    light: {
      bg: "#f4eff4",
      surface: "#ffffff",
      surfaceAlt: "#ece7eb",
      line: "#e6e0ec",
      lineStrong: "#cac4cf",
      ink: "#1c1b1e",
      inkSoft: "#48454e",
      inkMuted: "#65626b",
      accent: "#664ab9",
      accentInk: "#4e30a0",
      accentSoft: "#e8deff",
      onAccent: "#ffffff",
      pos: "#006c53",
      neg: "#a7354a",
      posSoft: "#87fed6",
      negSoft: "#ffe1e3",
      warn: "#885200",
      warnSoft: "#ffe3ca",
      primary: "#664ab9",
      onPrimary: "#ffffff",
      primaryContainer: "#e8deff",
      onPrimaryContainer: "#20005f",
      secondary: "#615a77",
      onSecondary: "#ffffff",
      secondaryContainer: "#e8deff",
      onSecondaryContainer: "#1e1830",
      tertiary: "#7d5261",
      onTertiary: "#ffffff",
      tertiaryContainer: "#ffd9e4",
      onTertiaryContainer: "#31111e",
      error: "#ba1a1a",
      onError: "#ffffff",
      errorContainer: "#ffdad6",
      onErrorContainer: "#410002",
      surfaceDim: "#ddd8dd",
      surfaceBright: "#fdf8fd",
      surfaceContainerLowest: "#ffffff",
      surfaceContainerLow: "#f7f2f7",
      surfaceContainer: "#f1ecf1",
      surfaceContainerHigh: "#ece7eb",
      surfaceContainerHighest: "#e6e1e6",
      onSurface: "#1c1b1e",
      onSurfaceVariant: "#48454e",
      outline: "#79757f",
      outlineVariant: "#cac4cf",
      inverseSurface: "#313033",
      inverseOnSurface: "#f4eff4",
      inversePrimary: "#cdbdff",
      scrim: "rgba(0, 0, 0, 0.4)",
    },
    dark: {
      bg: "#141316",
      surface: "#201f23",
      surfaceAlt: "#2b292d",
      line: "#322f38",
      lineStrong: "#48454e",
      ink: "#e6e1e6",
      inkSoft: "#cac4cf",
      inkMuted: "#aea9b4",
      accent: "#cdbdff",
      accentInk: "#e8deff",
      accentSoft: "#49435e",
      onAccent: "#371189",
      pos: "#63dbb5",
      neg: "#ffb2b9",
      posSoft: "#004434",
      negSoft: "#770e29",
      warn: "#ffb868",
      warnSoft: "#573300",
      primary: "#cdbdff",
      onPrimary: "#371189",
      primaryContainer: "#4e30a0",
      onPrimaryContainer: "#e8deff",
      secondary: "#cbc2e3",
      onSecondary: "#332d47",
      secondaryContainer: "#49435e",
      onSecondaryContainer: "#e8deff",
      tertiary: "#eeb8c9",
      onTertiary: "#492533",
      tertiaryContainer: "#633b49",
      onTertiaryContainer: "#ffd9e4",
      error: "#ffb4ab",
      onError: "#690005",
      errorContainer: "#93000a",
      onErrorContainer: "#ffdad6",
      surfaceDim: "#141316",
      surfaceBright: "#3a383c",
      surfaceContainerLowest: "#0f0e11",
      surfaceContainerLow: "#1c1b1e",
      surfaceContainer: "#201f23",
      surfaceContainerHigh: "#2b292d",
      surfaceContainerHighest: "#363438",
      onSurface: "#e6e1e6",
      onSurfaceVariant: "#cac4cf",
      outline: "#938f99",
      outlineVariant: "#48454e",
      inverseSurface: "#e6e1e6",
      inverseOnSurface: "#313033",
      inversePrimary: "#664ab9",
      scrim: "rgba(0, 0, 0, 0.6)",
    },
  },
  green: {
    light: {
      bg: "#f6f1da",
      surface: "#ffffff",
      surfaceAlt: "#ede9d2",
      line: "#e8e3c3",
      lineStrong: "#ccc7a8",
      ink: "#1d1c0e",
      inkSoft: "#4a4830",
      inkMuted: "#67644a",
      accent: "#4b6700",
      accentInk: "#384e00",
      accentSoft: "#d8eaae",
      onAccent: "#ffffff",
      pos: "#306b25",
      neg: "#a33e01",
      posSoft: "#b6faa2",
      negSoft: "#ffe2d7",
      warn: "#6f5d00",
      warnSoft: "#ffe88e",
      primary: "#4b6700",
      onPrimary: "#ffffff",
      primaryContainer: "#bbf62d",
      onPrimaryContainer: "#141f00",
      secondary: "#556435",
      onSecondary: "#ffffff",
      secondaryContainer: "#d8eaae",
      onSecondaryContainer: "#141f00",
      tertiary: "#396660",
      onTertiary: "#ffffff",
      tertiaryContainer: "#bcece4",
      onTertiaryContainer: "#00201d",
      error: "#ba1a1a",
      onError: "#ffffff",
      errorContainer: "#ffdad6",
      onErrorContainer: "#410002",
      surfaceDim: "#dfdac4",
      surfaceBright: "#fffae2",
      surfaceContainerLowest: "#ffffff",
      surfaceContainerLow: "#f9f4dd",
      surfaceContainer: "#f3eed7",
      surfaceContainerHigh: "#ede9d2",
      surfaceContainerHighest: "#e7e3cc",
      onSurface: "#1d1c0e",
      onSurfaceVariant: "#4a4830",
      outline: "#7b785d",
      outlineVariant: "#ccc7a8",
      inverseSurface: "#323121",
      inverseOnSurface: "#f6f1da",
      inversePrimary: "#a0d800",
      scrim: "rgba(0, 0, 0, 0.4)",
    },
    dark: {
      bg: "#151407",
      surface: "#212012",
      surfaceAlt: "#2c2a1b",
      line: "#33311b",
      lineStrong: "#4a4830",
      ink: "#e7e3cc",
      inkSoft: "#ccc7a8",
      inkMuted: "#b0ac8e",
      accent: "#a0d800",
      accentInk: "#bbf62d",
      accentSoft: "#3e4c20",
      onAccent: "#253500",
      pos: "#96d784",
      neg: "#ffb596",
      posSoft: "#064603",
      negSoft: "#6a2600",
      warn: "#e2c54b",
      warnSoft: "#473b00",
      primary: "#a0d800",
      onPrimary: "#253500",
      primaryContainer: "#384e00",
      onPrimaryContainer: "#bbf62d",
      secondary: "#bccd94",
      onSecondary: "#28350b",
      secondaryContainer: "#3e4c20",
      onSecondaryContainer: "#d8eaae",
      tertiary: "#a0d0c8",
      onTertiary: "#013732",
      tertiaryContainer: "#204e48",
      onTertiaryContainer: "#bcece4",
      error: "#ffb4ab",
      onError: "#690005",
      errorContainer: "#93000a",
      onErrorContainer: "#ffdad6",
      surfaceDim: "#151407",
      surfaceBright: "#3b3a2a",
      surfaceContainerLowest: "#0f0f04",
      surfaceContainerLow: "#1d1c0e",
      surfaceContainer: "#212012",
      surfaceContainerHigh: "#2c2a1b",
      surfaceContainerHighest: "#373526",
      onSurface: "#e7e3cc",
      onSurfaceVariant: "#ccc7a8",
      outline: "#959275",
      outlineVariant: "#4a4830",
      inverseSurface: "#e7e3cc",
      inverseOnSurface: "#323121",
      inversePrimary: "#4b6700",
      scrim: "rgba(0, 0, 0, 0.6)",
    },
  },
  turquoise: {
    light: {
      bg: "#f9efe3",
      surface: "#ffffff",
      surfaceAlt: "#f0e7db",
      line: "#eee1cc",
      lineStrong: "#d1c5b1",
      ink: "#1f1b14",
      inkSoft: "#4e4636",
      inkMuted: "#6b6251",
      accent: "#006781",
      accentInk: "#004d62",
      accentSoft: "#cfe6f1",
      onAccent: "#ffffff",
      pos: "#006c53",
      neg: "#a7354a",
      posSoft: "#87fed6",
      negSoft: "#ffe1e3",
      warn: "#6f5d00",
      warnSoft: "#ffe88e",
      primary: "#006781",
      onPrimary: "#ffffff",
      primaryContainer: "#b9eaff",
      onPrimaryContainer: "#001f29",
      secondary: "#4c626b",
      onSecondary: "#ffffff",
      secondaryContainer: "#cfe6f1",
      onSecondaryContainer: "#071e26",
      tertiary: "#71537d",
      onTertiary: "#ffffff",
      tertiaryContainer: "#f7d8ff",
      onTertiaryContainer: "#2a1036",
      error: "#ba1a1a",
      onError: "#ffffff",
      errorContainer: "#ffdad6",
      onErrorContainer: "#410002",
      surfaceDim: "#e1d9cd",
      surfaceBright: "#fff8f2",
      surfaceContainerLowest: "#ffffff",
      surfaceContainerLow: "#fbf2e6",
      surfaceContainer: "#f6ede1",
      surfaceContainerHigh: "#f0e7db",
      surfaceContainerHighest: "#eae1d5",
      onSurface: "#1f1b14",
      onSurfaceVariant: "#4e4636",
      outline: "#807664",
      outlineVariant: "#d1c5b1",
      inverseSurface: "#343028",
      inverseOnSurface: "#f9efe3",
      inversePrimary: "#5fd4fd",
      scrim: "rgba(0, 0, 0, 0.4)",
    },
    dark: {
      bg: "#16130c",
      surface: "#231f18",
      surfaceAlt: "#2e2922",
      line: "#373021",
      lineStrong: "#4e4636",
      ink: "#eae1d5",
      inkSoft: "#d1c5b1",
      inkMuted: "#b5aa96",
      accent: "#5fd4fd",
      accentInk: "#b9eaff",
      accentSoft: "#354a53",
      onAccent: "#003544",
      pos: "#63dbb5",
      neg: "#ffb2b9",
      posSoft: "#004434",
      negSoft: "#770e29",
      warn: "#e2c54b",
      warnSoft: "#473b00",
      primary: "#5fd4fd",
      onPrimary: "#003544",
      primaryContainer: "#004d62",
      onPrimaryContainer: "#b9eaff",
      secondary: "#b3cad5",
      onSecondary: "#1e333c",
      secondaryContainer: "#354a53",
      onSecondaryContainer: "#cfe6f1",
      tertiary: "#dfbaea",
      onTertiary: "#40264c",
      tertiaryContainer: "#583c64",
      onTertiaryContainer: "#f7d8ff",
      error: "#ffb4ab",
      onError: "#690005",
      errorContainer: "#93000a",
      onErrorContainer: "#ffdad6",
      surfaceDim: "#16130c",
      surfaceBright: "#3d3930",
      surfaceContainerLowest: "#110e07",
      surfaceContainerLow: "#1f1b14",
      surfaceContainer: "#231f18",
      surfaceContainerHigh: "#2e2922",
      surfaceContainerHighest: "#39342c",
      onSurface: "#eae1d5",
      onSurfaceVariant: "#d1c5b1",
      outline: "#9a8f7d",
      outlineVariant: "#4e4636",
      inverseSurface: "#eae1d5",
      inverseOnSurface: "#343028",
      inversePrimary: "#006781",
      scrim: "rgba(0, 0, 0, 0.6)",
    },
  },
};

// ── Typography ──────────────────────────────────────────────────────────
// Google Sans Flex (static 400/500/600/700 instances, OFL) — the family used
// across Google's Material 3 products. Its default figures are proportional;
// money uses `fontVariant: ['tabular-nums']` (the font ships `tnum`) so
// columns of amounts line up.
const FONT_REGULAR = "GoogleSansFlex_400Regular";
const FONT_MEDIUM = "GoogleSansFlex_500Medium";
const FONT_SEMIBOLD = "GoogleSansFlex_600SemiBold";
const FONT_BOLD = "GoogleSansFlex_700Bold";

export const FMFonts = {
  /** Hero balances / display numbers. */
  display: FONT_REGULAR,
  displayItalic: FONT_REGULAR,
  sans: FONT_REGULAR,
  sansMedium: FONT_MEDIUM,
  sansSemibold: FONT_SEMIBOLD,
  sansBold: FONT_BOLD,
  /** Numbers: pair with fontVariant: ['tabular-nums']. */
  mono: FONT_REGULAR,
  monoMedium: FONT_MEDIUM,
  monoSemibold: FONT_SEMIBOLD,
} as const;

// Size scale (kept from §2.1 so existing layouts stay stable). The M3 type
// roles below map onto it; new UI should prefer the roles.
//   micro 11 = M3 labelSmall · caption 12 = bodySmall/labelMedium
//   body 14 = bodyMedium/labelLarge/titleSmall · subhead 16 = bodyLarge/titleMedium
//   h1 22 = titleLarge
export const FMType = {
  micro: 11,
  caption: 12,
  small: 13,
  body: 14,
  bodyLg: 15,
  subhead: 16,
  title: 17,
  heading: 18,
  h2: 20,
  h1: 22,
} as const;

type RoleStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
};

/** M3 type roles (sizes per the M3 spec, body never below 14 except bodySmall). */
export const FMTypeRole = {
  displaySmall: { fontFamily: FONT_REGULAR, fontSize: 36, lineHeight: 44, letterSpacing: 0 },
  headlineLarge: { fontFamily: FONT_REGULAR, fontSize: 32, lineHeight: 40, letterSpacing: 0 },
  headlineMedium: { fontFamily: FONT_REGULAR, fontSize: 28, lineHeight: 36, letterSpacing: 0 },
  headlineSmall: { fontFamily: FONT_REGULAR, fontSize: 24, lineHeight: 32, letterSpacing: 0 },
  titleLarge: { fontFamily: FONT_REGULAR, fontSize: 22, lineHeight: 28, letterSpacing: 0 },
  titleMedium: { fontFamily: FONT_MEDIUM, fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  titleSmall: { fontFamily: FONT_MEDIUM, fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  bodyLarge: { fontFamily: FONT_REGULAR, fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  bodyMedium: { fontFamily: FONT_REGULAR, fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  bodySmall: { fontFamily: FONT_REGULAR, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  labelLarge: { fontFamily: FONT_MEDIUM, fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  labelMedium: { fontFamily: FONT_MEDIUM, fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
  labelSmall: { fontFamily: FONT_MEDIUM, fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
} satisfies Record<string, RoleStyle>;

// ── Shape ───────────────────────────────────────────────────────────────
// M3 shape scale. Buttons/FAB-extended/badges are fully rounded; chips and
// text fields small; cards medium/large; sheets and dialogs extra-large.
export const FMRadius = {
  xs: 4, // tooltips, snackbars, tiny badges
  sm: 8, // chips, text fields, menus
  md: 12, // cards, list containers, small FAB
  lg: 16, // large cards, FAB, nav drawer items
  xl: 28, // dialogs, bottom sheets (top corners), search bar
  full: 999, // buttons, segmented buttons, nav indicator
} as const;

// ── State layers ────────────────────────────────────────────────────────
// Opacity of the foreground colour laid over a container on interaction.
export const FMState = {
  hover: 0.08,
  focus: 0.1,
  pressed: 0.1,
  dragged: 0.16,
  disabledContainer: 0.12,
  disabledContent: 0.38,
} as const;

// Minimum interactive size. 44pt (Apple HIG) on touch layouts; desktop
// controls can be denser but should not drop below 32.
export const FMHit = {
  touch: 44,
  desktop: 32,
} as const;

// 4dp grid. Use these for padding/gaps; odd literals are a smell.
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
} as const;
