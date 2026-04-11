import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSettings } from "../../context/SettingsContext"; // Added import
import { useThemeColor } from "../../hooks/use-theme-color";
import {
  useBankConnections,
  type StoredSession,
} from "../hooks/useBankConnections";
import { BankSelectionModal } from "../components/BankSelectionModal";

export default function ConnectionsScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const { i18n } = useSettings(); // Added hook

  const {
    sessions,
    connecting,
    manualCode,
    setManualCode,
    showManualInput,
    setShowManualInput,
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
  } = useBankConnections();

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
      {item.accounts.map((acc: any, i: number) => (
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
      <BankSelectionModal
        visible={isBankModalVisible}
        onClose={() => setBankModalVisible(false)}
        loadingBanks={loadingBanks}
        filteredBanks={filteredBanks}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onSelectBank={handleSelectBank}
        textColor={textColor}
        backgroundColor={backgroundColor}
        tintColor={tintColor}
        i18n={i18n}
      />

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
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <ActivityIndicator size="large" color={tintColor} />
            <Text
              style={[
                styles.connectingText,
                { color: textColor, marginTop: 10 },
              ]}
            >
              {i18n.connecting}
            </Text>
            {Platform.OS === "web" && (
              <Text
                style={{
                  color: textColor,
                  opacity: 0.6,
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 10,
                }}
              >
                Waiting for bank authorization in popup...
              </Text>
            )}
          </View>

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
});
