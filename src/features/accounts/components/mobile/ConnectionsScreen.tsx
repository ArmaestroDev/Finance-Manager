import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
import {
  Button,
  Chip,
  IconBack,
  IconLink,
  IconWarn,
  Label,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { useBankConnections, type StoredSession } from "../../hooks/useBankConnections";
import { BankSelectionModal } from "../BankSelectionModal";

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

  const renderSession = ({ item, index }: { item: StoredSession; index: number }) => {
    const isFirst = index === 0;
    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor: t.surface,
            borderColor: t.line,
            borderTopWidth: isFirst ? 1 : 0,
            borderTopLeftRadius: isFirst ? 10 : 0,
            borderTopRightRadius: isFirst ? 10 : 0,
            borderBottomLeftRadius: index === sessions.length - 1 ? 10 : 0,
            borderBottomRightRadius: index === sessions.length - 1 ? 10 : 0,
          },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: t.surfaceAlt, borderColor: t.line }]}>
          <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 11, color: t.inkSoft }}>
            {item.bankName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13, color: t.ink }} numberOfLines={1}>
            {item.bankName}
          </Text>
          <Text style={{ fontFamily: FMFonts.sans, fontSize: 10.5, color: t.inkMuted, marginTop: 2 }}>
            {i18n.connected_account_count.replace("{count}", item.accounts.length.toString())} ·{" "}
            {i18n.connected_date.replace("{date}", new Date(item.connectedAt).toLocaleDateString("en-GB"))}
          </Text>
        </View>
        <View style={styles.liveTag}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.pos }} />
          <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 9, color: t.pos, marginLeft: 4, letterSpacing: 0.5 }}>
            LIVE
          </Text>
        </View>
        <Pressable onPress={() => removeSession(item.sessionId)} hitSlop={8}>
          <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.neg, marginLeft: 12 }}>
            {i18n.remove}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.backRow}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}>
          <IconBack size={15} color={t.inkSoft} />
        </Pressable>
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 12, color: t.inkSoft, marginLeft: 4 }}>Back</Text>
      </View>

      <MobileHeader title={i18n.connections_title} sub={i18n.connections_subtitle} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Connect-a-bank CTA card */}
        <View style={[styles.ctaCard, { backgroundColor: t.surface, borderColor: t.line }]}>
          <View style={[styles.ctaIcon, { backgroundColor: t.accentSoft }]}>
            <IconLink size={18} color={t.accent} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13, color: t.ink }}>
              {i18n.connect_bank_btn}
            </Text>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 11, color: t.inkSoft, marginTop: 2 }}>
              300+ German &amp; EU institutions
            </Text>
          </View>
          <Button variant="primary" size="sm" onPress={openBankSelection}>
            Add
          </Button>
        </View>

        {/* Connecting indicator */}
        {connecting && !showManualInput ? (
          <View style={[styles.connecting, { backgroundColor: t.surface, borderColor: t.line }]}>
            <ActivityIndicator size="small" color={t.accent} />
            <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 12, color: t.ink, marginLeft: 8, flex: 1 }}>
              {i18n.connecting}
            </Text>
            <Pressable onPress={() => setShowManualInput(true)}>
              <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.accent }}>
                {i18n.have_code_btn}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Connected list */}
        {sessions.length > 0 ? (
          <>
            <Label style={{ marginBottom: 6, paddingHorizontal: 2 }}>
              {i18n.connected_accounts} · {sessions.length}
            </Label>
            <FlatList
              data={sessions}
              renderItem={renderSession}
              keyExtractor={(item) => item.sessionId}
              scrollEnabled={false}
            />
          </>
        ) : !connecting ? (
          <View style={[styles.empty, { backgroundColor: t.surface, borderColor: t.lineStrong }]}>
            <View style={[styles.emptyCircle, { backgroundColor: t.surfaceAlt, borderColor: t.lineStrong }]}>
              <IconLink size={28} color={t.inkMuted} />
            </View>
            <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 14, color: t.ink, marginTop: 14 }}>
              {i18n.no_connections}
            </Text>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkSoft, marginTop: 4, textAlign: "center" }}>
              Connect a bank to import balances and transactions automatically.
            </Text>
            <View style={{ marginTop: 14 }}>
              <Button variant="primary" icon={<IconLink size={11} color={t.bg} />} onPress={openBankSelection}>
                {i18n.connect_bank_btn}
              </Button>
            </View>
          </View>
        ) : null}

        {/* Manual code fallback */}
        <View style={[styles.fallback, { backgroundColor: t.surfaceAlt, borderColor: t.lineStrong }]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <IconWarn size={13} color={t.inkSoft} />
            <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 11, color: t.ink, marginLeft: 8 }}>
              OAuth redirect didn&apos;t work?
            </Text>
          </View>
          <Text style={{ fontFamily: FMFonts.sans, fontSize: 10.5, color: t.inkMuted, marginLeft: 21 }}>
            Paste the auth code manually.
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
              <Chip onPress={() => setShowManualInput(true)}>Enter code</Chip>
            </View>
          )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backRow: {
    paddingHorizontal: 18,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: { padding: 6 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 96,
  },
  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 14,
  },
  ctaIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  connecting: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  empty: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 8,
  },
  emptyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
    fontFamily: FMFonts.mono,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
});
