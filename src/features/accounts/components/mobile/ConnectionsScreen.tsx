import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { MobileShell } from "@/src/shared/components/MobileShell";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
import {
  Button,
  Chip,
  IconBack,
  IconMore,
  IconPlus,
  IconRefresh,
  IconWarn,
  Label,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  useBankConnections,
  type StoredSession,
} from "../../hooks/useBankConnections";
import { BankSelectionModal } from "./BankSelectionModal";
import { formatDate } from "@/src/shared/utils/date";

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

  const header = (
    <View>
      <View style={styles.backRow}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
        >
          <IconBack size={15} color={t.inkSoft} />
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text
            style={{
              fontFamily: FMFonts.sansMedium,
              fontSize: 12,
              color: t.inkSoft,
              marginLeft: 2,
            }}
          >
            {i18n.accounts_title}
          </Text>
        </Pressable>
      </View>
      <MobileHeader
        title={i18n.connections_title}
        sub={`${i18n.connections_subtitle} · ${sessions.length} bank${
          sessions.length === 1 ? "" : "s"
        } linked`}
        right={
          <Chip
            icon={<IconPlus size={11} color={t.inkSoft} />}
            onPress={openBankSelection}
          >
            Add
          </Chip>
        }
      />
    </View>
  );

  return (
    <MobileShell tabBar={false} headerOverride={header}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Connected accounts list */}
      <View
        style={[
          styles.card,
          { backgroundColor: t.surface, borderColor: t.line },
        ]}
      >
        <View style={[styles.cardHead, { borderBottomColor: t.line }]}>
          <Label>{i18n.connected_accounts}</Label>
          <View style={{ flex: 1 }} />
          <Chip icon={<IconRefresh size={11} color={t.inkSoft} />}>
            Refresh all
          </Chip>
        </View>

        {connecting && !showManualInput ? (
          <View style={[styles.connecting, { borderBottomColor: t.line }]}>
            <ActivityIndicator size="small" color={t.accent} />
            <Text
              style={{
                fontFamily: FMFonts.sansMedium,
                fontSize: 12,
                color: t.ink,
                marginLeft: 8,
                flex: 1,
              }}
            >
              {i18n.connecting}
            </Text>
            <Pressable onPress={() => setShowManualInput(true)}>
              <Text
                style={{
                  fontFamily: FMFonts.sansMedium,
                  fontSize: 11,
                  color: t.accent,
                }}
              >
                {i18n.have_code_btn}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {sessions.length === 0 && !connecting ? (
          <View style={styles.empty}>
            <Text
              style={{
                fontFamily: FMFonts.sansSemibold,
                fontSize: 14,
                color: t.ink,
              }}
            >
              {i18n.no_connections}
            </Text>
            <Text
              style={{
                fontFamily: FMFonts.sans,
                fontSize: 12,
                color: t.inkSoft,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              Use Open Banking to link a bank read-only.
            </Text>
            <View style={{ marginTop: 14 }}>
              <Button
                variant="primary"
                icon={<IconPlus size={11} color={t.bg} />}
                onPress={openBankSelection}
              >
                {i18n.connect_bank_btn}
              </Button>
            </View>
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

      {/* Info: how connections work */}
      <View
        style={[
          styles.infoCard,
          { backgroundColor: t.surface, borderColor: t.line },
        ]}
      >
        <Text
          style={{
            fontFamily: FMFonts.sansSemibold,
            fontSize: 13,
            color: t.ink,
          }}
        >
          How connections work
        </Text>
        <Text
          style={{
            fontFamily: FMFonts.sans,
            fontSize: 11.5,
            color: t.inkSoft,
            marginTop: 6,
            lineHeight: 17,
          }}
        >
          We use Open Banking — your bank authorizes us read-only access. We
          never see or store your password. You can revoke any time.
        </Text>
      </View>

      {/* Fallback: redirect didn't work */}
      <View
        style={[
          styles.fallback,
          { backgroundColor: t.surfaceAlt, borderColor: t.lineStrong },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <IconWarn size={14} color={t.warn} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: FMFonts.sansSemibold,
                fontSize: 13,
                color: t.ink,
              }}
            >
              Redirect didn&apos;t work?
            </Text>
            <Text
              style={{
                fontFamily: FMFonts.sans,
                fontSize: 11.5,
                color: t.inkSoft,
                marginTop: 4,
                lineHeight: 17,
              }}
            >
              Some browsers block the bank&apos;s redirect (Safari, in-app
              browsers). Paste your auth code manually.
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
                    {
                      color: t.ink,
                      borderColor: t.lineStrong,
                      backgroundColor: t.surface,
                    },
                  ]}
                />
                <Button
                  variant="primary"
                  full
                  onPress={() => handleAuthCode(manualCode)}
                  disabled={!manualCode}
                >
                  {i18n.submit_code}
                </Button>
              </View>
            ) : (
              <View style={{ marginTop: 10, alignSelf: "flex-start" }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => setShowManualInput(true)}
                >
                  Enter auth code
                </Button>
              </View>
            )}
          </View>
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
        i18n={i18n}
      />
    </MobileShell>
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
    <View
      style={[
        styles.row,
        !isFirst && { borderTopWidth: 1, borderTopColor: t.line },
      ]}
    >
      <View style={styles.rowTop}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: t.surfaceAlt, borderColor: t.line },
          ]}
        >
          <Text
            style={{
              fontFamily: FMFonts.sansSemibold,
              fontSize: 13,
              color: t.inkSoft,
            }}
          >
            {session.bankName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                fontFamily: FMFonts.sansSemibold,
                fontSize: 13.5,
                color: t.ink,
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {session.bankName}
            </Text>
            <View style={styles.liveTag}>
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: t.pos,
                }}
              />
              <Text
                style={{
                  fontFamily: FMFonts.sansSemibold,
                  fontSize: 9.5,
                  color: t.pos,
                  marginLeft: 5,
                  letterSpacing: 0.5,
                }}
              >
                LIVE
              </Text>
            </View>
          </View>
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 11,
              color: t.inkMuted,
              marginTop: 3,
            }}
            numberOfLines={1}
          >
            {i18n.connected_account_count.replace(
              "{count}",
              session.accounts.length.toString(),
            )}{" "}
            ·{" "}
            {i18n.connected_date.replace(
              "{date}",
              formatDate(session.connectedAt),
            )}
          </Text>
        </View>
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={({ pressed }) => ({
            marginLeft: 10,
            padding: 4,
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <IconMore size={15} color={t.inkMuted} />
        </Pressable>
      </View>
      {session.accounts.length > 0 ? (
        <View style={styles.tagRow}>
          {session.accounts.slice(0, 3).map((a, i) => (
            <View
              key={i}
              style={[styles.tag, { backgroundColor: t.surfaceAlt }]}
            >
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  fontSize: 10.5,
                  color: t.inkSoft,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {(
                  a.account_id?.iban?.slice(-4) ??
                  a.name?.slice(0, 10) ??
                  "Account"
                ).toString()}
              </Text>
            </View>
          ))}
          {session.accounts.length > 3 ? (
            <Text
              style={{
                fontFamily: FMFonts.sansMedium,
                fontSize: 10.5,
                color: t.inkMuted,
                alignSelf: "center",
              }}
            >
              +{session.accounts.length - 3}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: {
    paddingHorizontal: 18,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: -8,
  },
  iconBtn: { padding: 6 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  connecting: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 10,
    marginLeft: 50,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  empty: {
    paddingHorizontal: 18,
    paddingVertical: 40,
    alignItems: "center",
  },
  infoCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  fallback: {
    padding: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
    fontFamily: FMFonts.mono,
    fontSize: 12.5,
    fontVariant: ["tabular-nums"],
  },
});
