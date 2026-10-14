import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, TextStyle, View } from "react-native";
import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import {
  Button,
  EmptyState,
  IconAI,
  IconButton,
  IconCheck,
  IconClose,
  IconLink,
  IconSearch,
  Label,
  PressState,
  formatEUR,
  stateColor,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { formatDate } from "@/src/shared/utils/date";
import { useAccounts } from "../../accounts/context/AccountsContext";
import { accountDisplayName } from "../../accounts/utils/accountDisplay";
import { useDebts } from "../../debts/context/DebtsContext";
import { useTransactionLinks } from "../context/TransactionLinksContext";
import { useTransactionsContext } from "../context/TransactionsContext";
import {
  rankExpenseCandidates,
  rankReimbursementCandidates,
  type LocatedTx,
  type RankedCandidate,
} from "../utils/links";
import { getTransactionAmount, pickTransactionTitle } from "../utils/transactions";

/** Rows rendered per section; search narrows the rest. */
const MAX_ROWS = 60;

interface LinkPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The transaction the sheet was opened from. */
  anchor: LocatedTx | null;
  /**
   * "reimbursements": anchor is an expense, pick one or more incoming
   * payments. "expense": anchor is an incoming payment, pick its expense.
   */
  mode: "reimbursements" | "expense";
  /** Called with the picked ids (child ids, or a single parent id). */
  onConfirm: (txIds: string[]) => Promise<void> | void;
}

/**
 * Searchable picker over every stored transaction of every account (any
 * date — a reimbursement may land on another account or after the selected
 * range). Plausible candidates come first (utils/links.ts ranking).
 */
export function LinkPickerSheet({ visible, onClose, anchor, mode, onConfirm }: LinkPickerSheetProps) {
  const t = useFMTheme();
  const { i18n, isBalanceHidden: masked } = useSettings();
  const { accounts } = useAccounts();
  const { entities } = useDebts();
  const { allStoredTransactions } = useTransactionsContext();
  const { linkIndex } = useTransactionLinks();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSearch("");
      setSelected([]);
    }
  }, [visible]);

  const accountName = useMemo(() => {
    const m = new Map(accounts.map((a) => [a.id, accountDisplayName(a, i18n)]));
    return (id: string) => m.get(id) ?? "";
  }, [accounts, i18n]);

  // While closed, keep the last list so the fade-out doesn't flash "none".
  const lastRanked = useRef<RankedCandidate[]>([]);
  const ranked = useMemo<RankedCandidate[]>(() => {
    if (!visible) return lastRanked.current;
    if (!anchor) return [];
    const opts = { linkIndex, personNames: entities.filter((e) => e.type === "person").map((e) => e.name) };
    return mode === "reimbursements"
      ? rankReimbursementCandidates(anchor, allStoredTransactions, opts)
      : rankExpenseCandidates(anchor, allStoredTransactions, opts);
  }, [anchor, visible, mode, allStoredTransactions, linkIndex, entities]);
  useEffect(() => {
    lastRanked.current = ranked;
  }, [ranked]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? ranked.filter((c) => {
        const hay = [
          pickTransactionTitle(c.tx),
          formatDate(c.tx.booking_date || c.tx.value_date),
          formatEUR(c.amount),
          String(Math.abs(c.amount)).replace(".", ","),
          accountName(c.accountId),
          ...(c.tx.remittance_information ?? []),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
    : ranked;
  const suggested = filtered.filter((c) => c.suggested);
  const others = filtered.filter((c) => !c.suggested);

  const multi = mode === "reimbursements";
  const toggle = (txId: string) =>
    setSelected((prev) =>
      multi ? (prev.includes(txId) ? prev.filter((x) => x !== txId) : [...prev, txId]) : prev[0] === txId ? [] : [txId],
    );

  // Live preview of the expense's net share with the current selection.
  let preview: string | null = null;
  if (anchor && selected.length > 0) {
    const byId = new Map(ranked.map((c) => [c.txId, c]));
    if (multi) {
      const original = Math.abs(getTransactionAmount(anchor.tx));
      const already = linkIndex.summaries.get(anchor.txId)?.reimbursed ?? 0;
      const picked = selected.reduce((s, id) => s + (byId.get(id)?.amount ?? 0), 0);
      preview = i18n.link_preview_share.replace("{amount}", formatEUR(-Math.max(0, original - already - picked), { masked }));
    } else {
      const parent = byId.get(selected[0]);
      if (parent) {
        const s = linkIndex.summaries.get(parent.txId);
        const net = Math.max(0, Math.abs(parent.amount) - (s?.reimbursed ?? 0) - getTransactionAmount(anchor.tx));
        preview = i18n.link_preview_share.replace("{amount}", formatEUR(-net, { masked }));
      }
    }
  }

  const confirm = async () => {
    if (selected.length === 0 || busy) return;
    setBusy(true);
    try {
      await onConfirm(selected);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const renderRow = (c: RankedCandidate) => {
    const isSel = selected.includes(c.txId);
    const title = pickTransactionTitle(c.tx);
    return (
      <Pressable
        key={c.txId}
        onPress={() => toggle(c.txId)}
        accessibilityRole={multi ? "checkbox" : "radio"}
        accessibilityLabel={`${title} ${formatEUR(c.amount, { showSign: true, masked })}`}
        accessibilityState={{ checked: isSel }}
      >
        {(st) => (
          <View
            style={[
              styles.row,
              { backgroundColor: stateColor(isSel ? t.secondaryContainer : "transparent", t.ink, st as PressState) },
            ]}
          >
            <View
              style={[
                styles.check,
                {
                  borderRadius: multi ? 3 : 10,
                  borderColor: isSel ? t.primary : t.onSurfaceVariant,
                  backgroundColor: isSel && multi ? t.primary : "transparent",
                },
              ]}
            >
              {isSel ? (
                multi ? (
                  <IconCheck size={14} color={t.onPrimary} />
                ) : (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.primary }} />
                )
              ) : null}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{ fontFamily: FMFonts.sans, fontSize: FMType.subhead, color: isSel ? t.onSecondaryContainer : t.ink }}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text
                style={{ fontFamily: FMFonts.sans, fontSize: FMType.small, color: t.inkSoft, marginTop: 2 }}
                numberOfLines={1}
              >
                {formatDate(c.tx.booking_date || c.tx.value_date)} · {accountName(c.accountId)}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: FMFonts.sansMedium,
                fontSize: FMType.body,
                color: c.amount < 0 ? t.neg : t.pos,
                marginLeft: 12,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatEUR(c.amount, { showSign: true, masked })}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  const section = (label: string, list: RankedCandidate[], icon?: React.ReactElement<{ color?: string }>) =>
    list.length === 0 ? null : (
      <View style={{ marginTop: 8 }}>
        <View style={styles.sectionHead}>
          {icon ? React.cloneElement(icon, { color: t.primary }) : null}
          <Label color={icon ? t.primary : undefined}>{label}</Label>
        </View>
        {list.slice(0, MAX_ROWS).map(renderRow)}
        {list.length > MAX_ROWS ? (
          <Text style={[styles.more, { color: t.inkSoft }]}>
            {i18n.link_more_results.replace("{count}", String(list.length - MAX_ROWS))}
          </Text>
        ) : null}
      </View>
    );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={multi ? i18n.link_reimb_title : i18n.link_expense_title}
      subtitle={anchor ? `${pickTransactionTitle(anchor.tx)} · ${formatEUR(getTransactionAmount(anchor.tx), { showSign: true, masked })}` : undefined}
      width={560}
      actions={
        <>
          <Button variant="text" onPress={onClose}>
            {i18n.cancel}
          </Button>
          <Button onPress={confirm} disabled={selected.length === 0} loading={busy} icon={<IconLink size={16} />}>
            {i18n.link_confirm.replace("{count}", String(selected.length))}
          </Button>
        </>
      }
    >
      <View style={[styles.search, { backgroundColor: t.surfaceContainerHigh }]}>
        <IconSearch size={18} color={t.onSurfaceVariant} />
        <TextInput
          placeholder={multi ? i18n.link_reimb_filter_ph : i18n.link_expense_filter_ph}
          placeholderTextColor={t.onSurfaceVariant}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel={i18n.search_label}
          selectionColor={t.primary}
          style={[NO_WEB_OUTLINE, styles.searchInput, { color: t.ink }]}
        />
        {search ? (
          <IconButton size={32} icon={<IconClose size={16} />} label={i18n.clear} onPress={() => setSearch("")} />
        ) : null}
      </View>
      <ScrollView style={{ maxHeight: 400, marginHorizontal: -24 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<IconLink />}
            title={q ? i18n.link_expense_none_match : multi ? i18n.link_reimb_none : i18n.link_expense_none}
          />
        ) : (
          <>
            {section(i18n.link_suggested, suggested, <IconAI size={14} />)}
            {section(i18n.link_others, others)}
          </>
        )}
      </ScrollView>
      {/* Space is reserved even without a selection so the dialog keeps its
          height when the preview appears. */}
      <View
        style={[styles.preview, { backgroundColor: preview ? t.secondaryContainer : "transparent" }]}
        accessibilityLiveRegion="polite"
      >
        <Text
          style={{ fontFamily: FMFonts.sansMedium, fontSize: FMType.body, lineHeight: 20, color: t.onSecondaryContainer, fontVariant: ["tabular-nums"] }}
        >
          {preview ?? " "}
        </Text>
      </View>
    </Sheet>
  );
}

// The search field draws its own container.
const NO_WEB_OUTLINE = { outlineStyle: "none" } as unknown as TextStyle;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
    paddingVertical: 8,
    paddingHorizontal: 24,
    gap: 16,
  },
  check: {
    width: 20,
    height: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 8,
    gap: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: FMFonts.sans,
    fontSize: FMType.subhead,
    paddingVertical: 0,
  },
  preview: {
    marginTop: 12,
    borderRadius: FMRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  more: {
    textAlign: "center",
    fontSize: FMType.caption,
    paddingVertical: 8,
  },
});
