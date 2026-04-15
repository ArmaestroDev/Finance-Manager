import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { createSession, getASPSPs, startAuth, type Account } from "../../../services/enableBanking";

const SESSIONS_KEY = "enablebanking_sessions";

export interface StoredSession {
  sessionId: string;
  bankName: string;
  bankCountry: string;
  accounts: Account[];
  connectedAt: string;
}

export interface ASPSP {
  name: string;
  country: string;
  logo?: string;
}

export function useBankConnections() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  // Bank Selection State
  const [banks, setBanks] = useState<ASPSP[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<ASPSP[]>([]);
  const [isBankModalVisible, setBankModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Load saved sessions
  useEffect(() => {
    loadSessions();
    loadBanks();
  }, []);

  // Listen for deep link callback (Cold start & Runtime)
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get("code");
        const error = parsed.searchParams.get("error");

        if (error) {
          Alert.alert(
            "Connection Failed",
            parsed.searchParams.get("error_description") || error,
          );
          setConnecting(false);
          setAuthUrl(null);
          return;
        }

        if (code) {
          handleAuthCode(code);
        }
      } catch (e) {
        console.log("Error parsing URL:", e);
      }
    };

    // -- Native Deep Link Listener --
    // Check initial URL (Cold start)
    Linking.getInitialURL().then(handleUrl);

    // Listen for runtime updates
    const subscription = Linking.addEventListener("url", (event) =>
      handleUrl(event.url),
    );

    // -- Web Popup Listener --
    // Listen for messages from the Vercel auth popup
    const handleMessage = (event: MessageEvent) => {
      if (Platform.OS === "web" && event.data && event.data.type === "BANK_AUTH_RESULT") {
        const { code, error } = event.data;
        if (error) {
          Alert.alert("Connection Failed", error);
          setConnecting(false);
          setAuthUrl(null);
        } else if (code) {
          handleAuthCode(code);
        }
      }
    };
    if (Platform.OS === "web") {
      window.addEventListener("message", handleMessage);
    }

    return () => {
      subscription.remove();
      if (Platform.OS === "web") {
        window.removeEventListener("message", handleMessage);
      }
    };
  }, [sessions]);

  const loadBanks = async () => {
    try {
      setLoadingBanks(true);
      // Default to DE for now
      const data = await getASPSPs("DE");
      setBanks(data.aspsps);
      setFilteredBanks(data.aspsps);
    } catch (err) {
      console.error("Failed to load banks:", err);
    } finally {
      setLoadingBanks(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text) {
      setFilteredBanks(banks);
    } else {
      const lower = text.toLowerCase();
      setFilteredBanks(
        banks.filter((b) => b.name.toLowerCase().includes(lower)),
      );
    }
  };

  const handleAuthCode = async (code: string) => {
    try {
      setConnecting(true);
      setShowManualInput(false);
      setAuthUrl(null);
      // Close modal if open
      setBankModalVisible(false);

      const sessionData = await createSession(code);
      const stored: StoredSession = {
        sessionId: sessionData.session_id,
        bankName: sessionData.aspsp.name,
        bankCountry: sessionData.aspsp.country,
        accounts: sessionData.accounts,
        connectedAt: new Date().toISOString(),
      };
      const updated = [...sessions, stored];
      setSessions(updated);
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));

      Alert.alert(
        "Success!",
        `Connected ${sessionData.accounts.length} account(s) from ${sessionData.aspsp.name}`,
      );
      setManualCode("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create session");
    } finally {
      setConnecting(false);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await AsyncStorage.getItem(SESSIONS_KEY);
      if (data) {
        setSessions(JSON.parse(data));
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  const openBankSelection = () => {
    setBankModalVisible(true);
    // Ensure we have banks
    if (banks.length === 0) loadBanks();
  };

  const handleSelectBank = async (bank: ASPSP) => {
    setBankModalVisible(false);
    try {
      setConnecting(true);
      setAuthUrl(null);
      const authData = await startAuth(bank.name, bank.country);

      if (Platform.OS === "web") {
        // Web: Open a popup window directly. The popup will handle the redirect
        // and message back the code using window.opener.postMessage.
        const width = 500;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        window.open(
          authData.url,
          "BankAuth",
          `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
        );
      } else {
        // Native: Open immediately using standard WebBrowser
        await WebBrowser.openBrowserAsync(authData.url);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to start bank connection");
      setConnecting(false);
    }
  };

  const removeSession = async (sessionId: string) => {
    const updated = sessions.filter((s) => s.sessionId !== sessionId);
    setSessions(updated);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  };

  return {
    sessions,
    loading,
    connecting,
    manualCode,
    setManualCode,
    showManualInput,
    setShowManualInput,
    authUrl,
    banks,
    filteredBanks,
    isBankModalVisible,
    setBankModalVisible,
    searchQuery,
    loadingBanks,
    handleSearch,
    handleAuthCode,
    openBankSelection,
    handleSelectBank,
    removeSession,
  };
}
