import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import {
  Button,
  IconEdit,
  Label,
  Rule,
  formatEUR,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import type { Transaction } from "@/src/services/enableBanking";
import { cleanRemittanceInfo } from "@/src/shared/utils/financeHelpers";
import { getStableTxId, getTransactionAmount, pickTransactionTitle } from "../utils/transactions";
import { CategoryPickerModal } from "./CategoryPickerModal";

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
  backgroundColor?: string;
  textColor?: string;
  tintColor?: string;
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
}: TransactionDetailModalProps) {
  const t = useFMTheme();
  const [pickerVisible, setPickerVisible] = useState(false);
  if (!transaction) return null;

  const amount = getTransactionAmount(transaction);
  const isNeg = amount < 0;
  const txId = getStableTxId(transaction);
  const txCat = getCategoryForTransaction(txId);
  const heroParts = splitForHero(amount);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={pickTransactionTitle(transaction)}
      subtitle={`${transaction.booking_date || transaction.value_date || ""} · ${
        type === "manual" ? "Manual" : "Connected"
      }`}
      width={520}
      actions={
        <>
          {type === "manual" && onEdit ? (
            <Button
              variant="secondary"
              icon={<IconEdit size={11} color={t.ink} />}
              onPress={() => {
                onClose();
                onEdit(transaction);
              }}
            >
              Edit
            </Button>
          ) : null}
          <Button variant="primary" onPress={onClose}>Close</Button>
        </>
      }
    >
      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        {/* Hero amount */}
        <View style={[styles.heroCard, { backgroundColor: t.surfaceAlt, borderColor: t.line }]}>
          <Label>Amount</Label>
          <View style={styles.heroRow}>
            <Text
              style={{
                fontFamily: FMFonts.display,
                fontSize: 30,
                color: isNeg ? t.neg : t.pos,
                lineHeight: 32,
                letterSpacing: -0.4,
              }}
            >
              {isNeg ? "−" : "+"}
              {heroParts.integer}
              <Text style={{ color: t.inkMuted }}>{heroParts.fraction}</Text>
            </Text>
            <Text style={{ fontFamily: FMFonts.display, fontSize: 16, color: t.inkSoft, marginLeft: 4 }}>
              {currencySymbol(transaction.transaction_amount?.currency)}
            </Text>
          </View>
        </View>

        {/* Category picker */}
        <View style={{ marginTop: 14 }}>
          <Label style={{ marginBottom: 8 }}>Category</Label>
          <View style={styles.catPills}>
            <CatPill
              label="None"
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
            <CatPill label="+ New" onPress={() => setPickerVisible(true)} />
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

        <Rule style={{ marginVertical: 16 }} />

        {/* Detail rows */}
        <View style={{ gap: 8 }}>
          {transaction.creditor?.name ? (
            <DetailRow label="Creditor" value={transaction.creditor.name} />
          ) : null}
          {transaction.debtor?.name ? (
            <DetailRow label="Debtor" value={transaction.debtor.name} />
          ) : null}
          {transaction.booking_date ? (
            <DetailRow label="Booking date" value={transaction.booking_date} mono />
          ) : null}
          {transaction.value_date ? (
            <DetailRow label="Value date" value={transaction.value_date} mono />
          ) : null}
          {transaction.credit_debit_indicator ? (
            <DetailRow
              label="Type"
              value={transaction.credit_debit_indicator === "CRDT" ? "Credit" : "Debit"}
            />
          ) : null}
          {transaction.remittance_information && transaction.remittance_information.length > 0 ? (
            <View style={styles.detailColumn}>
              <Label>Reference</Label>
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  fontSize: 11.5,
                  color: t.inkSoft,
                  marginTop: 4,
                  lineHeight: 17,
                }}
              >
                {cleanRemittanceInfo(transaction.remittance_information)}
              </Text>
            </View>
          ) : null}
          {transaction.transaction_id ? (
            <View style={styles.detailColumn}>
              <Label>Transaction ID</Label>
              <Text
                style={{
                  fontFamily: FMFonts.mono,
                  fontSize: 10.5,
                  color: t.inkMuted,
                  marginTop: 4,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {transaction.transaction_id}
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
  const t = useFMTheme();
  const bg = active ? (color ?? t.ink) : t.surface;
  const fg = active ? "#fff" : t.inkSoft;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.catPill,
        {
          backgroundColor: bg,
          borderColor: color && !active ? color + "55" : active ? bg : t.lineStrong,
          opacity: disabled ? 0.35 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {color && !active ? (
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />
      ) : null}
      <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 11, color: active ? fg : t.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const t = useFMTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11.5, color: t.inkMuted }}>{label}</Text>
      <Text
        style={{
          fontFamily: mono ? FMFonts.mono : FMFonts.sans,
          fontSize: 12.5,
          color: t.ink,
          ...(mono ? { fontVariant: ["tabular-nums"] as any } : {}),
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  catPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
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
