import React from "react";
import { View } from "react-native";

import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { Button, Field, Label, SegmentedButtons } from "@/src/shared/design";
import type { AccountCategory } from "../context/AccountsContext";
import { ACCOUNT_CATEGORIES, accountCategoryLabel } from "../utils/accountDisplay";

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
  name: string;
  setName: (name: string) => void;
  balance: string;
  setBalance: (balance: string) => void;
  category: AccountCategory;
  setCategory: (category: AccountCategory) => void;
}

// Manual-account creator (dialog on desktop, bottom sheet on mobile):
// name + initial balance + Giro / Savings / Stock.
export function AddAccountModal({
  visible,
  onClose,
  onAdd,
  name,
  setName,
  balance,
  setBalance,
  category,
  setCategory,
}: AddAccountModalProps) {
  const { i18n } = useSettings();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={i18n.add_manual_title}
      actions={
        <>
          <Button variant="text" onPress={onClose}>
            {i18n.cancel}
          </Button>
          <Button onPress={onAdd} disabled={!name.trim()}>
            {i18n.create_btn}
          </Button>
        </>
      }
    >
      <Field
        label={i18n.name_label}
        placeholder={i18n.placeholder_name}
        value={name}
        onChangeText={setName}
        autoFocus
      />
      <Field
        label={i18n.balance_label}
        placeholder="0,00"
        value={balance}
        onChangeText={setBalance}
        keyboardType="numeric"
        prefix="€"
        mono
      />
      <View style={{ marginBottom: 8 }}>
        <Label style={{ marginBottom: 8 }}>{i18n.category_label}</Label>
        <SegmentedButtons
          full
          options={ACCOUNT_CATEGORIES.map((cat) => ({ value: cat, label: accountCategoryLabel(cat, i18n) }))}
          value={category}
          onChange={setCategory}
        />
      </View>
    </Sheet>
  );
}
