import { Stack } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  IconLink,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconWarn,
  ListItem,
  SectionTitle,
  useFMTheme,
} from "@/src/shared/design";
import type { Strings } from "@/src/constants/Strings";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { showAlert } from "@/src/shared/utils/alert";
import { useAccounts } from "../../context/AccountsContext";
import { useBankConnections, type StoredSession } from "../../hooks/useBankConnections";
import { BankSelectionModal } from "../BankSelectionModal";
import { formatDate } from "@/src/shared/utils/date";

type I18n = typeof Strings.de;

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
  const { refreshAccounts, isRefreshing } = useAccounts();

  const confirmRemove = (session: StoredSession) =>
    showAlert(
      i18n.conn_remove_title,
      i18n.conn_remove_msg.replace("{bank}", session.bankName),
      [
        { text: i18n.cancel, style: "cancel" },
        { text: i18n.remove, style: "destructive", onPress: () => removeSession(session.sessionId) },
      ],
    );
  return (
    <DesktopShell
      activeId="connections"
      title={i18n.connections_title}
      actions={
        <Button icon={<IconPlus size={16} />} onPress={openBankSelection}>
          {i18n.connect_bank}
        </Button>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.page}>
        <View style={styles.grid}>
          <Card padding={0} style={styles.banks}>
            <View style={styles.cardHead}>
              <SectionTitle>{i18n.connected_accounts}</SectionTitle>
              <View style={{ flex: 1 }} />
              {sessions.length > 0 ? (
                <Button
                  variant="text"
                  size="sm"
                  icon={<IconRefresh size={16} />}
                  onPress={() => refreshAccounts(true)}
                  loading={isRefreshing}
                >
                  {i18n.conn_refresh_all}
                </Button>
              ) : null}
            </View>

            {connecting && !showManualInput ? (
              <View style={[styles.connecting, { backgroundColor: t.secondaryContainer }]}>
                <ActivityIndicator size="small" color={t.onSecondaryContainer} />
                <Text style={[styles.connectingText, { color: t.onSecondaryContainer }]}>{i18n.connecting}</Text>
                <Button variant="text" size="sm" onPress={() => setShowManualInput(true)}>
                  {i18n.conn_enter_code_btn}
                </Button>
              </View>
            ) : null}

            {sessions.length === 0 && !connecting ? (
              <EmptyState icon={<IconLink />} title={i18n.no_connections} body={i18n.conn_empty_hint} />
            ) : (
              <View style={{ paddingBottom: 8 }}>
                {sessions.map((s) => (
                  <SessionRow key={s.sessionId} session={s} onRemove={() => confirmRemove(s)} i18n={i18n} />
                ))}
              </View>
            )}
          </Card>

          <Card style={styles.side}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <IconWarn size={20} color={t.warn} />
              <SectionTitle style={{ flex: 1 }}>{i18n.conn_redirect_title}</SectionTitle>
            </View>
            <Text style={[styles.body, { color: t.inkSoft }]}>{i18n.conn_redirect_body}</Text>
            {showManualInput ? (
              <View style={{ marginTop: 16 }}>
                <Field
                  label={i18n.conn_enter_code_btn}
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder={i18n.conn_paste_code_ph}
                  mono
                  autoFocus
                  onSubmitEditing={() => manualCode && handleAuthCode(manualCode)}
                />
                <Button onPress={() => handleAuthCode(manualCode)} disabled={!manualCode} style={{ alignSelf: "flex-start" }}>
                  {i18n.submit_code}
                </Button>
              </View>
            ) : (
              <Button variant="tonal" onPress={() => setShowManualInput(true)} style={{ alignSelf: "flex-start", marginTop: 16 }}>
                {i18n.conn_enter_code_btn}
              </Button>
            )}
          </Card>
        </View>
      </View>

      <BankSelectionModal
        visible={isBankModalVisible}
        onClose={() => setBankModalVisible(false)}
        loadingBanks={loadingBanks}
        filteredBanks={filteredBanks}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onSelectBank={handleSelectBank}
      />
    </DesktopShell>
  );
}

interface SessionRowProps {
  session: StoredSession;
  onRemove: () => void;
  i18n: I18n;
}

function SessionRow({ session, onRemove, i18n }: SessionRowProps) {
  const t = useFMTheme();
  const subtitle = i18n.conn_accounts_date
    .replace("{accounts}", i18n.connected_account_count.replace("{count}", String(session.accounts.length)))
    .replace("{date}", i18n.connected_date.replace("{date}", formatDate(session.connectedAt)));
  return (
    <ListItem
      leading={<Avatar label={session.bankName} />}
      title={session.bankName}
      subtitle={subtitle}
      style={{ paddingHorizontal: 24 }}
      trailing={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {session.accounts.slice(0, 3).map((a, i) => (
            <View key={i} style={[styles.tag, { backgroundColor: t.surfaceContainerHigh }]}>
              <Text style={[styles.tagText, { color: t.inkSoft }]}>
                {(a.account_id?.iban?.slice(-4) ?? a.name?.slice(0, 8) ?? i18n.acct_fallback_name).toString()}
              </Text>
            </View>
          ))}
          <View style={[styles.tag, { backgroundColor: t.posSoft, flexDirection: "row", alignItems: "center" }]}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.pos, marginRight: 6 }} />
            <Text style={[styles.tagText, { color: t.pos, fontFamily: FMFonts.sansMedium }]}>{i18n.acct_src_live}</Text>
          </View>
          <IconButton icon={<IconTrash size={18} />} label={`${i18n.remove}: ${session.bankName}`} onPress={onRemove} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 24, paddingBottom: 32 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "flex-start",
  },
  banks: { flex: 1.6, minWidth: 480, overflow: "hidden" },
  side: { flex: 1, minWidth: 300 },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    minHeight: 56,
  },
  connecting: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: FMRadius.md,
  },
  connectingText: {
    flex: 1,
    marginLeft: 12,
    fontFamily: FMFonts.sansMedium,
    fontSize: FMType.body,
  },
  body: { fontFamily: FMFonts.sans, fontSize: FMType.body, lineHeight: 20 },
  tag: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: FMRadius.sm,
    justifyContent: "center",
  },
  tagText: { fontFamily: FMFonts.sans, fontSize: FMType.caption, fontVariant: ["tabular-nums"] },
});
