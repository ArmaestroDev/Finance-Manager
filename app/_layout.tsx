import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";

import { AccountsProvider } from "../src/features/accounts/context/AccountsContext";
import { CategoriesProvider } from "../src/features/transactions/context/CategoriesContext";
import { DebtsProvider } from "../src/features/debts/context/DebtsContext";
import { SettingsProvider } from "../src/shared/context/SettingsContext";
import { useColorScheme } from "../src/shared/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Watch for auth redirects if opened as a popup (e.g., returning from Bank Auth on Vercel to Localhost)
  useEffect(() => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.opener) {
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get("code");
          const error = urlParams.get("error");
          
          if (code || error) {
            // We are inside a popup and have an auth result! Send it back to the main app.
            // Using '*' for targetOrigin since localhost port might vary, but ideally it should be restricted if possible.
            window.opener.postMessage(
              { type: "BANK_AUTH_RESULT", code, error }, 
              "*"
            );
            // Close the popup automatically
            setTimeout(() => window.close(), 100);
          }
        }
      } catch (e) {
        // Ignore cross-origin constraints if any
      }
    }
  }, []);

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
