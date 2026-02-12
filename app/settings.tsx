import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
    Modal,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSettings } from "../context/SettingsContext";
import { useThemeColor } from "../hooks/use-theme-color";

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
    i18n,
  } = useSettings();

  const [isPinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState<"create" | "verify">("create");
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);

  const [isKeyModalVisible, setKeyModalVisible] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [isLangModalVisible, setLangModalVisible] = useState(false);

  const handleToggleBalance = async () => {
    if (isBalanceHidden) {
      // Deactivate -> Require PIN
      setPinMode("verify");
      setPinInput("");
      setPinModalVisible(true);
      setIsChangingPin(false);
    } else {
      // Activate
      if (!userPin) {
        // Require PIN setup
        setPinMode("create");
        setPinInput("");
        setPinModalVisible(true);
        setIsChangingPin(false);
      } else {
        // Just activate
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
          // Old PIN verified, now set new one
          setPinMode("create");
          setPinInput("");
          setError(null);
        } else {
          // Just toggling balance
          const success = await toggleBalanceHidden(pinInput);
          if (success) {
            setPinModalVisible(false);
          }
        }
      } else {
        // Create / Set New
        await setPin(pinInput);
        setPinModalVisible(false);
        // Only toggle if we were NOT changing the pin (i.e. we were setting it up to hide)
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
                // Only numbers
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
                  height: 100, // Multiline height
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
                styles.row,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: textColor + "10",
                  width: "100%",
                },
              ]}
              onPress={() => {
                setLanguage("de");
                setLangModalVisible(false);
              }}
            >
              <Text style={{ color: textColor, fontSize: 18, padding: 12 }}>
                {i18n.german} {language === "de" && "✓"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.row,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: textColor + "10",
                  width: "100%",
                },
              ]}
              onPress={() => {
                setLanguage("en");
                setLangModalVisible(false);
              }}
            >
              <Text style={{ color: textColor, fontSize: 18, padding: 12 }}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
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
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 24,
  },
  pinInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
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
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});
