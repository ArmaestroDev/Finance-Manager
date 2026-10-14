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
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import {
  Avatar,
  Balance,
  Button,
  Card,
  EmptyState,
  IconBank,
  IconEdit,
  IconPlus,
  Label,
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
  accountCountLabel,
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
      <DesktopShell title={i18n.accounts_title}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      </DesktopShell>
    );
  }

  const addAccount = () => setAddAccountModalVisible(true);

  return (
    <DesktopShell
      title={i18n.accounts_title}
      onRefresh={() => refreshAccounts(true)}
      actions={
        <>
          <Button variant="outlined" icon={<IconEdit size={16} />} onPress={openCashModal}>
            {i18n.acct_edit_cash}
          </Button>
          <Button icon={<IconPlus size={16} />} onPress={addAccount}>
            {i18n.add_manual_account}
          </Button>
        </>
      }
    >
      <View style={styles.page}>
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
          <Card>
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
          sectioned.map((sec) => (
            <SectionTable
              key={sec.cat}
              label={accountCategoryLabel(sec.cat, i18n)}
              i18n={i18n}
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
          ))
        )}
      </View>

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
    </DesktopShell>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  masked: boolean;
  /** Emphasised (primaryContainer) card — the headline figure. */
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
        <Label color={soft}>{label}</Label>
        {onEdit ? <IconEdit size={13} color={soft} /> : null}
      </View>
      <View style={styles.statHero}>
        <Text style={[styles.heroText, { color: fg }]} numberOfLines={1}>
          {hero.sign}
          {hero.integer}
          <Text style={{ color: soft }}>{hero.fraction}</Text>
        </Text>
        <Text style={[styles.heroCurrency, { color: soft }]}>€</Text>
      </View>
    </Pressable>
  );
}

interface SectionTableProps {
  label: string;
  i18n: I18n;
  accounts: UnifiedAccount[];
  masked: boolean;
  seriesByAccount: Record<string, BalanceSeries>;
  onPressAccount: (a: UnifiedAccount) => void;
}

function SectionTable({
  label,
  i18n,
  accounts,
  masked,
  seriesByAccount,
  onPressAccount,
}: SectionTableProps) {
  const t = useFMTheme();
  const subtotal = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <View style={styles.tableHead}>
        <SectionTitle>{label}</SectionTitle>
        <Text style={[styles.count, { color: t.inkSoft }]}>{accountCountLabel(accounts.length, i18n)}</Text>
        <View style={{ flex: 1 }} />
        <Balance value={subtotal} masked={masked} size={FMType.subhead} />
      </View>

      <View style={styles.tableSubHead}>
        <Label style={{ flex: 2.2, minWidth: 220, paddingLeft: 52 }}>{i18n.acct_col_account}</Label>
        <Label style={{ flex: 1.3 }}>{i18n.acct_col_bank}</Label>
        <Label style={{ flex: 1 }}>{i18n.acct_col_iban}</Label>
        <Label style={{ width: 96 }}>{i18n.acct_col_source}</Label>
        <Label style={{ width: 96, textAlign: "right" }}>{i18n.acct_col_30days}</Label>
        <Label style={{ width: 136, textAlign: "right" }}>{i18n.acct_balance_label}</Label>
      </View>

      {accounts.map((a) => {
        const live = a.type === "connected";
        const name = accountDisplayName(a, i18n);
        return (
          <Pressable
            key={a.id}
            onPress={() => onPressAccount(a)}
            accessibilityRole="button"
            accessibilityLabel={name}
            style={(s) => [styles.tableRow, { backgroundColor: stateColor(t.surface, t.ink, s as PressState) }]}
          >
            <View style={[styles.cell, { flex: 2.2, minWidth: 220, flexDirection: "row", alignItems: "center" }]}>
              <Avatar label={a.bankName || a.name} size={36} />
              <Text style={[styles.name, { color: t.ink }]} numberOfLines={1}>
                {name}
              </Text>
            </View>
            <Text style={[styles.cellText, { flex: 1.3, color: t.inkSoft }]} numberOfLines={1}>
              {accountBankLabel(a, i18n) ?? "—"}
            </Text>
            <Text style={[styles.cellText, { flex: 1, color: t.inkSoft, fontVariant: ["tabular-nums"] }]} numberOfLines={1}>
              {a.iban ? "·· " + a.iban.slice(-9) : "—"}
            </Text>
            <View style={[styles.cell, { width: 96 }]}>
              <View style={[styles.srcChip, { backgroundColor: live ? t.posSoft : t.surfaceContainerHigh }]}>
                <View style={[styles.srcDot, { backgroundColor: live ? t.pos : t.inkMuted }]} />
                <Text style={[styles.srcText, { color: live ? t.pos : t.inkSoft }]}>
                  {live ? i18n.acct_src_live : i18n.acct_src_manual}
                </Text>
              </View>
            </View>
            <View style={[styles.cell, { width: 96, alignItems: "flex-end" }]}>
              <Spark
                data={seriesByAccount[a.id]?.balance ?? []}
                labels={seriesByAccount[a.id]?.days}
                width={80}
                height={20}
                interactive
                neg={(a.balance ?? 0) < 0}
                formatValue={(v) => formatEUR(v, { masked })}
              />
            </View>
            <View style={[styles.cell, { width: 136, alignItems: "flex-end", paddingRight: 0 }]}>
              {a.loading ? (
                <ActivityIndicator size="small" color={t.primary} />
              ) : a.error ? (
                <Text style={[styles.cellText, { color: t.error }]}>{i18n.error_title}</Text>
              ) : (
                <Balance value={a.balance ?? 0} masked={masked} size={FMType.bodyLg} />
              )}
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 24, paddingBottom: 32, gap: 16, flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    padding: 20,
    borderRadius: FMRadius.lg,
  },
  statHero: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
  },
  heroText: {
    fontFamily: FMFonts.display,
    fontSize: 32,
    lineHeight: 40,
    fontVariant: ["tabular-nums"],
  },
  heroCurrency: {
    fontFamily: FMFonts.display,
    fontSize: FMType.h1,
    marginLeft: 4,
  },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  count: {
    fontFamily: FMFonts.sans,
    fontSize: FMType.body,
    marginLeft: 12,
    fontVariant: ["tabular-nums"],
  },
  tableSubHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    minHeight: 60,
    paddingVertical: 8,
  },
  cell: {
    paddingRight: 12,
  },
  cellText: {
    fontFamily: FMFonts.sans,
    fontSize: FMType.body,
    paddingRight: 12,
  },
  name: {
    flex: 1,
    fontFamily: FMFonts.sansMedium,
    fontSize: FMType.subhead,
    marginLeft: 16,
  },
  srcChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    height: 24,
    paddingHorizontal: 8,
    borderRadius: FMRadius.sm,
  },
  srcDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  srcText: { fontFamily: FMFonts.sansMedium, fontSize: FMType.caption },
});
