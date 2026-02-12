import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { AccountsProvider } from "../context/AccountsContext";
import { CategoriesProvider } from "../context/CategoriesContext";
import { DebtsProvider } from "../context/DebtsContext";
import { SettingsProvider } from "../context/SettingsContext";
import { useColorScheme } from "../hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SettingsProvider>
      <AccountsProvider>
        <CategoriesProvider>
          <DebtsProvider>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </DebtsProvider>
        </CategoriesProvider>
      </AccountsProvider>
    </SettingsProvider>
  );
}
