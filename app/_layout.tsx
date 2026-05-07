import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

import { AccountsProvider } from "../src/features/accounts/context/AccountsContext";
import { CategoriesProvider } from "../src/features/transactions/context/CategoriesContext";
import { DebtsProvider } from "../src/features/debts/context/DebtsContext";
import { ImportQueueProvider } from "../src/features/import/context/ImportQueueContext";
import { BankStatementsProvider } from "../src/features/import/context/BankStatementsContext";
import { ImportQueueOverlay } from "../src/features/import/components/ImportQueueOverlay";
import { QuickAddSheetProvider } from "../src/shared/components/QuickAddSheet";
import { SearchSheetProvider } from "../src/shared/components/SearchSheet";
import { SettingsProvider } from "../src/shared/context/SettingsContext";
import { DateFilterProvider } from "../src/shared/context/DateFilterContext";
import { TransactionsProvider } from "../src/features/transactions/context/TransactionsContext";
import { useColorScheme } from "../src/shared/hooks/use-color-scheme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutInner() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <QuickAddSheetProvider>
        <SearchSheetProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="connections" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="account/[id]" />
          </Stack>
          <ImportQueueOverlay />
        </SearchSheetProvider>
      </QuickAddSheetProvider>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  // Hide scrollbars on web while keeping scroll functionality
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const style = document.createElement("style");
      style.textContent = `
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }
        html, body, #root { background: #f7f6f3; }
        @media (prefers-color-scheme: dark) {
          html, body, #root { background: #0f0e0c; }
        }
      `;
      document.head.appendChild(style);
      return () => { document.head.removeChild(style); };
    }
  }, []);

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

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <DateFilterProvider>
          <AccountsProvider>
            <CategoriesProvider>
              <DebtsProvider>
                <TransactionsProvider>
                  <BankStatementsProvider>
                    <ImportQueueProvider>
                      <RootLayoutInner />
                    </ImportQueueProvider>
                  </BankStatementsProvider>
                </TransactionsProvider>
              </DebtsProvider>
            </CategoriesProvider>
          </AccountsProvider>
        </DateFilterProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
