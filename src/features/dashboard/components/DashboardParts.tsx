import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { Strings } from "@/src/constants/Strings";
import { FMFonts, FMRadius } from "@/src/constants/theme";
import type { UnifiedAccount } from "@/src/features/accounts/context/AccountsContext";
import { accountBankLabel, accountDisplayName } from "@/src/features/accounts/utils/accountDisplay";
import {
  getStableTxId,
  pickTransactionTitle,
} from "@/src/features/transactions/utils/transactions";
import { useTransactionLinks } from "@/src/features/transactions/context/TransactionLinksContext";
import { displayAmountFor } from "@/src/features/transactions/utils/links";
import type { Transaction } from "@/src/services/enableBanking";
import {
  Avatar,
  Balance,
  Button,
  Card,
  Chip,
  Donut,
  DonutSlice,
  EmptyState,
  IconAI,
  IconBank,
  IconCoins,
  IconWallet,
  IconWarn,
  Label,
  ListItem,
  Money,
  PressState,
  SectionTitle,
  formatEUR,
  stateColor,
  useFMTheme,
} from "@/src/shared/design";
import { formatDate } from "@/src/shared/utils/date";

// Building blocks shared by the desktop and mobile dashboards so both read as
// the same product: identical cards, list rows and states; only the grid differs.

type I18n = typeof Strings.de;

/** Card header: title on the left, optional trailing action(s). */
export function CardHeader({ title, right, inset = false }: { title: string; right?: React.ReactNode; inset?: boolean }) {
  return (
    <View style={[styles.cardHeader, inset && { paddingHorizontal: 16, paddingTop: 12 }]}>
      <SectionTitle style={{ flex: 1, minWidth: 0 }}>{title}</SectionTitle>
      {right ? <View style={styles.cardHeaderRight}>{right}</View> : null}
    </View>
  );
}

// ── Net worth hero ──────────────────────────────────────────────────────
export function NetWorthHero({
  i18n,
  heroParts,
  size,
  children,
}: {
  i18n: I18n;
  heroParts: { integer: string; fraction: string; sign: string };
  size: number;
  children?: React.ReactNode;
}) {
  const t = useFMTheme();
  return (
    <View>
      <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 16, lineHeight: 24, color: t.inkSoft }}>
        {i18n.net_worth}
      </Text>
      <View style={styles.heroRow}>
        <Text
          style={{
            fontFamily: FMFonts.display,
            fontSize: size,
            lineHeight: Math.round(size * 1.15),
            color: t.ink,
            fontVariant: ["tabular-nums"],
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {heroParts.sign}
          {heroParts.integer}
          <Text style={{ color: t.inkSoft }}>{heroParts.fraction}</Text>
          <Text style={{ fontSize: Math.round(size * 0.55), color: t.inkSoft }}> €</Text>
        </Text>
      </View>
      {children}
    </View>
  );
}

// ── View-mode chips (total / months / average) ──────────────────────────
export function ModeChips({
  i18n,
  viewMode,
  setViewMode,
  monthChips,
}: {
  i18n: I18n;
  viewMode: string;
  setViewMode: (m: string) => void;
  monthChips: { key: string; label: string }[];
}) {
  const options = [
    { key: "total", label: i18n.total },
    ...monthChips,
    { key: "avg", label: i18n.average },
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: "row", gap: 8, paddingRight: 4 }}
      style={{ marginBottom: 16, flexGrow: 0 }}
    >
      {options.map((o) => (
        <Chip key={o.key} filter active={viewMode === o.key} onPress={() => setViewMode(o.key)}>
          {o.label}
        </Chip>
      ))}
    </ScrollView>
  );
}

// ── Category breakdown (donut + legend) ─────────────────────────────────
export interface LegendRow {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
  hasEstimate: boolean;
  remaining: number;
  over: boolean;
  ratio: number;
}

export function CategoryBreakdown({
  i18n,
  masked,
  slices,
  totalExp,
  donutLabel,
  legendRows,
  statsLoading,
  onCategoryPress,
  stacked,
}: {
  i18n: I18n;
  masked: boolean;
  slices: DonutSlice[];
  totalExp: number;
  donutLabel: string;
  legendRows: LegendRow[];
  statsLoading: boolean;
  onCategoryPress: (id: string) => void;
  /** Mobile: donut above the legend, progress bar under each name. */
  stacked?: boolean;
}) {
  const t = useFMTheme();
  if (legendRows.length === 0) {
    return <EmptyState icon={<IconCoins />} title={statsLoading ? i18n.loading : i18n.dash_no_cat_expenses} />;
  }
  const donutSize = stacked ? 160 : 180;
  return (
    <View style={stacked ? null : styles.donutBody}>
      {slices.length > 0 ? (
        <View style={[{ width: donutSize, height: donutSize }, stacked && { alignSelf: "center", marginBottom: 16 }]}>
          <Donut slices={slices} size={donutSize} thick={24} masked={masked} />
          <View style={[styles.donutCenter, { pointerEvents: "none" }]}>
            <Label>{donutLabel}</Label>
            <Text
              style={{
                fontFamily: FMFonts.sansMedium,
                fontSize: 18,
                color: t.ink,
                marginTop: 2,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatEUR(totalExp, { masked })}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={{ flex: stacked ? undefined : 1, marginLeft: !stacked && slices.length > 0 ? 24 : 0, gap: 2 }}>
        {legendRows.map((row) => {
          const barColor = row.over ? t.neg : row.color;
          const meta = masked
            ? "··"
            : row.hasEstimate
              ? `${formatEUR(Math.abs(row.remaining))} ${row.over ? i18n.over_budget : i18n.under_budget}`
              : `${Math.round(row.ratio * 100)}%`;
          const bar = (
            <View style={[styles.track, { backgroundColor: t.surfaceContainerHighest }, stacked ? { marginTop: 6 } : styles.trackInline]}>
              <View style={{ width: `${row.ratio * 100}%` as `${number}%`, height: "100%", backgroundColor: barColor, borderRadius: 3 }} />
            </View>
          );
          return (
            <Pressable
              key={row.categoryId}
              onPress={() => onCategoryPress(row.categoryId)}
              accessibilityRole="button"
              accessibilityLabel={row.name}
            >
              {(s) => (
                <View style={[styles.legendRow, { backgroundColor: stateColor(t.surface, t.ink, s as PressState) }]}>
                  <View style={[styles.legendDot, { backgroundColor: row.color }]} />
                  {stacked ? (
                    <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                      <Text style={[styles.legendName, { color: t.ink }]} numberOfLines={1}>{row.name}</Text>
                      {bar}
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.legendName, { color: t.ink, flex: 1, marginLeft: 12 }]} numberOfLines={1}>
                        {row.name}
                      </Text>
                      {bar}
                    </>
                  )}
                  <View style={{ width: stacked ? undefined : 140, alignItems: "flex-end", marginLeft: 12 }}>
                    <Balance value={-row.amount} masked={masked} size={14} />
                    <Text
                      style={{ fontFamily: FMFonts.sans, fontSize: 12, marginTop: 2, color: row.over ? t.neg : t.inkSoft, fontVariant: ["tabular-nums"] }}
                      numberOfLines={1}
                    >
                      {meta}
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Uncategorized banner ────────────────────────────────────────────────
export function UncategorizedCard({
  i18n,
  count,
  amount,
  masked,
  onPress,
}: {
  i18n: I18n;
  count: number;
  amount: number;
  masked: boolean;
  onPress: () => void;
}) {
  const t = useFMTheme();
  return (
    <Card variant="tonal">
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <Avatar icon={<IconWarn size={18} color={t.warn} />} color={t.warn} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 16, lineHeight: 24, color: t.ink }}>
            {count} {i18n.uncategorized.toLowerCase()} · {formatEUR(amount, { masked })}
          </Text>
          <Text style={{ fontFamily: FMFonts.sans, fontSize: 14, lineHeight: 20, color: t.inkSoft }}>
            {i18n.dash_uncat_excluded}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <Button size="sm" icon={<IconAI size={14} />} onPress={onPress}>
              {i18n.auto_categorize}
            </Button>
            <Button size="sm" variant="text" onPress={onPress}>
              {i18n.dash_review_manually}
            </Button>
          </View>
        </View>
      </View>
    </Card>
  );
}

// ── Recent transactions ─────────────────────────────────────────────────
export function RecentCard({
  i18n,
  recent,
  masked,
  categoryFor,
  onViewAll,
  style,
}: {
  i18n: I18n;
  recent: Transaction[];
  masked: boolean;
  categoryFor: (txId: string) => { name: string; color: string } | null;
  onViewAll: () => void;
  style?: object;
}) {
  const t = useFMTheme();
  const { linkIndex } = useTransactionLinks();
  return (
    <Card padding={0} style={[{ paddingBottom: 8, overflow: "hidden" }, style]}>
      <CardHeader
        inset
        title={i18n.dash_recent}
        right={<Button variant="text" size="sm" onPress={onViewAll}>{i18n.dash_view_all}</Button>}
      />
      {recent.length === 0 ? (
        <EmptyState title={i18n.dash_no_recent} />
      ) : (
        recent.map((tx, i) => {
          const cat = categoryFor(getStableTxId(tx));
          const title = pickTransactionTitle(tx);
          const date = tx.booking_date || tx.value_date || "";
          return (
            <ListItem
              key={(tx.transaction_id ?? "") + i}
              background={t.surface}
              onPress={onViewAll}
              accessibilityLabel={title}
              leading={
                cat ? (
                  <Avatar label={title} color={cat.color} />
                ) : (
                  <Avatar icon={<IconWarn size={18} color={t.warn} />} color={t.warn} />
                )
              }
              title={title}
              subtitle={
                <Text style={{ fontFamily: FMFonts.sans, fontSize: 14, lineHeight: 20, color: t.inkSoft }} numberOfLines={1}>
                  {formatDate(date)} ·{" "}
                  {cat ? cat.name : <Text style={{ color: t.warn }}>{i18n.uncategorized}</Text>}
                </Text>
              }
              // Net share for reimbursed expenses, like every other list.
              trailing={<Money value={displayAmountFor(tx, linkIndex)} masked={masked} size={15} />}
            />
          );
        })
      )}
    </Card>
  );
}

// ── Accounts ────────────────────────────────────────────────────────────
export function AccountsCard({
  i18n,
  accounts,
  masked,
  limit,
  onManage,
  onOpen,
  style,
}: {
  i18n: I18n;
  accounts: UnifiedAccount[];
  masked: boolean;
  limit: number;
  onManage: () => void;
  onOpen: (id: string) => void;
  style?: object;
}) {
  const t = useFMTheme();
  return (
    <Card padding={0} style={[{ paddingBottom: 8, overflow: "hidden" }, style]}>
      <CardHeader
        inset
        title={i18n.tab_accounts}
        right={<Button variant="text" size="sm" onPress={onManage}>{i18n.dash_manage}</Button>}
      />
      {accounts.length === 0 ? (
        <EmptyState icon={<IconBank />} title={i18n.no_accounts} />
      ) : (
        accounts.slice(0, limit).map((a) => {
          const name = accountDisplayName(a, i18n);
          return (
            <ListItem
              key={a.id}
              background={t.surface}
              onPress={() => onOpen(a.id)}
              accessibilityLabel={name}
              leading={<Avatar icon={a.type === "connected" ? <IconBank size={18} /> : <IconWallet size={18} />} />}
              title={name}
              subtitle={accountBankLabel(a, i18n) ?? i18n.acct_src_manual}
              trailing={<Balance value={a.balance ?? 0} masked={masked} size={15} />}
            />
          );
        })
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    marginBottom: 8,
  },
  cardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 },
  heroRow: { flexDirection: "row", alignItems: "baseline", marginTop: 4 },
  donutBody: { flexDirection: "row", alignItems: "center" },
  donutCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: FMRadius.sm,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { fontFamily: FMFonts.sans, fontSize: 14, lineHeight: 20 },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  trackInline: { flex: 1, maxWidth: 220, marginHorizontal: 16 },
});
