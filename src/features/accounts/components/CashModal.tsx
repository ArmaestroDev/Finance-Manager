import React from "react";

import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { Button, Field } from "@/src/shared/design";

interface CashModalProps {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onSave: () => void;
  onClose: () => void;
}

// Cash-on-hand editor (centered dialog on desktop, bottom sheet on mobile):
// € prefix, numeric autofocus, Enter saves.
export function CashModal({ visible, value, onChangeText, onSave, onClose }: CashModalProps) {
  const { i18n } = useSettings();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={i18n.update_cash_title}
      width={420}
      actions={
        <>
          <Button variant="text" onPress={onClose}>
            {i18n.cancel}
          </Button>
          <Button onPress={onSave}>
            {i18n.save}
          </Button>
        </>
      }
    >
      <Field
        label={i18n.cash_at_hand}
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
