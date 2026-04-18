import React from "react";
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSettings } from "../../../../shared/context/SettingsContext";
import { useThemeColor } from "../../../../shared/hooks/use-theme-color";
import { useBankConnections, type StoredSession } from "../../hooks/useBankConnections";
import { BankSelectionModal } from "./BankSelectionModal";

export function ConnectionsScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const surfaceColor = useThemeColor({}, "surface");
  const { i18n } = useSettings();

  const { sessions, connecting, manualCode, setManualCode, showManualInput, setShowManualInput, filteredBanks, isBankModalVisible, setBankModalVisible, searchQuery, loadingBanks, handleSearch, handleAuthCode, openBankSelection, handleSelectBank, removeSession } = useBankConnections();

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <BankSelectionModal visible={isBankModalVisible} onClose={() => setBankModalVisible(false)} loadingBanks={loadingBanks} filteredBanks={filteredBanks} searchQuery={searchQuery} onSearch={handleSearch} onSelectBank={handleSelectBank} textColor={textColor} backgroundColor={backgroundColor} tintColor={tintColor} i18n={i18n} />

      {/* Top header */}
      <View style={[styles.topBar, { borderBottomColor: textColor + "10" }]}>
        <View>
          <Text style={[styles.pageTitle, { color: textColor }]}>{i18n.connections_title}</Text>
          <Text style={{ color: textColor, opacity: 0.5, fontSize: 13 }}>{i18n.connections_subtitle}</Text>
        </View>
      </View>

      {/* Two-column: connect panel left, sessions right */}
      <View style={styles.twoColumn}>
        {/* Left: connect button and status */}
        <View style={[styles.leftPanel, { borderRightColor: textColor + "10" }]}>
          <Text style={[styles.sectionLabel, { color: textColor }]}>CONNECT A BANK</Text>
          {connecting && !showManualInput ? (
            <View style={styles.connectingBox}>
              <ActivityIndicator size="large" color={tintColor} />
              <Text style={{ color: textColor, marginTop: 16, fontWeight: "600" }}>{i18n.connecting}</Text>
              {Platform.OS === "web" && (
                <Text style={{ color: textColor, opacity: 0.5, fontSize: 12, textAlign: "center", marginTop: 8 }}>
                  Waiting for bank authorization in popup...
                </Text>
              )}
              <TouchableOpacity onPress={() => setShowManualInput(true)} style={{ marginTop: 16 }}>
                <Text style={{ color: tintColor, fontSize: 13, fontWeight: "600" }}>{i18n.have_code_btn}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity style={[styles.connectBtn, { backgroundColor: tintColor }]} onPress={openBankSelection}>
                <Text style={{ color: backgroundColor, fontWeight: "700", fontSize: 15 }}>{i18n.connect_bank_btn}</Text>
              </TouchableOpacity>
              {showManualInput && (
                <View style={[styles.manualBox, { backgroundColor: surfaceColor }]}>
                  <Text style={{ color: textColor, fontSize: 13, marginBottom: 10, opacity: 0.7 }}>{i18n.manual_code_hint}</Text>
                  <TextInput
                    style={[styles.input, { color: textColor, borderColor: tintColor }]}
                    placeholder="Paste code here..."
                    placeholderTextColor={textColor + "60"}
                    value={manualCode}
                    onChangeText={setManualCode}
                  />
                  <TouchableOpacity style={[styles.submitBtn, { backgroundColor: tintColor }]} onPress={() => handleAuthCode(manualCode)} disabled={!manualCode}>
                    <Text style={{ color: backgroundColor, fontWeight: "600" }}>{i18n.submit_code}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        {/* Right: connected sessions */}
        <View style={styles.rightPanel}>
          <Text style={[styles.sectionLabel, { color: textColor, marginBottom: 16 }]}>
            CONNECTED ACCOUNTS ({sessions.length})
          </Text>
          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>🏦</Text>
              <Text style={{ color: textColor, opacity: 0.5, marginTop: 12, fontSize: 15 }}>{i18n.no_connections}</Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.sessionId}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item }: { item: StoredSession }) => (
                <View style={[styles.sessionCard, { backgroundColor: tintColor + "0A", borderColor: tintColor + "20" }]}>
                  <View style={styles.sessionHeader}>
                    <Text style={[styles.bankName, { color: textColor }]}>🏦 {item.bankName}</Text>
                    <View style={styles.sessionMeta}>
                      <Text style={{ color: textColor, opacity: 0.4, fontSize: 12 }}>
                        {i18n.connected_date.replace("{date}", new Date(item.connectedAt).toLocaleDateString())}
                      </Text>
                      <TouchableOpacity onPress={() => removeSession(item.sessionId)} style={styles.removeBtn}>
                        <Text style={{ color: "#FF6B6B", fontWeight: "600", fontSize: 13 }}>{i18n.remove}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={{ color: textColor, opacity: 0.5, fontSize: 12, marginBottom: 10 }}>
                    {i18n.connected_account_count.replace("{count}", item.accounts.length.toString())}
                  </Text>
                  <View style={styles.accountsTable}>
                    {item.accounts.map((acc: any, idx: number) => (
                      <View key={idx} style={[styles.accountRow, { borderTopColor: textColor + "10" }]}>
                        <Text style={{ color: textColor, fontSize: 13, fontFamily: "monospace", flex: 1 }}>
                          {acc.account_id?.iban || acc.name || "Account"}
                        </Text>
                        {acc.currency && <Text style={{ color: tintColor, fontWeight: "600", fontSize: 12 }}>{acc.currency}</Text>}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 32, paddingVertical: 20, borderBottomWidth: 1 },
  pageTitle: { fontSize: 26, fontWeight: "800" },
  twoColumn: { flex: 1, flexDirection: "row" },
  leftPanel: { width: 300, padding: 24, borderRightWidth: 1, gap: 16 },
  rightPanel: { flex: 1, padding: 24 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, opacity: 0.5 },
  connectingBox: { alignItems: "center", padding: 24, gap: 8 },
  connectBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  manualBox: { borderRadius: 12, padding: 16, gap: 8, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 11, fontSize: 14 },
  submitBtn: { borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center" },
  sessionCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  sessionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  bankName: { fontSize: 16, fontWeight: "700" },
  sessionMeta: { alignItems: "flex-end", gap: 4 },
  removeBtn: { paddingVertical: 2 },
  accountsTable: { gap: 0 },
  accountRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
});
