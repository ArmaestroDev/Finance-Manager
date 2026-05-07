import { FMColors, FMTheme, ThemeMode, ThemePalette } from "@/src/constants/theme";
import { useColorScheme } from "@/src/shared/hooks/use-color-scheme";
import { useSettings } from "@/src/shared/context/SettingsContext";

export type { FMTheme, ThemeMode, ThemePalette };

export function useFMTheme(): FMTheme {
  const { palette } = useSettings();
  const scheme = useColorScheme();
  const mode: ThemeMode = scheme === "dark" ? "dark" : "light";
  return FMColors[palette][mode];
}

export function useThemeMode(): ThemeMode {
  const scheme = useColorScheme();
  return scheme === "dark" ? "dark" : "light";
}
