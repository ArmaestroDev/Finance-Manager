import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import { createSession, getASPSPs, startAuth } from "../../../services/enableBanking";
import { useSettings } from "../../../shared/context/SettingsContext";
import { showAlert } from "../../../shared/utils/alert";
import { useAccounts, type StoredSession } from "../context/AccountsContext";

export type { StoredSession };

export interface ASPSP {
  name: string;
  country: string;
  logo?: string;
}

// Auth codes are single-use. Remembered per page session (module scope, not
// per hook instance): on web, Linking.getInitialURL() keeps returning the URL
// the app was opened with, so every remount of the connections screen would
// otherwise re-submit an already exchanged code and show a bogus error.
const handledCodes = new Set<string>();

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;

export function useBankConnections() {
  const { sessions, saveSession, removeSession } = useAccounts();
  const { i18n } = useSettings();
  // Latest handler for the once-registered listeners below.
  const handleAuthCodeRef = useRef<(code: string) => void>(() => {});
  const handleAuthErrorRef = useRef<(error: string) => void>(() => {});
  const handlingCode = useRef(false);
  const [connecting, setConnecting] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Bank selection
  const [banks, setBanks] = useState<ASPSP[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<ASPSP[]>([]);
  const [isBankModalVisible, setBankModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingBanks, setLoadingBanks] = useState(false);

  const loadBanks = async () => {
    try {
      setLoadingBanks(true);
      // Enable Banking's German institution list.
      const data = await getASPSPs("DE");
      setBanks(data.aspsps);
      setFilteredBanks(data.aspsps);
    } catch (err) {
      console.error("Failed to load banks:", err);
    } finally {
      setLoadingBanks(false);
    }
  };

  useEffect(() => {
    loadBanks();
  }, []);

  // Auth result delivery: deep link (native cold start + runtime), the
  // initial page URL (web redirect into the main window), or a postMessage
  // from the auth popup (web). Registered once; the refs hold the latest
  // handlers so they never see stale state.
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get("code");
        const error = parsed.searchParams.get("error");
        if (error) {
          handleAuthErrorRef.current(parsed.searchParams.get("error_description") || error);
        } else if (code) {
          handleAuthCodeRef.current(code);
        }
      } catch {
        // Not a parseable URL (e.g. a bare scheme) — nothing to handle.
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", (event) => handleUrl(event.url));

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== "BANK_AUTH_RESULT") return;
      const { code, error } = event.data as { code?: string | null; error?: string | null };
      if (error) handleAuthErrorRef.current(error);
      else if (code) handleAuthCodeRef.current(code);
    };
    if (Platform.OS === "web") window.addEventListener("message", handleMessage);

    return () => {
      subscription.remove();
      if (Platform.OS === "web") window.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text) {
      setFilteredBanks(banks);
      return;
    }
    const lower = text.trim().toLowerCase();
    // ING-DiBa is listed by Enable Banking as plain "ING"
    const query = /^ing[\s-]?diba$|^diba$/.test(lower) ? "ing" : lower;
    // Rank: exact name > name starts with query > a word starts with query > substring
    const rank = (name: string) => {
      const n = name.toLowerCase();
      if (n === query) return 0;
      if (n.startsWith(query)) return 1;
      if (n.split(/[\s\-/()]+/).some((w) => w.startsWith(query))) return 2;
      return n.includes(query) ? 3 : -1;
    };
    setFilteredBanks(
      banks
        .map((b) => ({ b, r: rank(b.name) }))
        .filter((x) => x.r >= 0)
        .sort((a, c) => a.r - c.r)
        .map((x) => x.b),
    );
  };

  const handleAuthError = (error: string) => {
    showAlert(i18n.conn_failed_title, error);
    setConnecting(false);
  };

  const handleAuthCode = async (rawCode: string) => {
    const code = (rawCode || "").trim();
    if (!code || handledCodes.has(code)) return;
    handledCodes.add(code);
    handlingCode.current = true;
    try {
      setConnecting(true);
      setShowManualInput(false);
      setBankModalVisible(false);

      const sessionData = await createSession(code);
      await saveSession({
        sessionId: sessionData.session_id,
        bankName: sessionData.aspsp.name,
        bankCountry: sessionData.aspsp.country,
        accounts: sessionData.accounts,
        connectedAt: new Date().toISOString(),
      });

      showAlert(
        i18n.conn_success_title,
        i18n.conn_success_msg
          .replace("{count}", String(sessionData.accounts.length))
          .replace("{bank}", sessionData.aspsp.name),
      );
      setManualCode("");
    } catch (err) {
      // Allow retrying the same code after a transient failure.
      handledCodes.delete(code);
      showAlert(i18n.error_title, errorMessage(err, i18n.conn_session_failed));
    } finally {
      handlingCode.current = false;
      setConnecting(false);
    }
  };

  handleAuthCodeRef.current = handleAuthCode;
  handleAuthErrorRef.current = handleAuthError;

  const openBankSelection = () => {
    setBankModalVisible(true);
    if (banks.length === 0) loadBanks();
  };

  const handleSelectBank = async (bank: ASPSP) => {
    setBankModalVisible(false);
    try {
      setConnecting(true);
      const authData = await startAuth(bank.name, bank.country);

      if (Platform.OS === "web") {
        // The popup is redirected back to the app, whose root layout posts the
        // code to window.opener (see app/_layout.tsx) and closes itself.
        const width = 500;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const popup = window.open(
          authData.url,
          "BankAuth",
          `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`,
        );
        if (!popup) {
          // Blocked by the browser — without this the UI stayed in the
          // "connecting" state forever with nothing on screen.
          setConnecting(false);
          showAlert(i18n.conn_popup_blocked_title, i18n.conn_popup_blocked_msg);
          return;
        }
        // If the user closes the popup without finishing, leave the
        // "connecting" state (a successful result arrives via postMessage
        // before the popup closes itself).
        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            setTimeout(() => setConnecting((c) => (handlingCode.current ? c : false)), 500);
          }
        }, 1000);
      } else {
        await WebBrowser.openBrowserAsync(authData.url);
      }
    } catch (err) {
      showAlert(i18n.error_title, errorMessage(err, i18n.conn_start_failed));
      setConnecting(false);
    }
  };

  return {
    sessions,
    connecting,
    manualCode,
    setManualCode,
    showManualInput,
    setShowManualInput,
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
