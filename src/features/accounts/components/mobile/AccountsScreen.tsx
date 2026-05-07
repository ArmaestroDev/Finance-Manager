import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
import {
  Balance,
  Chip,
  IconEdit,
  IconLink,
  IconPlus,
  IconRefresh,
  Label,
  Spark,
  formatEUR,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import type { UnifiedAccount } from "../../context/AccountsContext";
import { useAccountsScreen } from "../../hooks/useAccountsScreen";
import { CashModal } from "../CashModal";
import { AddAccountModal } from "../AddAccountModal";

type Cat = "Giro" | "Savings" | "Stock";
const CATS: readonly Cat[] = ["Giro", "Savings", "Stock"];

export function AccountsScreen() {
  const t = useFMTheme();
  const router = useRouter();

  const {
    accounts,
    cashBalance,
    initialLoading,
    isRefreshing,
    refreshAccounts,
    isBalanceHidden,
    i18n,
    isCashModalVisible,
    setCashModalVisible,
    tempCashValue,
    setTempCashValue,
    isAddAccountModalVisible,
    setAddAccountModalVisible,
    newAccountName,
    setNewAccountName,
    newAccountBalance,
    setNewAccountBalance,
    newAccountCategory,
    setNewAccountCategory,
    handleSaveCash,
    openCashModal,
    handleAddManualAccount,
    onRefresh,
    totalBankBalance,
    totalNetWorth,
  } = useAccountsScreen();

  const masked = isBalanceHidden;
  const heroParts = splitForHero(totalNetWorth, masked);

  const sectioned = useMemo(
    () =>
      CATS.map((cat) => ({
        cat,
        accounts: accounts.filter((a) => a.category === cat),
      })).filter((s) => s.accounts.length > 0),
    [accounts],
  );

  if (initialLoading && accounts.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <MobileHeader
        title={i18n.accounts_title}
        right={
          <>
            <Chip
              icon={<IconPlus size={11} color={t.inkSoft} />}
              onPress={() => setAddAccountModalVisible(true)}
            >
              New
            </Chip>
            <Pressable
              onPress={() => router.push("/connections" as never)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
            >
              <IconLink size={18} color={t.inkSoft} />
            </Pressable>
            <Pressable
              onPress={() => refreshAccounts()}
              disabled={isRefreshing}
              style={({ pressed }) => ({
                opacity: pressed ? 0.5 : isRefreshing ? 0.4 : 1,
                padding: 4,
              })}
            >
              <IconRefresh size={18} color={t.inkSoft} />
            </Pressable>
          </>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={t.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Net worth strip — inverted ink card */}
        <View style={[styles.netCard, { backgroundColor: t.ink }]}>
          <Label color={t.bg} style={{ opacity: 0.55 }}>{i18n.net_worth}</Label>
          <View style={styles.heroRow}>
            <Text
              style={{
                fontFamily: FMFonts.display,
                fontSize: 30,
                color: t.bg,
                lineHeight: 32,
                letterSpacing: -0.5,
              }}
            >
              {heroParts.sign}
              {heroParts.integer}
              <Text style={{ color: t.bg, opacity: 0.55 }}>{heroParts.fraction}</Text>
            </Text>
            <Text
              style={{
                fontFamily: FMFonts.display,
                fontSize: 18,
                color: t.bg,
                opacity: 0.7,
                marginLeft: 4,
              }}
            >
              €
            </Text>
          </View>
          <View style={styles.netSplit}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.netSplitLabel, { color: t.bg, opacity: 0.55 }]}>
                {i18n.bank_assets}
              </Text>
              <Text style={[styles.netSplitValue, { color: t.bg }]}>
                {formatEUR(totalBankBalance, { masked })}
              </Text>
            </View>
            <Pressable
              onPress={openCashModal}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, opacity: 0.55 }}>
                <Text style={[styles.netSplitLabel, { color: t.bg }]}>
                  {i18n.cash_at_hand}
                </Text>
                <IconEdit size={9} color={t.bg} />
              </View>
              <Text style={[styles.netSplitValue, { color: t.bg }]}>
                {formatEUR(cashBalance, { masked })}
              </Text>
            </Pressable>
          </View>
        </View>

        {sectioned.length === 0 ? (
          <EmptyState onAdd={() => setAddAccountModalVisible(true)} i18n={i18n} />
        ) : (
          sectioned.map((sec) => {
            const subtotal = sec.accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
            return (
              <View key={sec.cat} style={{ marginBottom: 14 }}>
                <View style={styles.sectionHead}>
                  <Label>{`${labelFor(sec.cat, i18n)} · ${sec.accounts.length}`}</Label>
                  <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.inkSoft, fontVariant: ["tabular-nums"] }}>
                    {formatEUR(subtotal, { masked })}
                  </Text>
                </View>
                <View style={[styles.sectionList, { backgroundColor: t.surface, borderColor: t.line }]}>
                  {sec.accounts.map((a, i) => (
                    <AccountRow
                      key={a.id}
                      account={a}
                      masked={masked}
                      isFirst={i === 0}
                      onPress={() =>
                        router.push({
                          pathname: "/account/[id]",
                          params: { id: a.id, name: a.name, type: a.type },
                        })
                      }
                    />
                  ))}
                </View>
              </View>
            );
          })
        )}

        <Pressable
          onPress={() => setAddAccountModalVisible(true)}
          style={({ pressed }) => [
            styles.addButton,
            {
              borderColor: t.lineStrong,
              backgroundColor: t.surface,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <IconPlus size={13} color={t.ink} />
          <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 13, color: t.ink, marginLeft: 6 }}>
            {i18n.add_manual_account}
          </Text>
        </Pressable>
      </ScrollView>

      <CashModal
        visible={isCashModalVisible}
        value={tempCashValue}
        onChangeText={setTempCashValue}
        onSave={handleSaveCash}
        onClose={() => setCashModalVisible(false)}
        textColor={t.ink}
        backgroundColor={t.bg}
        tintColor={t.accent}
        i18n={i18n}
      />
      <AddAccountModal
        visible={isAddAccountModalVisible}
        onClose={() => setAddAccountModalVisible(false)}
        onAdd={handleAddManualAccount}
        name={newAccountName}
        setName={setNewAccountName}
        balance={newAccountBalance}
        setBalance={setNewAccountBalance}
        category={newAccountCategory}
        setCategory={setNewAccountCategory}
        textColor={t.ink}
        backgroundColor={t.bg}
        tintColor={t.accent}
        i18n={i18n}
      />
    </View>
  );
}

interface AccountRowProps {
  account: UnifiedAccount;
  masked: boolean;
  isFirst: boolean;
  onPress: () => void;
}

function AccountRow({ account, masked, isFirst, onPress }: AccountRowProps) {
  const t = useFMTheme();
  const isConnected = account.type === "connected";
  const initial = (account.bankName || account.name).charAt(0).toUpperCase();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderTopColor: isFirst ? "transparent" : t.line,
          borderTopWidth: isFirst ? 0 : 1,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: t.surfaceAlt, borderColor: t.line },
        ]}
      >
        <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 11, color: t.inkSoft, letterSpacing: -0.3 }}>
          {initial}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13, color: t.ink, lineHeight: 16 }} numberOfLines={1}>
          {account.name}
        </Text>
        <View style={styles.statusRow}>
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: isConnected ? t.pos : "transparent",
              borderWidth: isConnected ? 0 : 1,
              borderColor: t.inkMuted,
            }}
          />
          <Text style={{ fontFamily: FMFonts.sans, fontSize: 10.5, color: t.inkMuted, marginLeft: 4 }} numberOfLines={1}>
            {isConnected ? account.bankName : "Manual"}
          </Text>
        </View>
      </View>
      <View style={{ marginRight: 10 }}>
        <Spark data={makePlaceholderSpark(account.balance ?? 0)} width={56} height={18} neg={(account.balance ?? 0) < 0} />
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {account.loading ? (
          <ActivityIndicator size="small" color={t.accent} />
        ) : account.error ? (
          <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.neg }}>Error</Text>
        ) : (
          <Balance value={account.balance ?? 0} masked={masked} size={13} />
        )}
      </View>
    </Pressable>
  );
}

interface EmptyStateProps {
  onAdd: () => void;
  i18n: { no_accounts: string; no_accounts_hint: string; add_manual_account: string };
}

function EmptyState({ onAdd, i18n }: EmptyStateProps) {
  const t = useFMTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyCircle, { backgroundColor: t.surfaceAlt, borderColor: t.lineStrong }]} />
      <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 14, color: t.ink, marginTop: 14 }}>
        {i18n.no_accounts}
      </Text>
      <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkSoft, marginTop: 4, textAlign: "center" }}>
        {i18n.no_accounts_hint}
      </Text>
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [
          styles.emptyBtn,
          { backgroundColor: t.ink, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 13, color: t.bg }}>
          {i18n.add_manual_account}
        </Text>
      </Pressable>
    </View>
  );
}

function labelFor(cat: Cat, i18n: any): string {
  if (cat === "Giro") return i18n.cat_giro ?? "Giro";
  if (cat === "Savings") return i18n.cat_savings ?? "Savings";
  if (cat === "Stock") return i18n.cat_stock ?? "Stock";
  return cat;
}

// Placeholder shape until real balance history is wired in (task #9).
function makePlaceholderSpark(balance: number): number[] {
  const sign = balance < 0 ? -1 : 1;
  return [0.7, 0.85, 0.95, 0.9, 1, 0.97, 1].map((v) => v * sign);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: 18, paddingBottom: 96 },
  netCard: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  netSplit: {
    flexDirection: "row",
    marginTop: 10,
    gap: 14,
  },
  netSplitLabel: {
    fontFamily: FMFonts.sans,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  netSplitValue: {
    fontFamily: FMFonts.sansMedium,
    fontSize: 12,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  sectionList: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  addButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
});
