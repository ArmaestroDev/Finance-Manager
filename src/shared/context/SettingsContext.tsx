import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Strings } from "../../constants/Strings";
import type { ThemePalette } from "../../constants/theme";

type Language = "en" | "de";
export type ThemeAppearance = "system" | "light" | "dark";
export type AiProvider = "gemini" | "claude";

const VALID_PALETTES: readonly ThemePalette[] = [
  "mulberry",
  "red",
  "purple",
  "green",
  "turquoise",
];

interface SettingsContextType {
  isBalanceHidden: boolean;
  userPin: string | null;
  geminiApiKey: string | null;
  claudeApiKey: string | null;
  aiProvider: AiProvider;
  language: Language;
  mainAccountId: string | null;
  theme: ThemeAppearance;
  palette: ThemePalette;
  toggleBalanceHidden: (pin?: string) => Promise<boolean>;
  setPin: (newPin: string) => Promise<void>;
  verifyPin: (pin: string) => boolean;
  setGeminiApiKey: (key: string) => Promise<void>;
  setClaudeApiKey: (key: string) => Promise<void>;
  setAiProvider: (provider: AiProvider) => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  setMainAccountId: (id: string) => Promise<void>;
  setTheme: (newTheme: ThemeAppearance) => Promise<void>;
  setPalette: (newPalette: ThemePalette) => Promise<void>;
  i18n: typeof Strings.de;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

const STORAGE_KEYS = {
  BALANCE_HIDDEN: "settings_balance_hidden",
  USER_PIN: "settings_user_pin",
  GEMINI_API_KEY: "settings_gemini_api_key",
  CLAUDE_API_KEY: "settings_claude_api_key",
  AI_PROVIDER: "settings_ai_provider",
  LANGUAGE: "settings_language",
  MAIN_ACCOUNT_ID: "settings_main_account_id",
  THEME: "settings_theme",
  PALETTE: "settings_palette",
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [userPin, setUserPin] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKeyState] = useState<string | null>(null);
  const [claudeApiKey, setClaudeApiKeyState] = useState<string | null>(null);
  const [aiProvider, setAiProviderState] = useState<AiProvider>("gemini");
  const [language, setLanguageState] = useState<Language>("de");
  const [mainAccountId, setMainAccountIdState] = useState<string | null>(null);
  const [theme, setThemeState] = useState<ThemeAppearance>("system");
  const [palette, setPaletteState] = useState<ThemePalette>("mulberry");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [
        hidden,
        pin,
        apiKey,
        claudeKey,
        provider,
        lang,
        mainAcc,
        storedTheme,
        storedPalette,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.BALANCE_HIDDEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PIN),
        AsyncStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY),
        AsyncStorage.getItem(STORAGE_KEYS.CLAUDE_API_KEY),
        AsyncStorage.getItem(STORAGE_KEYS.AI_PROVIDER),
        AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
        AsyncStorage.getItem(STORAGE_KEYS.MAIN_ACCOUNT_ID),
        AsyncStorage.getItem(STORAGE_KEYS.THEME),
        AsyncStorage.getItem(STORAGE_KEYS.PALETTE),
      ]);
      setIsBalanceHidden(hidden === "true");
      setUserPin(pin);
      setGeminiApiKeyState(apiKey);
      setClaudeApiKeyState(claudeKey);
      if (provider === "gemini" || provider === "claude") {
        setAiProviderState(provider);
      }
      if (lang === "en" || lang === "de") {
        setLanguageState(lang);
      }
      setMainAccountIdState(mainAcc);
      if (storedTheme === "system" || storedTheme === "light" || storedTheme === "dark") {
        setThemeState(storedTheme as ThemeAppearance);
      }
      if (storedPalette && (VALID_PALETTES as readonly string[]).includes(storedPalette)) {
        setPaletteState(storedPalette as ThemePalette);
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    } finally {
      setLoading(false);
    }
  };

  const setPin = async (newPin: string) => {
    if (newPin.length !== 5 || isNaN(Number(newPin))) {
      throw new Error("PIN must be 5 digits");
    }
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PIN, newPin);
    setUserPin(newPin);
  };

  const setGeminiApiKey = async (key: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, key);
    setGeminiApiKeyState(key);
  };

  const setClaudeApiKey = async (key: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.CLAUDE_API_KEY, key);
    setClaudeApiKeyState(key);
  };

  const setAiProvider = async (provider: AiProvider) => {
    await AsyncStorage.setItem(STORAGE_KEYS.AI_PROVIDER, provider);
    setAiProviderState(provider);
  };

  const setLanguage = async (lang: Language) => {
    await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    setLanguageState(lang);
  };

  const setMainAccountId = async (id: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.MAIN_ACCOUNT_ID, id);
    setMainAccountIdState(id);
  };

  const setTheme = async (newTheme: ThemeAppearance) => {
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    setThemeState(newTheme);
  };

  const setPalette = async (newPalette: ThemePalette) => {
    await AsyncStorage.setItem(STORAGE_KEYS.PALETTE, newPalette);
    setPaletteState(newPalette);
  };

  const verifyPin = (pin: string) => {
    return userPin === pin;
  };

  const toggleBalanceHidden = async (pin?: string): Promise<boolean> => {
    if (!isBalanceHidden) {
      const effectivePin = userPin || pin;
      if (!effectivePin) {
        throw new Error("PIN_NOT_SET");
      }
      setIsBalanceHidden(true);
      await AsyncStorage.setItem(STORAGE_KEYS.BALANCE_HIDDEN, "true");
      return true;
    } else {
      if (!pin) throw new Error("PIN_REQUIRED");
      if (verifyPin(pin)) {
        setIsBalanceHidden(false);
        await AsyncStorage.setItem(STORAGE_KEYS.BALANCE_HIDDEN, "false");
        return true;
      }
      return false;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        isBalanceHidden,
        userPin,
        geminiApiKey,
        claudeApiKey,
        aiProvider,
        language,
        mainAccountId,
        theme,
        palette,
        toggleBalanceHidden,
        setPin,
        verifyPin,
        setGeminiApiKey,
        setClaudeApiKey,
        setAiProvider,
        setLanguage,
        setMainAccountId,
        setTheme,
        setPalette,
        i18n: Strings[language],
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
