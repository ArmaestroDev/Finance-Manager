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
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import {
  Balance,
  Button,
  IconChevD,
  IconEdit,
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
      <DesktopShell>
        <View style={[styles.center, { backgroundColor: t.bg }]}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      </DesktopShell>
    );
  }

  return (
    <DesktopShell onRefresh={() => refreshAccounts(true)}>
      <View style={[styles.page, { backgroundColor: t.bg }]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.pageTitle, { color: t.ink }]}>{i18n.accounts_title}</Text>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkSoft, marginTop: 4 }}>
              {accounts.length} accounts across {banksCount || 0} banks
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Button
              variant="secondary"
              icon={<IconEdit size={12} color={t.ink} />}
              onPress={openCashModal}
            >
              Edit cash
            </Button>
            <Button
              variant="primary"
              icon={<IconPlus size={12} color={t.bg} />}
              onPress={() => setAddAccountModalVisible(true)}
            >
              {i18n.add_manual_account}
            </Button>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label={i18n.net_worth}
            value={totalNetWorth}
            masked={masked}
            inverted
          />
          <StatCard label="Bank" value={totalBankBalance} masked={masked} />
          <StatCard label={i18n.cash_at_hand} value={cashBalance} masked={masked} editable onEdit={openCashModal} />
          <StatCard label={i18n.total_liabilities} value={totalLiabilities} masked={masked} />
        </View>

        {/* Sectioned tables */}
        {sectioned.length === 0 ? (
          <View style={[styles.empty, { borderColor: t.lineStrong }]}>
            <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 14, color: t.ink }}>
              {i18n.no_accounts}
            </Text>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkSoft, marginTop: 4 }}>
              {i18n.no_accounts_hint}
            </Text>
            <View style={{ marginTop: 14 }}>
              <Button variant="primary" icon={<IconPlus size={12} color={t.bg} />} onPress={() => setAddAccountModalVisible(true)}>
                {i18n.add_manual_account}
              </Button>
            </View>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {sectioned.map((sec) => (
              <SectionTable
                key={sec.cat}
                cat={sec.cat}
                label={labelFor(sec.cat, i18n)}
                accounts={sec.accounts}
                masked={masked}
                seriesByAccount={seriesByAccount}
                onPressAccount={(a) =>
                  router.push({
                    pathname: "/account/[id]",
                    params: { id: a.id, name: a.name, type: a.type },
                  })
                }
              />
            ))}
          </View>
        )}
      </View>

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
    </DesktopShell>
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

function StatCard({ label, value, masked, inverted, editable, onEdit }: StatCardProps) {
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
        { backgroundColor: bg, borderColor: inverted ? t.ink : t.line, opacity: pressed && editable ? 0.85 : 1 },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, opacity: labelOpacity }}>
        <Text style={[styles.statLabel, { color: labelColor }]}>{label}</Text>
        {editable ? <IconEdit size={10} color={labelColor} /> : null}
      </View>
      <View style={styles.statHero}>
        <Text
          style={{
            fontFamily: FMFonts.display,
            fontSize: 26,
            color: fg,
            lineHeight: 28,
            letterSpacing: -0.4,
          }}
        >
          {heroParts.sign}
          {heroParts.integer}
          <Text style={{ color: labelColor, opacity: labelOpacity }}>{heroParts.fraction}</Text>
        </Text>
        <Text
          style={{
            fontFamily: FMFonts.display,
            fontSize: 16,
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

interface SectionTableProps {
  cat: Cat;
  label: string;
  accounts: UnifiedAccount[];
  masked: boolean;
  seriesByAccount: Record<string, BalanceSeries>;
  onPressAccount: (a: UnifiedAccount) => void;
}

function SectionTable({
  label,
  accounts,
  masked,
  seriesByAccount,
  onPressAccount,
}: SectionTableProps) {
  const t = useFMTheme();
  const subtotal = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  return (
    <View style={[styles.tableWrap, { backgroundColor: t.surface, borderColor: t.line }]}>
      <View style={[styles.tableHead, { backgroundColor: t.surfaceAlt, borderBottomColor: t.line }]}>
        <View style={{ width: 18, alignItems: "center" }}>
          <IconChevD size={11} color={t.inkMuted} />
        </View>
        <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13, color: t.ink, marginLeft: 6 }}>
          {label}
        </Text>
        <Text
          style={{
            fontFamily: FMFonts.sansMedium,
            fontSize: 11,
            color: t.inkMuted,
            marginLeft: 10,
            fontVariant: ["tabular-nums"],
          }}
        >
          {accounts.length} accounts
        </Text>
        <View style={{ flex: 1 }} />
        <Balance value={subtotal} masked={masked} size={13} />
      </View>

      <View style={[styles.tableSubHead, { borderBottomColor: t.line }]}>
        <ColLabel style={{ width: 280 }}>Account</ColLabel>
        <ColLabel style={{ flex: 1 }}>Bank</ColLabel>
        <ColLabel style={{ flex: 1 }}>IBAN</ColLabel>
        <ColLabel style={{ width: 90 }}>Source</ColLabel>
        <ColLabel style={{ width: 90, textAlign: "right" }}>30 days</ColLabel>
        <ColLabel style={{ width: 130, textAlign: "right" }}>Balance</ColLabel>
      </View>

      {accounts.map((a) => (
        <Pressable
          key={a.id}
          onPress={() => onPressAccount(a)}
          style={({ pressed }) => [
            styles.tableRow,
            { borderTopColor: t.line, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[styles.cell, { width: 280, flexDirection: "row", alignItems: "center" }]}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: t.surfaceAlt,
                borderWidth: 1,
                borderColor: t.line,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 11, color: t.inkSoft }}>
                {(a.bankName || a.name).charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 12.5, color: t.ink }} numberOfLines={1}>
              {a.name}
            </Text>
          </View>
          <Text style={[styles.cellText, { flex: 1, color: t.inkSoft }]} numberOfLines={1}>
            {a.bankName || "—"}
          </Text>
          <Text
            style={[
              styles.cellText,
              {
                flex: 1,
                fontSize: 11,
                color: t.inkMuted,
                fontVariant: ["tabular-nums"],
              },
            ]}
            numberOfLines={1}
          >
            {a.iban ? "·· " + a.iban.slice(-9) : "—"}
          </Text>
          <View style={[styles.cell, { width: 90, flexDirection: "row", alignItems: "center" }]}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: a.type === "connected" ? t.pos : "transparent",
                borderWidth: a.type === "connected" ? 0 : 1,
                borderColor: t.inkMuted,
              }}
            />
            <Text
              style={{
                fontFamily: FMFonts.sansMedium,
                fontSize: 10.5,
                color: a.type === "connected" ? t.pos : t.inkMuted,
                marginLeft: 5,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              {a.type === "connected" ? "Live" : "Manual"}
            </Text>
          </View>
          <View style={[styles.cell, { width: 90, alignItems: "flex-end" }]}>
            <Spark
              data={seriesByAccount[a.id]?.balance ?? []}
              labels={seriesByAccount[a.id]?.days}
              width={78}
              height={18}
              interactive
              neg={(a.balance ?? 0) < 0}
              formatValue={(v) => formatEUR(v, { masked })}
            />
          </View>
          <View style={[styles.cell, { width: 130, alignItems: "flex-end" }]}>
            {a.loading ? (
              <ActivityIndicator size="small" color={t.accent} />
            ) : a.error ? (
              <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.neg }}>Error</Text>
            ) : (
              <Balance value={a.balance ?? 0} masked={masked} size={13} />
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function ColLabel({ children, style }: { children: React.ReactNode; style?: any }) {
  const t = useFMTheme();
  return (
    <Text
      style={[
        {
          fontFamily: FMFonts.sansSemibold,
          fontSize: 10,
          color: t.inkMuted,
          letterSpacing: 0.7,
          textTransform: "uppercase",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

function labelFor(cat: Cat, i18n: any): string {
  if (cat === "Giro") return i18n.cat_giro ?? "Giro";
  if (cat === "Savings") return i18n.cat_savings ?? "Savings";
  if (cat === "Stock") return i18n.cat_stock ?? "Stock";
  return cat;
}

const styles = StyleSheet.create({
  page: { padding: 24, flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  headerRow: {
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
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  statLabel: {
    fontFamily: FMFonts.sansSemibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statHero: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 10,
  },
  empty: {
    padding: 32,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
  },
  tableWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  tableSubHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderTopWidth: 1,
  },
  cell: {
    paddingRight: 8,
  },
  cellText: {
    fontFamily: FMFonts.sans,
    fontSize: 12,
    paddingRight: 8,
  },
});
