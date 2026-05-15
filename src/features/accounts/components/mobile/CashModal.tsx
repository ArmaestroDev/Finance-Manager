import React from "react";

import { Sheet } from "@/src/shared/components/Sheet";
import { Button, Field } from "@/src/shared/design";

interface CashModalProps {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onSave: () => void;
  onClose: () => void;
  textColor?: string;
  backgroundColor?: string;
  tintColor?: string;
  i18n: any;
}

// Cash-on-hand editor. Bottom sheet on native; € prefix, numeric autofocus,
// and a hint mirroring the desktop dialog.
export function CashModal({
  visible,
  value,
  onChangeText,
  onSave,
  onClose,
  i18n,
}: CashModalProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={i18n.update_cash_title ?? "Update Cash Balance"}
      subtitle={i18n.cash_at_hand ?? "Cash at Hand"}
      actions={
        <>
          <Button variant="ghost" onPress={onClose}>
            {i18n.cancel}
          </Button>
          <Button variant="primary" onPress={onSave}>
            {i18n.save}
          </Button>
        </>
      }
    >
      <Field
        label={i18n.cash_at_hand ?? "Cash at Hand"}
        hint="Enter your current cash on hand in EUR"
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        prefix="€"
        mono
        autoFocus
        selectTextOnFocus
        onSubmitEditing={onSave}
        returnKeyType="done"
      />
    </Sheet>
  );
}
