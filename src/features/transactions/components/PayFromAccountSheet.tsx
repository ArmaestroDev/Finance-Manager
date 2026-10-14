import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { FMFonts, FMType } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { Avatar, Button, EmptyState, Field, IconCash, IconWallet, ListItem, formatEUR, useFMTheme } from "@/src/shared/design";
import type { UnifiedAccount } from "../../accounts/context/AccountsContext";
import { CASH_ACCOUNT_ID } from "../../accounts/context/AccountsContext";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { parseLocaleNumber, roundCents } from "@/src/shared/utils/number";
import { accountBankLabel, accountDisplayName } from "@/src/features/accounts/utils/accountDisplay";

interface PayFromAccountSheetProps {
  visible: boolean;
  onClose: () => void;
  accounts: UnifiedAccount[];
  expenseTitle: string;
  /** The expense's own account — paying it from itself makes no sense. */
  excludeAccountId?: string;
  /** Prefilled when an account is picked (capped at its balance). */
  defaultAmount?: number;
  onPay: (accountId: string, amount: number) => Promise<void>;
}

export function PayFromAccountSheet({
  visible,
  onClose,
  accounts,
  expenseTitle,
  excludeAccountId,
  defaultAmount,
  onPay,
}: PayFromAccountSheetProps) {
  const t = useFMTheme();
  const { i18n, language } = useSettings();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const manualAccounts = useMemo(
    () => accounts.filter((a) => a.type === "manual" && a.id !== excludeAccountId),
    [accounts, excludeAccountId],
  );

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId),
    [selectedAccountId, accounts],
  );

  const parsedAmount = useMemo(() => {
    const v = roundCents(parseLocaleNumber(amount));
    return isNaN(v) ? 0 : v;
  }, [amount]);

  const isValid =
    !!selectedAccountId && parsedAmount > 0 && parsedAmount <= (selectedAccount?.balance ?? 0);

  const handleConfirm = async () => {
    if (!isValid || !selectedAccountId || submitting) return;
    setSubmitting(true);
    try {
      await onPay(selectedAccountId, parsedAmount);
      setAmount("");
      setSelectedAccountId(null);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setAmount("");
    setSelectedAccountId(null);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={i18n.pay_from_title}
      subtitle={i18n.pay_from_paying_toward.replace("{title}", expenseTitle)}
      width={520}
      actions={
        <Button
          disabled={!isValid || submitting}
          onPress={handleConfirm}
        >
          {submitting
            ? i18n.pay_from_creating
            : selectedAccount
              ? i18n.pay_from_cta
                  .replace("{amount}", formatEUR(parsedAmount))
                  .replace("{account}", accountDisplayName(selectedAccount, i18n))
              : i18n.pay_from_select_account_cta}
        </Button>
      }
    >
      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        {manualAccounts.length === 0 ? (
          <EmptyState icon={<IconWallet />} title={i18n.pay_from_no_manual} />
        ) : (
          <View style={{ marginHorizontal: -24 }} accessibilityRole="radiogroup">
            {manualAccounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              const isCash = acc.id === CASH_ACCOUNT_ID;
              const name = accountDisplayName(acc, i18n);
              return (
                <ListItem
                  key={acc.id}
                  selected={isSelected}
                  onPress={() => {
                    setSelectedAccountId(acc.id);
                    if (!amount.trim() && defaultAmount && defaultAmount > 0) {
                      const v = Math.min(defaultAmount, Math.max(0, acc.balance));
                      if (v > 0) {
                        const s = v.toFixed(2);
                        setAmount(language === "de" ? s.replace(".", ",") : s);
                      }
                    }
                  }}
                  accessibilityLabel={name}
                  leading={<Avatar icon={isCash ? <IconCash size={18} /> : <IconWallet size={18} />} />}
                  title={name}
                  subtitle={isCash ? i18n.cash_on_hand : (accountBankLabel(acc, i18n) ?? "")}
                  trailing={
                    <Text
                      style={{
                        fontFamily: FMFonts.sansMedium,
                        fontSize: FMType.body,
                        color: isSelected ? t.onSecondaryContainer : t.ink,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {formatEUR(acc.balance)}
                    </Text>
                  }
                  style={{ paddingHorizontal: 24 }}
                />
              );
            })}
          </View>
        )}

        {selectedAccount ? (
          <Field
            label={i18n.pay_from_amount_max.replace("{max}", formatEUR(selectedAccount.balance))}
            placeholder="0,00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            suffix="€"
            mono
            autoFocus
            error={
              parsedAmount > 0 && parsedAmount > selectedAccount.balance
                ? i18n.pay_from_exceeds.replace("{balance}", formatEUR(selectedAccount.balance))
                : undefined
            }
            containerStyle={{ marginTop: 16, marginBottom: 0 }}
          />
        ) : null}
      </ScrollView>
    </Sheet>
  );
}
