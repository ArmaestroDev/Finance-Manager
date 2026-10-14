import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Strings } from "../../constants/Strings";
import type { ThemePalette } from "../../constants/theme";
import {
  OLLAMA_DEFAULT_MODEL,
  OLLAMA_DEFAULT_URL,
  type AiConfig,
  type AiProvider,
} from "../../features/transactions/utils/aiProviders";

export type { AiProvider };

type Language = "en" | "de";
export type ThemeAppearance = "system" | "light" | "dark";

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
  /** Base URL of the local Ollama server. */
  ollamaUrl: string;
  ollamaModel: string;
  /** Provider + keys + Ollama target, for callAiProvider. */
  aiConfig: AiConfig;
  language: Language;
  mainAccountId: string | null;
  theme: ThemeAppearance;
  palette: ThemePalette;
  /** False until the persisted settings have been read from storage. */
  isLoaded: boolean;
  toggleBalanceHidden: (pin?: string) => Promise<boolean>;
  setPin: (newPin: string) => Promise<void>;
  verifyPin: (pin: string) => boolean;
  setGeminiApiKey: (key: string) => Promise<void>;
  setClaudeApiKey: (key: string) => Promise<void>;
  setAiProvider: (provider: AiProvider) => Promise<void>;
  setOllamaUrl: (url: string) => Promise<void>;
  setOllamaModel: (model: string) => Promise<void>;
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
  OLLAMA_URL: "settings_ollama_url",
  OLLAMA_MODEL: "settings_ollama_model",
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
  const [ollamaUrl, setOllamaUrlState] = useState(OLLAMA_DEFAULT_URL);
  const [ollamaModel, setOllamaModelState] = useState(OLLAMA_DEFAULT_MODEL);
  const [language, setLanguageState] = useState<Language>("de");
  const [mainAccountId, setMainAccountIdState] = useState<string | null>(null);
  const [theme, setThemeState] = useState<ThemeAppearance>("system");
  const [palette, setPaletteState] = useState<ThemePalette>("mulberry");
  const [isLoaded, setIsLoaded] = useState(false);

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
        storedOllamaUrl,
        storedOllamaModel,
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
        AsyncStorage.getItem(STORAGE_KEYS.OLLAMA_URL),
        AsyncStorage.getItem(STORAGE_KEYS.OLLAMA_MODEL),
      ]);
      setIsBalanceHidden(hidden === "true");
      setUserPin(pin);
      setGeminiApiKeyState(apiKey);
      setClaudeApiKeyState(claudeKey);
      if (provider === "gemini" || provider === "claude" || provider === "ollama" || provider === "browser") {
        setAiProviderState(provider);
      }
      if (storedOllamaUrl) setOllamaUrlState(storedOllamaUrl);
      if (storedOllamaModel) setOllamaModelState(storedOllamaModel);
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
      setIsLoaded(true);
    }
  };

  const setPin = async (newPin: string) => {
    // Number() accepted "1e3 ", " 1234", "-1234", "1.234" as "digits".
    if (!/^\d{5}$/.test(newPin)) {
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

  const setOllamaUrl = async (url: string) => {
    const value = url.trim() || OLLAMA_DEFAULT_URL;
    await AsyncStorage.setItem(STORAGE_KEYS.OLLAMA_URL, value);
    setOllamaUrlState(value);
  };

  const setOllamaModel = async (model: string) => {
    const value = model.trim() || OLLAMA_DEFAULT_MODEL;
    await AsyncStorage.setItem(STORAGE_KEYS.OLLAMA_MODEL, value);
    setOllamaModelState(value);
  };

  const aiConfig = useMemo<AiConfig>(
    () => ({ provider: aiProvider, geminiApiKey, claudeApiKey, ollamaUrl, ollamaModel }),
    [aiProvider, geminiApiKey, claudeApiKey, ollamaUrl, ollamaModel],
  );

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
        ollamaUrl,
        ollamaModel,
        aiConfig,
        language,
        mainAccountId,
        theme,
        palette,
        isLoaded,
        toggleBalanceHidden,
        setPin,
        verifyPin,
        setGeminiApiKey,
        setClaudeApiKey,
        setAiProvider,
        setOllamaUrl,
        setOllamaModel,
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
