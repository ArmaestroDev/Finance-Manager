import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { MobileShell } from "@/src/shared/components/MobileShell";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
import {
  Balance,
  Chip,
  IconEdit,
  IconLink,
  IconPlus,
  Label,
  Spark,
  formatEUR,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import type { UnifiedAccount } from "../../context/AccountsContext";
import { useAccountsScreen } from "../../hooks/useAccountsScreen";
import { useTransactionsContext } from "@/src/features/transactions/context/TransactionsContext";
import { useDateFilter } from "@/src/shared/context/DateFilterContext";
import { buildAccountBalanceSeries, type BalanceSeries } from "../../utils/balanceSeries";
import { CashModal } from "./CashModal";
import { AddAccountModal } from "./AddAccountModal";

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

  const { transactionsByAccount } = useTransactionsContext();
  const { filterDateFrom, filterDateTo } = useDateFilter();
  const seriesByAccount = useMemo(() => {
    const m: Record<string, BalanceSeries> = {};
    for (const a of accounts) {
      m[a.id] = buildAccountBalanceSeries(
        a.balance ?? 0,
        transactionsByAccount[a.id],
        filterDateFrom,
        filterDateTo,
      );
    }
    return m;
  }, [accounts, transactionsByAccount, filterDateFrom, filterDateTo]);

  const masked = isBalanceHidden;

  const totalLiabilities = useMemo(
    () => accounts.reduce((s, a) => (a.balance < 0 ? s + a.balance : s), 0),
    [accounts],
  );

  const sectioned = useMemo(
    () =>
      CATS.map((cat) => ({
        cat,
        accounts: accounts.filter((a) => a.category === cat),
      })).filter((s) => s.accounts.length > 0),
    [accounts],
  );

  const banksCount = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach((a) => {
      if (a.bankName) set.add(a.bankName);
    });
    return set.size;
  }, [accounts]);

  if (initialLoading && accounts.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  return (
    <MobileShell
      headerOverride={
        <MobileHeader
          title={i18n.accounts_title}
          sub={`${accounts.length} account${
            accounts.length === 1 ? "" : "s"
          } across ${banksCount || 0} bank${banksCount === 1 ? "" : "s"}`}
          right={
            <>
              <Chip
                icon={<IconEdit size={11} color={t.inkSoft} />}
                onPress={openCashModal}
              >
                Cash
              </Chip>
              <Chip
                icon={<IconPlus size={11} color={t.inkSoft} />}
                onPress={() => setAddAccountModalVisible(true)}
              >
                Add
              </Chip>
              <Pressable
                onPress={() => router.push("/connections" as never)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  padding: 4,
                })}
              >
                <IconLink size={18} color={t.inkSoft} />
              </Pressable>
            </>
          }
        />
      }
      onRefresh={onRefresh}
      refreshing={isRefreshing}
    >
      {/* ── 4-stat summary ── */}
      <View style={styles.statsGrid}>
        <StatCard
          label={i18n.net_worth}
          value={totalNetWorth}
          masked={masked}
          inverted
        />
        <StatCard label="Bank" value={totalBankBalance} masked={masked} />
      </View>
      <View style={[styles.statsGrid, { marginTop: 8 }]}>
        <StatCard
          label={i18n.cash_at_hand}
          value={cashBalance}
          masked={masked}
          editable
          onEdit={openCashModal}
        />
        <StatCard
          label={i18n.total_liabilities}
          value={totalLiabilities}
          masked={masked}
        />
      </View>

      {/* ── Sectioned accounts ── */}
      {sectioned.length === 0 ? (
        <EmptyState
          onAdd={() => setAddAccountModalVisible(true)}
          i18n={i18n}
        />
      ) : (
        <View style={{ marginTop: 14, gap: 14 }}>
          {sectioned.map((sec) => {
            const subtotal = sec.accounts.reduce(
              (s, a) => s + (a.balance ?? 0),
              0,
            );
            return (
              <View key={sec.cat}>
                <View style={styles.sectionHead}>
                  <Label>{`${labelFor(sec.cat, i18n)} · ${
                    sec.accounts.length
                  }`}</Label>
                  <Text
                    style={{
                      fontFamily: FMFonts.sansMedium,
                      fontSize: 11,
                      color: t.inkSoft,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {formatEUR(subtotal, { masked })}
                  </Text>
                </View>
                <View
                  style={[
                    styles.sectionList,
                    { backgroundColor: t.surface, borderColor: t.line },
                  ]}
                >
                  {sec.accounts.map((a, i) => (
                    <AccountRow
                      key={a.id}
                      account={a}
                      masked={masked}
                      series={seriesByAccount[a.id]}
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
          })}
        </View>
      )}

      {sectioned.length > 0 ? (
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
          <Text
            style={{
              fontFamily: FMFonts.sansMedium,
              fontSize: 13,
              color: t.ink,
              marginLeft: 6,
            }}
          >
            {i18n.add_manual_account}
          </Text>
        </Pressable>
      ) : null}

      <CashModal
        visible={isCashModalVisible}
        value={tempCashValue}
        onChangeText={setTempCashValue}
        onSave={handleSaveCash}
        onClose={() => setCashModalVisible(false)}
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
        i18n={i18n}
      />
    </MobileShell>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  masked: boolean;
  inverted?: boolean;
  editable?: boolean;
  onEdit?: () => void;
}

function StatCard({
  label,
  value,
  masked,
  inverted,
  editable,
  onEdit,
}: StatCardProps) {
  const t = useFMTheme();
  const bg = inverted ? t.ink : t.surface;
  const fg = inverted ? t.bg : t.ink;
  const labelColor = inverted ? t.bg : t.inkMuted;
  const labelOpacity = inverted ? 0.55 : 1;
  const heroParts = splitForHero(value, masked);
  return (
    <Pressable
      onPress={editable ? onEdit : undefined}
      style={({ pressed }) => [
        styles.statCard,
        {
          backgroundColor: bg,
          borderColor: inverted ? t.ink : t.line,
          opacity: pressed && editable ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          opacity: labelOpacity,
        }}
      >
        <Text style={[styles.statLabel, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
        {editable ? <IconEdit size={10} color={labelColor} /> : null}
      </View>
      <View style={styles.statHero}>
        <Text
          style={{
            fontFamily: FMFonts.display,
            fontSize: 24,
            color: fg,
            lineHeight: 26,
            letterSpacing: -0.4,
          }}
          numberOfLines={1}
        >
          {heroParts.sign}
          {heroParts.integer}
          <Text style={{ color: labelColor, opacity: labelOpacity }}>
            {heroParts.fraction}
          </Text>
        </Text>
        <Text
          style={{
            fontFamily: FMFonts.display,
            fontSize: 15,
            color: labelColor,
            opacity: labelOpacity,
            marginLeft: 4,
          }}
        >
          €
        </Text>
      </View>
    </Pressable>
  );
}

interface AccountRowProps {
  account: UnifiedAccount;
  masked: boolean;
  series?: BalanceSeries;
  isFirst: boolean;
  onPress: () => void;
}

function AccountRow({ account, masked, series, isFirst, onPress }: AccountRowProps) {
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
        <Text
          style={{
            fontFamily: FMFonts.sansSemibold,
            fontSize: 12,
            color: t.inkSoft,
            letterSpacing: -0.3,
          }}
        >
          {initial}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontFamily: FMFonts.sansSemibold,
            fontSize: 13,
            color: t.ink,
            lineHeight: 16,
          }}
          numberOfLines={1}
        >
          {account.name}
        </Text>
        <View style={styles.metaRow}>
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
          <Text
            style={{
              fontFamily: FMFonts.sansMedium,
              fontSize: 10,
              color: isConnected ? t.pos : t.inkMuted,
              marginLeft: 4,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            {isConnected ? "Live" : "Manual"}
          </Text>
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 10.5,
              color: t.inkMuted,
              marginLeft: 8,
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {account.bankName || "—"}
            {account.iban ? ` · ·· ${account.iban.slice(-4)}` : ""}
          </Text>
        </View>
      </View>
      <View style={{ marginHorizontal: 10 }}>
        <Spark
          data={series?.balance ?? []}
          labels={series?.days}
          width={64}
          height={18}
          interactive
          neg={(account.balance ?? 0) < 0}
          formatValue={(v) => formatEUR(v, { masked })}
        />
      </View>
      <View style={{ alignItems: "flex-end", minWidth: 64 }}>
        {account.loading ? (
          <ActivityIndicator size="small" color={t.accent} />
        ) : account.error ? (
          <Text
            style={{
              fontFamily: FMFonts.sansMedium,
              fontSize: 11,
              color: t.neg,
            }}
          >
            Error
          </Text>
        ) : (
          <Balance value={account.balance ?? 0} masked={masked} size={13} />
        )}
      </View>
    </Pressable>
  );
}

interface EmptyStateProps {
  onAdd: () => void;
  i18n: {
    no_accounts: string;
    no_accounts_hint: string;
    add_manual_account: string;
  };
}

function EmptyState({ onAdd, i18n }: EmptyStateProps) {
  const t = useFMTheme();
  return (
    <View
      style={[
        styles.empty,
        { borderColor: t.lineStrong, backgroundColor: t.surface },
      ]}
    >
      <View
        style={[
          styles.emptyCircle,
          { backgroundColor: t.surfaceAlt, borderColor: t.lineStrong },
        ]}
      >
        <IconPlus size={26} color={t.inkMuted} />
      </View>
      <Text
        style={{
          fontFamily: FMFonts.sansSemibold,
          fontSize: 14,
          color: t.ink,
          marginTop: 14,
        }}
      >
        {i18n.no_accounts}
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
        {i18n.no_accounts_hint}
      </Text>
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [
          styles.emptyBtn,
          { backgroundColor: t.ink, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text
          style={{
            fontFamily: FMFonts.sansMedium,
            fontSize: 13,
            color: t.bg,
          }}
        >
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


const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  statLabel: {
    fontFamily: FMFonts.sansSemibold,
    fontSize: 9.5,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statHero: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 10,
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
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  addButton: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    marginTop: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
  },
  emptyCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 6,
  },
});
