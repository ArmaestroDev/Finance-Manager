import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import {
  Avatar,
  Button,
  IconButton,
  IconLink,
  IconLinkOff,
  IconWallet,
  Label,
  ListItem,
  formatEUR,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { formatDate } from "@/src/shared/utils/date";
import type { Transaction } from "@/src/services/enableBanking";
import { useAccounts } from "../../accounts/context/AccountsContext";
import { accountDisplayName } from "../../accounts/utils/accountDisplay";
import { useTransactionLinks } from "../context/TransactionLinksContext";
import { useTransactionsContext } from "../context/TransactionsContext";
import { useTransactionLinkActions } from "../hooks/useTransactionLinkActions";
import { getStableTxId, getTransactionAmount, pickTransactionTitle } from "../utils/transactions";
import { LinkPickerSheet } from "./LinkPickerSheet";
import { PayFromAccountSheet } from "./PayFromAccountSheet";

interface TransactionLinkPanelProps {
  transaction: Transaction;
  /** Account the transaction belongs to (resolved from storage when omitted). */
  accountId?: string;
  /** Open a linked transaction (navigate to it). Rows aren't tappable without it. */
  onOpenTransaction?: (txId: string, accountId: string) => void;
}

/**
 * Everything about a transaction's links, for the detail pane / sheet:
 *  - expense: paid → reimbursed → your share, the reimbursements (each
 *    unlinkable), "pay from account" payments, and actions to add either;
 *  - incoming payment: the expense it reimburses, or "Link to expense";
 *  - "pay from account" payment: the expense it paid for.
 */
export function TransactionLinkPanel({ transaction, accountId, onOpenTransaction }: TransactionLinkPanelProps) {
  const t = useFMTheme();
  const { i18n, isBalanceHidden: masked } = useSettings();
  const { accounts } = useAccounts();
  const { findTransaction } = useTransactionsContext();
  const { linkIndex } = useTransactionLinks();
  const { linkReimbursements, payFromAccount, unlink } = useTransactionLinkActions();
  // Mode survives closing so the sheet doesn't switch content while fading out.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"reimbursements" | "expense">("reimbursements");
  const openPicker = (mode: "reimbursements" | "expense") => {
    setPickerMode(mode);
    setPickerOpen(true);
  };
  const [payVisible, setPayVisible] = useState(false);

  const txId = getStableTxId(transaction);
  const amount = getTransactionAmount(transaction);
  const anchor = useMemo(
    () => ({ tx: transaction, txId, accountId: accountId ?? findTransaction(txId)?.accountId ?? "" }),
    [transaction, txId, accountId, findTransaction],
  );
  const accountName = (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    return acc ? accountDisplayName(acc, i18n) : "";
  };

  const summary = linkIndex.summaries.get(txId);
  const parentId = linkIndex.childToParent.get(txId) ?? null;
  const hasManualAccounts = accounts.some((a) => a.type === "manual");

  // `byAccount`: "pay from account" rows are named after the paying account
  // (their own title only repeats the expense's).
  const linkedRow = (id: string, onUnlink: () => void, byAccount = false) => {
    const located = findTransaction(id);
    const tx = located?.tx;
    const a = tx ? getTransactionAmount(tx) : 0;
    const title = !tx
      ? i18n.link_missing
      : byAccount && located
        ? accountName(located.accountId) || pickTransactionTitle(tx)
        : pickTransactionTitle(tx);
    const open = located && onOpenTransaction ? () => onOpenTransaction(id, located.accountId) : undefined;
    return (
      <ListItem
        key={id}
        background={t.surfaceContainerHigh}
        onPress={open}
        accessibilityLabel={title}
        leading={<Avatar label={title} color={tx ? (a < 0 ? t.neg : t.pos) : t.inkMuted} size={32} />}
        title={<Text style={[styles.rowTitle, { color: t.ink }]} numberOfLines={1}>{title}</Text>}
        subtitle={
          located ? (
            <Text style={[styles.rowSub, { color: t.inkSoft }]} numberOfLines={1}>
              {formatDate(tx?.booking_date || tx?.value_date)}
              {byAccount ? "" : ` · ${accountName(located.accountId)}`}
            </Text>
          ) : undefined
        }
        trailing={
          tx ? (
            <Text
              style={{
                fontFamily: FMFonts.sansMedium,
                fontSize: FMType.body,
                color: a < 0 ? t.neg : t.pos,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatEUR(a, { showSign: true, masked })}
            </Text>
          ) : undefined
        }
        trailingAction={<IconButton size={32} icon={<IconLinkOff size={16} />} label={i18n.tx_unlink} onPress={onUnlink} />}
        style={styles.row}
      />
    );
  };

  const group = (label: string | null, ids: string[], unlinkFor: (id: string) => void, byAccount = false) => (
    <View>
      {label ? <Label style={{ marginBottom: 8 }}>{label}</Label> : null}
      <View style={[styles.group, { backgroundColor: t.surfaceContainerHigh }]}>
        {ids.map((id) => linkedRow(id, () => unlinkFor(id), byAccount))}
      </View>
    </View>
  );

  let body: React.ReactNode = null;

  if (parentId) {
    // A linked child: a reimbursement (incoming) or a "pay from account" payment.
    body = group(amount > 0 ? i18n.link_reimburses : i18n.link_paid_for, [parentId], () => void unlink(txId, parentId));
  } else if (amount > 0) {
    body = (
      <Button variant="tonal" icon={<IconLink size={16} />} onPress={() => openPicker("expense")} full>
        {i18n.link_expense_title}
      </Button>
    );
  } else if (amount < 0) {
    const reimbIds = [...(summary?.reimbursementIds ?? []), ...(summary?.missingIds ?? [])];
    const fundingIds = summary?.fundingIds ?? [];
    const share = summary && summary.original > 0 ? Math.min(1, summary.net / summary.original) : 1;
    body = (
      <View style={{ gap: 16 }}>
        {summary && summary.reimbursed > 0 ? (
          <View style={[styles.split, { backgroundColor: t.surfaceContainerHigh }]}>
            <Label>{i18n.link_your_share}</Label>
            <Text
              style={{
                fontFamily: FMFonts.display,
                fontSize: 28,
                lineHeight: 36,
                color: summary.net > 0 ? t.ink : t.inkSoft,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatEUR(-summary.net, { showSign: true, masked })}
            </Text>
            {/* paid = your share + reimbursed */}
            <View style={[styles.bar, { backgroundColor: t.pos }]} accessibilityElementsHidden>
              <View style={{ width: `${share * 100}%`, backgroundColor: t.neg, height: "100%" }} />
            </View>
            <View style={styles.legend}>
              <Legend color={t.pos} label={i18n.link_reimbursed} value={formatEUR(summary.reimbursed, { showSign: true, masked })} />
              <Legend label={i18n.link_paid} value={formatEUR(-summary.original, { showSign: true, masked })} />
            </View>
            {summary.over > 0 ? (
              <Text style={{ fontFamily: FMFonts.sans, fontSize: FMType.caption, color: t.warn, marginTop: 8 }}>
                {i18n.link_over_hint.replace("{amount}", formatEUR(summary.over, { masked }))}
              </Text>
            ) : null}
          </View>
        ) : null}
        {reimbIds.length > 0
          ? group(i18n.tx_reimbursements.replace("{count}", String(reimbIds.length)), reimbIds, (id) => void unlink(id, txId))
          : null}
        {fundingIds.length > 0 ? group(i18n.link_paid_from, fundingIds, (id) => void unlink(id, txId), true) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button variant="tonal" icon={<IconLink size={16} />} onPress={() => openPicker("reimbursements")}>
            {i18n.link_add_reimbursement}
          </Button>
          {hasManualAccounts ? (
            <Button variant="text" icon={<IconWallet size={16} />} onPress={() => setPayVisible(true)}>
              {i18n.pay_from_title}
            </Button>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View>
      {body}
      <LinkPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        anchor={anchor}
        mode={pickerMode}
        onConfirm={async (ids) => {
          if (pickerMode === "expense") await linkReimbursements([txId], ids[0]);
          else await linkReimbursements(ids, txId);
        }}
      />
      <PayFromAccountSheet
        visible={payVisible}
        onClose={() => setPayVisible(false)}
        accounts={accounts}
        excludeAccountId={anchor.accountId}
        // What the user really bears: the net share once friends paid back.
        defaultAmount={summary && summary.reimbursed > 0 ? summary.net : Math.abs(amount)}
        expenseTitle={pickTransactionTitle(transaction)}
        onPay={async (accId, value) => {
          await payFromAccount(transaction, accId, String(value));
          setPayVisible(false);
        }}
      />
    </View>
  );
}

function Legend({ color, label, value }: { color?: string; label: string; value: string }) {
  const t = useFMTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {color ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /> : null}
      <Text style={{ fontFamily: FMFonts.sans, fontSize: FMType.small, color: t.inkSoft }}>{label}</Text>
      <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.small, color: t.ink, fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: FMRadius.md,
    overflow: "hidden",
    paddingVertical: 4,
  },
  row: {
    paddingHorizontal: 12,
    minHeight: 56,
  },
  rowTitle: { fontFamily: FMFonts.sansMedium, fontSize: FMType.body },
  rowSub: { fontFamily: FMFonts.sans, fontSize: FMType.caption, marginTop: 1 },
  split: {
    borderRadius: FMRadius.md,
    padding: 16,
  },
  bar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 12,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    columnGap: 16,
    rowGap: 4,
    marginTop: 10,
  },
});
