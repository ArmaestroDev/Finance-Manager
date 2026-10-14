import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import { MobileShell } from "@/src/shared/components/MobileShell";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
import {
  Avatar,
  Balance,
  Button,
  Card,
  EmptyState,
  IconBank,
  IconButton,
  IconEdit,
  IconLink,
  IconPlus,
  Label,
  ListItem,
  PressState,
  SectionTitle,
  Spark,
  formatEUR,
  splitForHero,
  stateColor,
  useFMTheme,
} from "@/src/shared/design";
import type { Strings } from "@/src/constants/Strings";
import type { UnifiedAccount } from "../../context/AccountsContext";
import { useAccountsScreen } from "../../hooks/useAccountsScreen";
import { useTransactionsContext } from "@/src/features/transactions/context/TransactionsContext";
import { useDateFilter } from "@/src/shared/context/DateFilterContext";
import { buildAccountBalanceSeries, type BalanceSeries } from "../../utils/balanceSeries";
import { CashModal } from "../CashModal";
import { AddAccountModal } from "../AddAccountModal";
import {
  ACCOUNT_CATEGORIES,
  accountBankLabel,
  accountCategoryLabel,
  accountDisplayName,
} from "../../utils/accountDisplay";

type I18n = typeof Strings.de;

export function AccountsScreen() {
  const t = useFMTheme();
  const router = useRouter();

  const {
    accounts,
    cashBalance,
    initialLoading,
    isRefreshing,
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

  // Quick-add deep links: /accounts?qa=manual|cash opens the matching modal
  // once, then clears the param so a back-navigation doesn't reopen it.
  const { qa } = useLocalSearchParams<{ qa?: string }>();
  useEffect(() => {
    if (!qa) return;
    if (qa === "manual") setAddAccountModalVisible(true);
    else if (qa === "cash") openCashModal();
    router.setParams({ qa: undefined } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qa]);

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
      ACCOUNT_CATEGORIES.map((cat) => ({
        cat,
        accounts: accounts.filter((a) => a.category === cat),
      })).filter((s) => s.accounts.length > 0),
    [accounts],
  );

  if (initialLoading && accounts.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  const addAccount = () => setAddAccountModalVisible(true);

  return (
    <MobileShell
      headerOverride={
        <MobileHeader
          title={i18n.accounts_title}
          right={
            <>
              <IconButton icon={<IconEdit size={20} />} label={i18n.acct_edit_cash} onPress={openCashModal} />
              <IconButton
                icon={<IconLink size={20} />}
                label={i18n.tab_connections}
                onPress={() => router.push("/connections" as never)}
              />
            </>
          }
        />
      }
      onRefresh={onRefresh}
      refreshing={isRefreshing}
    >
      <View style={styles.statsGrid}>
        <StatCard label={i18n.net_worth} value={totalNetWorth} masked={masked} highlight />
        <StatCard label={i18n.acct_bank_stat} value={totalBankBalance} masked={masked} />
        <StatCard
          label={i18n.cash_at_hand}
          value={cashBalance}
          masked={masked}
          onEdit={openCashModal}
          editLabel={i18n.acct_edit_cash}
        />
        <StatCard label={i18n.total_liabilities} value={totalLiabilities} masked={masked} />
      </View>

      {sectioned.length === 0 ? (
        <Card style={{ marginTop: 16 }}>
          <EmptyState
            icon={<IconBank />}
            title={i18n.no_accounts}
            body={i18n.no_accounts_hint}
            action={
              <Button icon={<IconPlus size={16} />} onPress={addAccount}>
                {i18n.add_manual_account}
              </Button>
            }
          />
        </Card>
      ) : (
        <View style={{ marginTop: 16, gap: 16 }}>
          {sectioned.map((sec) => {
            const subtotal = sec.accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
            return (
              <View key={sec.cat}>
                <View style={styles.sectionHead}>
                  <SectionTitle>{accountCategoryLabel(sec.cat, i18n)}</SectionTitle>
                  <Text style={[styles.subtotal, { color: t.inkSoft }]}>{formatEUR(subtotal, { masked })}</Text>
                </View>
                <Card padding={0} style={{ overflow: "hidden", paddingVertical: 4 }}>
                  {sec.accounts.map((a) => (
                    <AccountRow
                      key={a.id}
                      account={a}
                      masked={masked}
                      series={seriesByAccount[a.id]}
                      i18n={i18n}
                      onPress={() =>
                        router.push({
                          pathname: "/account/[id]",
                          params: { id: a.id, name: a.name, type: a.type },
                        })
                      }
                    />
                  ))}
                </Card>
              </View>
            );
          })}
          <Button variant="tonal" icon={<IconPlus size={16} />} onPress={addAccount} style={{ alignSelf: "center" }}>
            {i18n.add_manual_account}
          </Button>
        </View>
      )}

      <CashModal
        visible={isCashModalVisible}
        value={tempCashValue}
        onChangeText={setTempCashValue}
        onSave={handleSaveCash}
        onClose={() => setCashModalVisible(false)}
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
      />
    </MobileShell>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  masked: boolean;
  highlight?: boolean;
  onEdit?: () => void;
  editLabel?: string;
}

function StatCard({ label, value, masked, highlight, onEdit, editLabel }: StatCardProps) {
  const t = useFMTheme();
  const bg = highlight ? t.primaryContainer : t.surface;
  const fg = highlight ? t.onPrimaryContainer : t.ink;
  const soft = highlight ? t.onPrimaryContainer : t.inkSoft;
  const hero = splitForHero(value, masked);
  return (
    <Pressable
      onPress={onEdit}
      disabled={!onEdit}
      accessibilityRole={onEdit ? "button" : undefined}
      accessibilityLabel={onEdit ? editLabel : undefined}
      style={(s) => [styles.statCard, { backgroundColor: onEdit ? stateColor(bg, fg, s as PressState) : bg }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Label color={soft} style={{ flexShrink: 1 }}>
          {label}
        </Label>
        {onEdit ? <IconEdit size={13} color={soft} /> : null}
      </View>
      <View style={styles.statHero}>
        <Text style={[styles.heroText, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>
          {hero.sign}
          {hero.integer}
          <Text style={{ color: soft }}>{hero.fraction}</Text>
        </Text>
        <Text style={[styles.heroCurrency, { color: soft }]}>€</Text>
      </View>
    </Pressable>
  );
}

interface AccountRowProps {
  account: UnifiedAccount;
  masked: boolean;
  series?: BalanceSeries;
  i18n: I18n;
  onPress: () => void;
}

function AccountRow({ account, masked, series, i18n, onPress }: AccountRowProps) {
  const t = useFMTheme();
  const isConnected = account.type === "connected";
  const name = accountDisplayName(account, i18n);
  const meta = [
    isConnected ? i18n.acct_src_live : null,
    accountBankLabel(account, i18n),
    account.iban ? `·· ${account.iban.slice(-4)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <ListItem
      onPress={onPress}
      accessibilityLabel={name}
      background={t.surface}
      leading={<Avatar label={account.bankName || account.name} />}
      title={name}
      subtitle={meta || "—"}
      trailing={
        <View style={{ alignItems: "flex-end" }}>
          {account.loading ? (
            <ActivityIndicator size="small" color={t.primary} />
          ) : account.error ? (
            <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.small, color: t.error }}>
              {i18n.error_title}
            </Text>
          ) : (
            <Balance value={account.balance ?? 0} masked={masked} size={FMType.subhead} />
          )}
          <View style={{ marginTop: 4 }}>
            <Spark data={series?.balance ?? []} width={64} height={14} neg={(account.balance ?? 0) < 0} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flexBasis: "45%",
    flexGrow: 1,
    padding: 16,
    borderRadius: FMRadius.lg,
  },
  statHero: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
  },
  heroText: {
    fontFamily: FMFonts.display,
    fontSize: 24,
    lineHeight: 32,
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
  },
  heroCurrency: {
    fontFamily: FMFonts.display,
    fontSize: FMType.subhead,
    marginLeft: 4,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  subtotal: {
    fontFamily: FMFonts.sansMedium,
    fontSize: FMType.body,
    fontVariant: ["tabular-nums"],
  },
});
