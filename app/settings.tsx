import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSettings } from "../src/shared/context/SettingsContext";
import { useThemeColor } from "../src/shared/hooks/use-theme-color";
import { useAccounts } from "../src/features/accounts/context/AccountsContext";

export default function SettingsScreen() {
  const router = useRouter();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");

  const {
    isBalanceHidden,
    userPin,
    setPin,
    toggleBalanceHidden,
    verifyPin,
    geminiApiKey,
    setGeminiApiKey,
    language,
    setLanguage,
    mainAccountId,
    setMainAccountId,
    theme,
    setTheme,
    i18n,
  } = useSettings();

  const { accounts } = useAccounts();

  const [isPinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState<"create" | "verify">("create");
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);

  const [isKeyModalVisible, setKeyModalVisible] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [isLangModalVisible, setLangModalVisible] = useState(false);
  const [isMainAccModalVisible, setMainAccModalVisible] = useState(false);
  const [isThemeModalVisible, setThemeModalVisible] = useState(false);

  const activeMainAccount = accounts.find(a => a.id === mainAccountId) || 
                          accounts.find(a => a.category === "Giro") || 
                          accounts[0];

  const handleToggleBalance = async () => {
    if (isBalanceHidden) {
      setPinMode("verify");
      setPinInput("");
      setPinModalVisible(true);
      setIsChangingPin(false);
    } else {
      if (!userPin) {
        setPinMode("create");
        setPinInput("");
        setPinModalVisible(true);
        setIsChangingPin(false);
      } else {
        try {
          await toggleBalanceHidden();
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handlePinSubmit = async () => {
    if (pinInput.length !== 5) {
      setError("PIN must be 5 digits");
      return;
    }

    try {
      if (pinMode === "verify") {
        const isValid = verifyPin(pinInput);
        if (!isValid) {
          setError("Incorrect PIN");
          return;
        }

        if (isChangingPin) {
          setPinMode("create");
          setPinInput("");
          setError(null);
        } else {
          const success = await toggleBalanceHidden(pinInput);
          if (success) {
            setPinModalVisible(false);
          }
        }
      } else {
        await setPin(pinInput);
        setPinModalVisible(false);
        if (!isChangingPin) {
          await toggleBalanceHidden(pinInput);
        }
        setIsChangingPin(false);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen
        options={{ title: i18n.settings_title, headerBackTitle: "Home" }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {i18n.dashboard_section}
          </Text>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: textColor + "20" }]}
            onPress={() => setMainAccModalVisible(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: textColor }]}>
                {i18n.main_account}
              </Text>
              <Text style={[styles.rowSubLabel, { color: textColor }]}>
                {activeMainAccount ? activeMainAccount.name : i18n.not_set}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={textColor + "80"} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {i18n.language}
          </Text>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: textColor + "20" }]}
            onPress={() => setLangModalVisible(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: textColor }]}>
                {language === "en" ? i18n.english : i18n.german}
              </Text>
              <Text style={[styles.rowSubLabel, { color: textColor }]}>
                {i18n.language_sub}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={textColor + "80"} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {i18n.appearance}
          </Text>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: textColor + "20" }]}
            onPress={() => setThemeModalVisible(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: textColor }]}>
                {theme === "system" ? i18n.theme_system : theme === "dark" ? i18n.theme_dark : i18n.theme_light}
              </Text>
              <Text style={[styles.rowSubLabel, { color: textColor }]}>
                {i18n.appearance_sub}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={textColor + "80"} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {i18n.ai_integration}
          </Text>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: textColor + "20" }]}
            onPress={() => {
              setKeyInput(geminiApiKey || "");
              setKeyModalVisible(true);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: textColor }]}>
                {i18n.gemini_api_key}
              </Text>
              <Text
                style={[
                  styles.rowSubLabel,
                  { color: textColor, opacity: geminiApiKey ? 1 : 0.6 },
                ]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {geminiApiKey
                  ? "••••••••" + geminiApiKey.slice(-4)
                  : i18n.not_set}
              </Text>
            </View>
            <Ionicons name="create-outline" size={20} color={textColor + "80"} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {i18n.privacy}
          </Text>

          <View style={[styles.row, { borderBottomColor: textColor + "20" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: textColor }]}>
                {i18n.hide_total}
              </Text>
              <Text style={[styles.rowSubLabel, { color: textColor }]}>
                {i18n.hide_total_sub}
              </Text>
            </View>
            <Switch
              value={isBalanceHidden}
              onValueChange={handleToggleBalance}
              trackColor={{ false: "#767577", true: tintColor }}
              thumbColor={"#f4f3f4"}
            />
          </View>

          <TouchableOpacity
            style={[styles.row, { borderBottomColor: textColor + "20" }]}
            onPress={() => {
              if (userPin) {
                setPinMode("verify");
                setIsChangingPin(true);
              } else {
                setPinMode("create");
                setIsChangingPin(false);
              }
              setPinInput("");
              setPinModalVisible(true);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: textColor }]}>
                {userPin ? i18n.change_pin : i18n.set_privacy_pin}
              </Text>
              <Text style={[styles.rowSubLabel, { color: textColor }]}>
                {userPin ? i18n.update_pin_sub : i18n.protect_balances_sub}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={textColor + "80"} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* PIN Modal */}
      <Modal
        visible={isPinModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {pinMode === "create"
                ? isChangingPin
                  ? i18n.enter_new_pin
                  : i18n.create_pin
                : isChangingPin
                  ? i18n.enter_current_pin
                  : i18n.enter_pin}
            </Text>

            <TextInput
              style={[
                styles.pinInput,
                { color: textColor, borderColor: tintColor },
              ]}
              value={pinInput}
              onChangeText={(text) => {
                if (/^\d*$/.test(text) && text.length <= 5) {
                  setPinInput(text);
                  setError(null);
                }
              }}
              keyboardType="number-pad"
              maxLength={5}
              secureTextEntry
              autoFocus
            />

            {error && (
              <Text style={{ color: "red", marginBottom: 16 }}>{error}</Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setPinModalVisible(false)}
                style={styles.modalButton}
              >
                <Text style={{ color: textColor }}>{i18n.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePinSubmit}
                style={[styles.modalButton, { backgroundColor: tintColor }]}
              >
                <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                  {pinMode === "create" ? i18n.set_pin_btn : i18n.confirm_btn}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Gemini API Key Modal */}
      <Modal
        visible={isKeyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setKeyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {i18n.gemini_api_key}
            </Text>

            <TextInput
              style={[
                styles.pinInput,
                {
                  color: textColor,
                  borderColor: tintColor,
                  fontSize: 16,
                  textAlign: "left",
                  letterSpacing: 0,
                  height: 100,
                },
              ]}
              multiline
              value={keyInput}
              onChangeText={setKeyInput}
              autoCorrect={false}
              autoCapitalize="none"
              placeholder="Paste API Key here..."
              placeholderTextColor={textColor + "50"}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setKeyModalVisible(false)}
                style={styles.modalButton}
              >
                <Text style={{ color: textColor }}>{i18n.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  await setGeminiApiKey(keyInput.trim());
                  setKeyModalVisible(false);
                }}
                style={[styles.modalButton, { backgroundColor: tintColor }]}
              >
                <Text style={{ color: backgroundColor, fontWeight: "600" }}>
                  {i18n.save_key_btn}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={isLangModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {i18n.language}
            </Text>

            <TouchableOpacity
              style={[
                styles.selectionRow,
                {
                  borderBottomColor: textColor + "10",
                },
              ]}
              onPress={() => {
                setLanguage("de");
                setLangModalVisible(false);
              }}
            >
              <Text style={{ color: textColor, fontSize: 18 }}>
                {i18n.german} {language === "de" && "✓"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selectionRow,
                {
                  borderBottomColor: textColor + "10",
                },
              ]}
              onPress={() => {
                setLanguage("en");
                setLangModalVisible(false);
              }}
            >
              <Text style={{ color: textColor, fontSize: 18 }}>
                {i18n.english} {language === "en" && "✓"}
              </Text>
            </TouchableOpacity>

            <View style={[styles.modalButtons, { marginTop: 24 }]}>
              <TouchableOpacity
                onPress={() => setLangModalVisible(false)}
                style={styles.modalButton}
              >
                <Text style={{ color: textColor }}>{i18n.cancel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Main Account Selection Modal */}
      <Modal
        visible={isMainAccModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMainAccModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {i18n.select_main_account}
            </Text>

            <ScrollView style={{ width: "100%", maxHeight: 300 }}>
              {accounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.selectionRow,
                    {
                      borderBottomColor: textColor + "10",
                    },
                  ]}
                  onPress={async () => {
                    await setMainAccountId(acc.id);
                    setMainAccModalVisible(false);
                  }}
                >
                  <View>
                    <Text style={{ color: textColor, fontSize: 16, fontWeight: "600" }}>
                      {acc.name} {activeMainAccount?.id === acc.id && "✓"}
                    </Text>
                    <Text style={{ color: textColor, opacity: 0.6, fontSize: 12 }}>
                      {acc.bankName} • {acc.category}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {accounts.length === 0 && (
                <Text style={{ color: textColor, opacity: 0.5, textAlign: "center", padding: 20 }}>
                  {i18n.no_accounts}
                </Text>
              )}
            </ScrollView>

            <View style={[styles.modalButtons, { marginTop: 24 }]}>
              <TouchableOpacity
                onPress={() => setMainAccModalVisible(false)}
                style={styles.modalButton}
              >
                <Text style={{ color: textColor }}>{i18n.cancel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={isThemeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {i18n.appearance}
            </Text>

            <TouchableOpacity
              style={[
                styles.selectionRow,
                {
                  borderBottomColor: textColor + "10",
                },
              ]}
              onPress={() => {
                setTheme("system");
                setThemeModalVisible(false);
              }}
            >
              <Text style={{ color: textColor, fontSize: 18 }}>
                {i18n.theme_system} {theme === "system" && "✓"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selectionRow,
                {
                  borderBottomColor: textColor + "10",
                },
              ]}
              onPress={() => {
                setTheme("light");
                setThemeModalVisible(false);
              }}
            >
              <Text style={{ color: textColor, fontSize: 18 }}>
                {i18n.theme_light} {theme === "light" && "✓"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selectionRow,
                {
                  borderBottomColor: textColor + "10",
                },
              ]}
              onPress={() => {
                setTheme("dark");
                setThemeModalVisible(false);
              }}
            >
              <Text style={{ color: textColor, fontSize: 18 }}>
                {i18n.theme_dark} {theme === "dark" && "✓"}
              </Text>
            </TouchableOpacity>

            <View style={[styles.modalButtons, { marginTop: 24 }]}>
              <TouchableOpacity
                onPress={() => setThemeModalVisible(false)}
                style={styles.modalButton}
              >
                <Text style={{ color: textColor }}>{i18n.cancel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    opacity: 0.6,
    marginBottom: 8,
    marginLeft: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  rowSubLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
    paddingRight: 16,
  },
  selectionRow: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 24,
  },
  pinInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
