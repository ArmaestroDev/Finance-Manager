import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import { MobileShell } from "@/src/shared/components/MobileShell";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
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
import {
  useBankConnections,
  type StoredSession,
} from "../../hooks/useBankConnections";
import { BankSelectionModal } from "../BankSelectionModal";
import { formatDate } from "@/src/shared/utils/date";

type I18n = typeof Strings.de;

export function ConnectionsScreen() {
  const t = useFMTheme();
  const router = useRouter();
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
  const header = (
    <MobileHeader
      title={i18n.connections_title}
      onBack={() => router.back()}
      right={
        <>
          {sessions.length > 0 ? (
            <IconButton
              icon={<IconRefresh size={20} />}
              label={i18n.conn_refresh_all}
              onPress={isRefreshing ? undefined : () => refreshAccounts(true)}
              disabled={isRefreshing}
            />
          ) : null}
          <IconButton icon={<IconPlus size={20} />} label={i18n.connect_bank} onPress={openBankSelection} />
        </>
      }
    />
  );

  return (
    <MobileShell tabBar={false} headerOverride={header}>
      <Stack.Screen options={{ headerShown: false }} />

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
        <Card>
          <EmptyState
            icon={<IconLink />}
            title={i18n.no_connections}
            body={i18n.conn_empty_hint}
            action={
              <Button icon={<IconPlus size={16} />} onPress={openBankSelection}>
                {i18n.connect_bank}
              </Button>
            }
          />
        </Card>
      ) : sessions.length > 0 ? (
        <Card padding={0} style={{ overflow: "hidden", paddingVertical: 4 }}>
          {sessions.map((s) => (
            <SessionRow key={s.sessionId} session={s} onRemove={() => confirmRemove(s)} i18n={i18n} />
          ))}
        </Card>
      ) : null}

      <Card style={{ marginTop: 16 }}>
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
            />
            <Button full onPress={() => handleAuthCode(manualCode)} disabled={!manualCode}>
              {i18n.submit_code}
            </Button>
          </View>
        ) : (
          <Button variant="tonal" onPress={() => setShowManualInput(true)} style={{ alignSelf: "flex-start", marginTop: 16 }}>
            {i18n.conn_enter_code_btn}
          </Button>
        )}
      </Card>

      <BankSelectionModal
        visible={isBankModalVisible}
        onClose={() => setBankModalVisible(false)}
        loadingBanks={loadingBanks}
        filteredBanks={filteredBanks}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onSelectBank={handleSelectBank}
      />
    </MobileShell>
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
      background={t.surface}
      trailing={
        <IconButton
          icon={<IconTrash size={20} />}
          label={`${i18n.remove}: ${session.bankName}`}
          onPress={onRemove}
          style={{ marginRight: -8 }}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  connecting: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
});
