import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import {
  GoogleSansFlex_400Regular,
  GoogleSansFlex_500Medium,
  GoogleSansFlex_600SemiBold,
  GoogleSansFlex_700Bold,
} from "@expo-google-fonts/google-sans-flex";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

import { AccountsProvider } from "../src/features/accounts/context/AccountsContext";
import { CategoriesProvider } from "../src/features/transactions/context/CategoriesContext";
import { DebtsProvider } from "../src/features/debts/context/DebtsContext";
import { TransactionLinksProvider } from "../src/features/transactions/context/TransactionLinksContext";
import { ImportQueueProvider } from "../src/features/import/context/ImportQueueContext";
import { BankStatementsProvider } from "../src/features/import/context/BankStatementsContext";
import { ImportQueueOverlay } from "../src/features/import/components/ImportQueueOverlay";
import { QuickAddSheetProvider } from "../src/shared/components/QuickAddSheet";
import { SearchSheetProvider } from "../src/shared/components/SearchSheet";
import { SettingsProvider, useSettings } from "../src/shared/context/SettingsContext";
import { DateFilterProvider } from "../src/shared/context/DateFilterContext";
import { TransactionsProvider } from "../src/features/transactions/context/TransactionsContext";
import { useColorScheme } from "../src/shared/hooks/use-color-scheme";
import { useFMTheme } from "../src/shared/design/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Bank-auth redirect params present in the URL the page was opened with.
const readAuthRedirect = (): { code: string | null; error: string | null } | null => {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const error = params.get("error");
  return code || error ? { code, error } : null;
};

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const { i18n, isLoaded } = useSettings();
  const t = useFMTheme();
  const router = useRouter();
  const pathname = usePathname();

  // Keep the splash screen up until the persisted theme/language are known,
  // otherwise the default (light / German) UI flashes before the user's choice.
  useEffect(() => {
    if (isLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [isLoaded]);

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.title = i18n.app_title;
    }
  }, [i18n.app_title]);

  // Match the page background to the active palette so overscroll / gaps
  // don't show the static light/dark fallback colour.
  useEffect(() => {
    if (!isLoaded || Platform.OS !== "web" || typeof document === "undefined") return;
    document.documentElement.style.background = t.bg;
    document.body.style.background = t.bg;
  }, [isLoaded, t.bg]);

  // The bank redirects to the app's root URL. In a popup, RootLayout hands
  // the result to the opener; without one (popup opened as a tab, or the auth
  // link was opened directly) the result lands here in the main window, and
  // only the connections screen knows how to exchange the code — route there.
  // useBankConnections reads it via Linking.getInitialURL().
  useEffect(() => {
    if (!isLoaded || pathname === "/connections") return;
    const hasOpener = typeof window !== "undefined" && !!window.opener;
    if (!hasOpener && readAuthRedirect()) router.replace("/connections");
    // Only on the first render after settings load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  if (!isLoaded) return null;

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
    GoogleSansFlex_400Regular,
    GoogleSansFlex_500Medium,
    GoogleSansFlex_600SemiBold,
    GoogleSansFlex_700Bold,
    ...MaterialCommunityIcons.font,
  });

  // Hide scrollbars on web while keeping scroll functionality
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const style = document.createElement("style");
      style.textContent = `
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }
        html, body, #root { background: #f9eef0; }
        @media (prefers-color-scheme: dark) {
          html, body, #root { background: #171214; }
        }
      `;
      document.head.appendChild(style);
      return () => { document.head.removeChild(style); };
    }
  }, []);

  // Inside the bank-auth popup (e.g. the deployed Vercel app returning to a
  // localhost opener): hand the result to the opener and close. Target origin
  // "*" is deliberate — see DECISIONS.md §1.5.
  useEffect(() => {
    const result = readAuthRedirect();
    if (!result || typeof window === "undefined" || !window.opener) return;
    try {
      window.opener.postMessage({ type: "BANK_AUTH_RESULT", ...result }, "*");
      setTimeout(() => window.close(), 100);
    } catch {
      // Opener gone or inaccessible — the main-window fallback handles it.
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
                  <TransactionLinksProvider>
                    <BankStatementsProvider>
                      <ImportQueueProvider>
                        <RootLayoutInner />
                      </ImportQueueProvider>
                    </BankStatementsProvider>
                  </TransactionLinksProvider>
                </TransactionsProvider>
              </DebtsProvider>
            </CategoriesProvider>
          </AccountsProvider>
        </DateFilterProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
