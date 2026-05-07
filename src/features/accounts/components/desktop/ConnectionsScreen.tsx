import { Stack } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import {
  Button,
  Chip,
  IconMore,
  IconPlus,
  IconRefresh,
  IconWarn,
  Label,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { useBankConnections, type StoredSession } from "../../hooks/useBankConnections";
import { BankSelectionModal } from "./BankSelectionModal";
import { formatDate } from "@/src/shared/utils/date";

export function ConnectionsScreen() {
  const t = useFMTheme();
  const { i18n } = useSettings();

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

  return (
    <DesktopShell activeId="connections">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.page, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.pageTitle, { color: t.ink }]}>{i18n.connections_title}</Text>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkSoft, marginTop: 4 }}>
              {i18n.connections_subtitle} · {sessions.length} bank{sessions.length === 1 ? "" : "s"} linked
            </Text>
          </View>
          <Button variant="primary" icon={<IconPlus size={12} color={t.bg} />} onPress={openBankSelection}>
            {i18n.connect_bank_btn}
          </Button>
        </View>

        <View style={styles.grid}>
          <View style={[styles.banksWrap, { backgroundColor: t.surface, borderColor: t.line }]}>
            <View style={[styles.banksHeader, { borderBottomColor: t.line }]}>
              <Label>{i18n.connected_accounts}</Label>
              <View style={{ flex: 1 }} />
              <Chip icon={<IconRefresh size={11} color={t.inkSoft} />}>Refresh all</Chip>
            </View>
            {connecting && !showManualInput ? (
              <View style={[styles.connecting, { borderBottomColor: t.line }]}>
                <ActivityIndicator size="small" color={t.accent} />
                <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 12, color: t.ink, marginLeft: 8 }}>
                  {i18n.connecting}
                </Text>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => setShowManualInput(true)}>
                  <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.accent }}>
                    {i18n.have_code_btn}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {sessions.length === 0 && !connecting ? (
              <View style={styles.empty}>
                <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 14, color: t.ink }}>
                  {i18n.no_connections}
                </Text>
                <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkSoft, marginTop: 4 }}>
                  Use Open Banking to link a bank read-only.
                </Text>
              </View>
            ) : (
              sessions.map((s, i) => (
                <SessionRow
                  key={s.sessionId}
                  session={s}
                  isFirst={i === 0}
                  onRemove={() => removeSession(s.sessionId)}
                  i18n={i18n}
                />
              ))
            )}
          </View>

          <View style={{ flex: 1, gap: 12 }}>
            <View style={[styles.infoCard, { backgroundColor: t.surface, borderColor: t.line }]}>
              <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13, color: t.ink }}>
                How connections work
              </Text>
              <Text style={{ fontFamily: FMFonts.sans, fontSize: 11.5, color: t.inkSoft, marginTop: 6, lineHeight: 17 }}>
                We use Open Banking — your bank authorizes us read-only access. We never see or store your password. You can revoke any time.
              </Text>
            </View>
            <View style={[styles.fallback, { backgroundColor: t.surfaceAlt, borderColor: t.lineStrong }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <IconWarn size={14} color={t.warn} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13, color: t.ink }}>
                    Redirect didn&apos;t work?
                  </Text>
                  <Text style={{ fontFamily: FMFonts.sans, fontSize: 11.5, color: t.inkSoft, marginTop: 4, lineHeight: 17 }}>
                    Some browsers block the bank&apos;s redirect (Safari, in-app browsers). Paste your auth code manually.
                  </Text>
                  {showManualInput ? (
                    <View style={{ marginTop: 10 }}>
                      <TextInput
                        value={manualCode}
                        onChangeText={setManualCode}
                        placeholder="Paste code here…"
                        placeholderTextColor={t.inkMuted}
                        style={[
                          styles.input,
                          { color: t.ink, borderColor: t.lineStrong, backgroundColor: t.surface },
                        ]}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onPress={() => handleAuthCode(manualCode)}
                        disabled={!manualCode}
                      >
                        {i18n.submit_code}
                      </Button>
                    </View>
                  ) : (
                    <View style={{ marginTop: 10, alignSelf: "flex-start" }}>
                      <Button variant="secondary" size="sm" onPress={() => setShowManualInput(true)}>
                        Enter auth code
                      </Button>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <BankSelectionModal
        visible={isBankModalVisible}
        onClose={() => setBankModalVisible(false)}
        loadingBanks={loadingBanks}
        filteredBanks={filteredBanks}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onSelectBank={handleSelectBank}
        textColor={t.ink}
        backgroundColor={t.bg}
        tintColor={t.accent}
        i18n={i18n}
      />
    </DesktopShell>
  );
}

interface SessionRowProps {
  session: StoredSession;
  isFirst: boolean;
  onRemove: () => void;
  i18n: any;
}

function SessionRow({ session, isFirst, onRemove, i18n }: SessionRowProps) {
  const t = useFMTheme();
  return (
    <View style={[styles.row, !isFirst && { borderTopWidth: 1, borderTopColor: t.line }]}>
      <View style={[styles.avatar, { backgroundColor: t.surfaceAlt, borderColor: t.line }]}>
        <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13, color: t.inkSoft }}>
          {session.bankName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13.5, color: t.ink }}>{session.bankName}</Text>
        <Text style={{ fontFamily: FMFonts.sans, fontSize: 11, color: t.inkMuted, marginTop: 2 }}>
          {i18n.connected_account_count.replace("{count}", session.accounts.length.toString())} · connected{" "}
          {i18n.connected_date.replace("{date}", formatDate(session.connectedAt))}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 5, marginRight: 14 }}>
        {session.accounts.slice(0, 3).map((a, i) => (
          <View key={i} style={[styles.tag, { backgroundColor: t.surfaceAlt }]}>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 10.5, color: t.inkSoft }}>
              {(a.account_id?.iban?.slice(-4) ?? a.name?.slice(0, 8) ?? "Account").toString()}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.liveTag}>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.pos }} />
        <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 10, color: t.pos, marginLeft: 5, letterSpacing: 0.5 }}>
          LIVE
        </Text>
      </View>
      <Pressable onPress={onRemove} hitSlop={8} style={({ pressed }) => ({ marginLeft: 12, opacity: pressed ? 0.5 : 1 })}>
        <IconMore size={14} color={t.inkMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 18,
  },
  pageTitle: {
    fontFamily: FMFonts.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  grid: {
    flexDirection: "row",
    gap: 16,
  },
  banksWrap: {
    flex: 1.4,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  banksHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  connecting: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
  },
  empty: {
    paddingHorizontal: 18,
    paddingVertical: 40,
    alignItems: "center",
  },
  infoCard: {
    padding: 18,
    borderWidth: 1,
    borderRadius: 12,
  },
  fallback: {
    padding: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 10,
    fontFamily: FMFonts.mono,
    fontSize: 12.5,
    fontVariant: ["tabular-nums"],
  },
});
