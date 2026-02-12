import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSettings } from "../../context/SettingsContext"; // Added import
import { useThemeColor } from "../../hooks/use-theme-color";
import {
    createSession,
    getASPSPs,
    startAuth,
    type Account,
} from "../../services/enableBanking";

const SESSIONS_KEY = "enablebanking_sessions";

interface StoredSession {
  sessionId: string;
  bankName: string;
  bankCountry: string;
  accounts: Account[];
  connectedAt: string;
}

interface ASPSP {
  name: string;
  country: string;
  logo?: string;
}

export default function ConnectionsScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const { i18n } = useSettings(); // Added hook

  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

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
          return;
        }

        if (code) {
          handleAuthCode(code);
        }
      } catch (e) {
        console.log("Error parsing URL:", e);
      }
    };

    // Check initial URL (Cold start)
    Linking.getInitialURL().then(handleUrl);

    // Listen for runtime updates
    const subscription = Linking.addEventListener("url", (event) =>
      handleUrl(event.url),
    );
    return () => subscription.remove();
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
      const authData = await startAuth(bank.name, bank.country);
      await WebBrowser.openBrowserAsync(authData.url);
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

  const renderSession = ({ item }: { item: StoredSession }) => (
    <View style={[styles.sessionCard, { backgroundColor: tintColor + "12" }]}>
      <View style={styles.sessionHeader}>
        <Text style={[styles.bankName, { color: textColor }]}>
          🏦 {item.bankName}
        </Text>
        <TouchableOpacity onPress={() => removeSession(item.sessionId)}>
          <Text style={[styles.removeText, { color: "#FF6B6B" }]}>
            {i18n.remove}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.accountCount, { color: textColor, opacity: 0.6 }]}>
        {i18n.connected_account_count.replace(
          "{count}",
          item.accounts.length.toString(),
        )}
      </Text>
      {item.accounts.map((acc, i) => (
        <View key={i} style={styles.accountItem}>
          <Text style={[styles.iban, { color: textColor, opacity: 0.8 }]}>
            {acc.account_id?.iban || acc.name || "Account"}
          </Text>
          {acc.currency && (
            <Text style={[styles.currency, { color: tintColor }]}>
              {acc.currency}
            </Text>
          )}
        </View>
      ))}
      <Text style={[styles.connectedDate, { color: textColor, opacity: 0.4 }]}>
        {i18n.connected_date.replace(
          "{date}",
          new Date(item.connectedAt).toLocaleDateString(),
        )}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Modal
        visible={isBankModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBankModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {i18n.select_bank_title}
              </Text>
              <TouchableOpacity
                onPress={() => setBankModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.searchContainer,
                { backgroundColor: tintColor + "10" },
              ]}
            >
              <Ionicons name="search" size={20} color={textColor} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder={i18n.search_bank_placeholder}
                placeholderTextColor={textColor + "50"}
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>

            {loadingBanks ? (
              <ActivityIndicator size="large" color={tintColor} />
            ) : (
              <FlatList
                data={filteredBanks}
                keyExtractor={(item) => item.name}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.bankItem}
                    onPress={() => handleSelectBank(item)}
                  >
                    <Text style={[styles.bankItemName, { color: textColor }]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Text style={[styles.title, { color: textColor }]}>
        {i18n.connections_title}
      </Text>
      <Text style={[styles.subtitle, { color: textColor, opacity: 0.6 }]}>
        {i18n.connections_subtitle}
      </Text>

      {sessions.length > 0 && (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.sessionId}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}

      {sessions.length === 0 && !connecting && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: textColor, opacity: 0.5 }]}>
            {i18n.no_connections}
          </Text>
        </View>
      )}

      {connecting && !showManualInput ? (
        <View style={styles.connectingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <Text style={[styles.connectingText, { color: textColor }]}>
            {i18n.connecting}
          </Text>
          <TouchableOpacity
            onPress={() => setShowManualInput(true)}
            style={{ marginTop: 20 }}
          >
            <Text style={{ color: tintColor, fontSize: 14, fontWeight: "500" }}>
              {i18n.have_code_btn}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: tintColor }]}
            onPress={openBankSelection}
          >
            <Text
              style={[styles.connectButtonText, { color: backgroundColor }]}
            >
              {i18n.connect_bank_btn}
            </Text>
          </TouchableOpacity>

          {showManualInput && (
            <View style={styles.manualInputContainer}>
              <Text style={[styles.manualHint, { color: textColor }]}>
                {i18n.manual_code_hint}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: textColor, borderColor: tintColor },
                ]}
                placeholder="Paste code here..."
                placeholderTextColor="#999"
                value={manualCode}
                onChangeText={setManualCode}
              />
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: tintColor }]}
                onPress={() => handleAuthCode(manualCode)}
                disabled={!manualCode}
              >
                <Text
                  style={[styles.submitButtonText, { color: backgroundColor }]}
                >
                  {i18n.submit_code}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 12,
  },
  sessionCard: {
    borderRadius: 16,
    padding: 16,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bankName: {
    fontSize: 18,
    fontWeight: "600",
  },
  removeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  accountCount: {
    fontSize: 13,
    marginBottom: 12,
  },
  accountItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  iban: {
    fontSize: 14,
    fontFamily: "monospace",
  },
  currency: {
    fontSize: 13,
    fontWeight: "600",
  },
  connectedDate: {
    fontSize: 12,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
  connectingContainer: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 12,
  },
  connectingText: {
    fontSize: 15,
  },
  connectButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  connectButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  manualInputContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(150, 150, 150, 0.1)",
  },
  manualHint: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingTop: 100, // Leave space at top
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    height: "100%",
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.1)",
  },
  bankItemName: {
    fontSize: 16,
    fontWeight: "500",
  },
});
