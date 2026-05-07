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

export function CashModal({ visible, value, onChangeText, onSave, onClose, i18n }: CashModalProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={i18n.update_cash_title ?? "Cash on hand"}
      subtitle={i18n.update_cash_sub ?? "Bills and coins you currently hold."}
      width={420}
      actions={
        <>
          <Button variant="ghost" onPress={onClose}>{i18n.cancel}</Button>
          <Button variant="primary" onPress={onSave}>{i18n.save}</Button>
        </>
      }
    >
      <Field
        label={i18n.cash_at_hand ?? "Cash at hand"}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        suffix="€"
        mono
        autoFocus
        selectTextOnFocus
      />
    </Sheet>
  );
}
