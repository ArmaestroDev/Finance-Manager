import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import {
  Button,
  Chip,
  IconEdit,
  Label,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import type { Transaction } from "@/src/services/enableBanking";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { formatDate } from "@/src/shared/utils/date";
import {
  cleanRemittanceInfo,
  getStableTxId,
  getTransactionAmount,
  pickTransactionTitle,
} from "../utils/transactions";
import { CategoryPickerModal } from "./CategoryPickerModal";
import { useTransactionLinks } from "../context/TransactionLinksContext";
import { TransactionLinkPanel } from "./TransactionLinkPanel";

interface TransactionCategory {
  id: string;
  name: string;
  color: string;
  system?: "ignore";
}

interface TransactionDetailModalProps {
  visible: boolean;
  transaction: Transaction | null;
  categories: TransactionCategory[];
  categoryColors: string[];
  getCategoryForTransaction: (txId: string) => TransactionCategory | null;
  onAssignCategory: (txId: string, categoryId: string | null) => void;
  onCreateCategory: (name: string, color: string) => Promise<string>;
  onClose: () => void;
  onEdit?: (tx: Transaction) => void;
  type: "connected" | "manual";
  /** Account of the transaction (for the link picker). */
  accountId?: string;
  /** Open a linked transaction (e.g. navigate to it). */
  onOpenTransaction?: (txId: string, accountId: string) => void;
}

export function TransactionDetailModal({
  visible,
  transaction,
  categories,
  categoryColors,
  getCategoryForTransaction,
  onAssignCategory,
  onCreateCategory,
  onClose,
  onEdit,
  type,
  accountId,
  onOpenTransaction,
}: TransactionDetailModalProps) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  const { getDisplayAmount } = useTransactionLinks();
  const [pickerVisible, setPickerVisible] = useState(false);
  if (!transaction) return null;

  const amount = getTransactionAmount(transaction);
  const isNeg = amount < 0;
  const txId = getStableTxId(transaction);
  const txCat = getCategoryForTransaction(txId);
  // A reimbursed expense shows the user's share (utils/links.ts).
  const displayAmount = getDisplayAmount(transaction);
  const heroParts = splitForHero(displayAmount);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={pickTransactionTitle(transaction)}
      subtitle={`${formatDate(transaction.booking_date || transaction.value_date)} · ${
        type === "manual" ? i18n.tx_source_manual : i18n.tx_source_connected
      }`}
      width={520}
      actions={
        type === "manual" && onEdit ? (
          <Button
            variant="tonal"
            icon={<IconEdit size={16} />}
            onPress={() => {
              onClose();
              onEdit(transaction);
            }}
          >
            {i18n.edit}
          </Button>
        ) : undefined
      }
    >
      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        {/* Hero amount */}
        <View style={styles.heroCard} accessibilityLabel={i18n.amount_label}>
          <View style={styles.heroRow}>
            <Text
              style={{
                fontFamily: FMFonts.display,
                fontSize: 36,
                color: displayAmount < 0 ? t.neg : displayAmount > 0 ? t.pos : t.inkSoft,
                lineHeight: 44,
                fontVariant: ["tabular-nums"],
              }}
            >
              {displayAmount < 0 ? "−" : displayAmount > 0 ? "+" : ""}
              {heroParts.integer}
              <Text style={{ color: t.inkSoft }}>{heroParts.fraction}</Text>
            </Text>
            <Text style={{ fontFamily: FMFonts.display, fontSize: FMType.title, color: t.inkSoft, marginLeft: 4 }}>
              {currencySymbol(transaction.transaction_amount?.currency)}
            </Text>
          </View>
        </View>

        {/* Category picker */}
        <View style={{ marginTop: 16 }}>
          <Label style={{ marginBottom: 8 }}>{i18n.category_label}</Label>
          <View style={styles.catPills}>
            <CatPill
              label={i18n.tx_cat_none}
              active={!txCat}
              onPress={() => onAssignCategory(txId, null)}
            />
            {categories.map((cat) => {
              const isIncomeCat =
                cat.name.toLowerCase() === "income" ||
                cat.name.toLowerCase() === "einkommen";
              const isSystemIgnore = cat.system === "ignore";
              const isDisabled = isSystemIgnore
                ? false
                : isNeg
                  ? isIncomeCat
                  : !isIncomeCat;
              return (
                <CatPill
                  key={cat.id}
                  label={cat.name}
                  color={cat.color}
                  active={txCat?.id === cat.id}
                  disabled={isDisabled}
                  onPress={() => onAssignCategory(txId, cat.id)}
                />
              );
            })}
            <CatPill label={i18n.tx_cat_new_short} onPress={() => setPickerVisible(true)} />
          </View>
        </View>

        <CategoryPickerModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          categories={categories}
          categoryColors={categoryColors}
          activeCategoryId={txCat?.id ?? null}
          onSelect={(catId) => onAssignCategory(txId, catId)}
          onCreate={onCreateCategory}
        />

        {/* Links: reimbursements / "pay from account" / linked expense */}
        <View style={{ marginTop: 16 }}>
          <TransactionLinkPanel
            transaction={transaction}
            accountId={accountId}
            onOpenTransaction={onOpenTransaction}
          />
        </View>

        {/* Detail rows */}
        <View style={[styles.details, { backgroundColor: t.surfaceContainerHigh }]}>
          {/* "Self" is the placeholder party of manual/imported rows, not a name. */}
          {isRealParty(transaction.creditor?.name) ? (
            <DetailRow label={i18n.tx_creditor} value={transaction.creditor!.name!} />
          ) : null}
          {isRealParty(transaction.debtor?.name) ? (
            <DetailRow label={i18n.tx_debtor} value={transaction.debtor!.name!} />
          ) : null}
          {transaction.booking_date ? (
            <DetailRow label={i18n.tx_booking_date} value={formatDate(transaction.booking_date)} mono />
          ) : null}
          {transaction.value_date ? (
            <DetailRow label={i18n.tx_value_date} value={formatDate(transaction.value_date)} mono />
          ) : null}
          {transaction.credit_debit_indicator ? (
            <DetailRow
              label={i18n.tx_type}
              value={transaction.credit_debit_indicator === "CRDT" ? i18n.tx_type_credit : i18n.tx_type_debit}
            />
          ) : null}
          {transaction.remittance_information && transaction.remittance_information.length > 0 ? (
            <View style={styles.detailColumn}>
              <Label>{i18n.tx_reference}</Label>
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  fontSize: FMType.body,
                  color: t.ink,
                  marginTop: 4,
                  lineHeight: 20,
                }}
              >
                {cleanRemittanceInfo(transaction.remittance_information)}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Sheet>
  );
}

function CatPill({
  label,
  color,
  active,
  disabled,
  onPress,
}: {
  label: string;
  color?: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={{ opacity: disabled ? 0.38 : 1 }}>
      <Chip
        active={active}
        filter={!color}
        icon={color ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} /> : undefined}
        onPress={disabled ? undefined : onPress}
      >
        {label}
      </Chip>
    </View>
  );
}

const isRealParty = (name: string | null | undefined): boolean =>
  !!name && name.trim().toLowerCase() !== "self";

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const t = useFMTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={{ fontFamily: FMFonts.sans, fontSize: FMType.body, color: t.inkSoft }}>{label}</Text>
      <Text
        style={{
          fontFamily: mono ? FMFonts.mono : FMFonts.sans,
          fontSize: FMType.body,
          color: t.ink,
          fontVariant: mono ? ["tabular-nums"] : undefined,
        }}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function currencySymbol(currency: string | undefined): string {
  if (currency === "EUR") return "€";
  if (currency === "USD") return "$";
  if (currency === "GBP") return "£";
  return currency ?? "€";
}

const styles = StyleSheet.create({
  heroCard: {
    paddingBottom: 4,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  details: {
    marginTop: 16,
    borderRadius: FMRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  catPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    gap: 12,
  },
  detailColumn: {
    paddingTop: 4,
  },
});
