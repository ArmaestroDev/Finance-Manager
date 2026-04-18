import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Strings } from "../../constants/Strings";

type Language = "en" | "de";
export type ThemeAppearance = "system" | "light" | "dark";

interface SettingsContextType {
  isBalanceHidden: boolean;
  userPin: string | null;
  geminiApiKey: string | null;
  language: Language;
  mainAccountId: string | null;
  theme: ThemeAppearance;
  toggleBalanceHidden: (pin?: string) => Promise<boolean>;
  setPin: (newPin: string) => Promise<void>;
  verifyPin: (pin: string) => boolean;
  setGeminiApiKey: (key: string) => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  setMainAccountId: (id: string) => Promise<void>;
  setTheme: (newTheme: ThemeAppearance) => Promise<void>;
  i18n: typeof Strings.de;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

const STORAGE_KEYS = {
  BALANCE_HIDDEN: "settings_balance_hidden",
  USER_PIN: "settings_user_pin",
  GEMINI_API_KEY: "settings_gemini_api_key",
  LANGUAGE: "settings_language",
  MAIN_ACCOUNT_ID: "settings_main_account_id",
  THEME: "settings_theme",
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [userPin, setUserPin] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKeyState] = useState<string | null>(null);
  const [language, setLanguageState] = useState<Language>("de");
  const [mainAccountId, setMainAccountIdState] = useState<string | null>(null);
  const [theme, setThemeState] = useState<ThemeAppearance>("system");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [hidden, pin, apiKey, lang, mainAcc, storedTheme] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.BALANCE_HIDDEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PIN),
        AsyncStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY),
        AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
        AsyncStorage.getItem(STORAGE_KEYS.MAIN_ACCOUNT_ID),
        AsyncStorage.getItem(STORAGE_KEYS.THEME),
      ]);
      setIsBalanceHidden(hidden === "true");
      setUserPin(pin);
      setGeminiApiKeyState(apiKey);
      if (lang === "en" || lang === "de") {
        setLanguageState(lang);
      }
      setMainAccountIdState(mainAcc);
      if (storedTheme === "system" || storedTheme === "light" || storedTheme === "dark") {
        setThemeState(storedTheme as ThemeAppearance);
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
        language,
        mainAccountId,
        theme,
        toggleBalanceHidden,
        setPin,
        verifyPin,
        setGeminiApiKey,
        setLanguage,
        setMainAccountId,
        setTheme,
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
