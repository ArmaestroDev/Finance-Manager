import React, { useState } from "react";

import type { Strings } from "@/src/constants/Strings";
import { Sheet } from "@/src/shared/components/Sheet";
import { Button, Field } from "@/src/shared/design";

type I18n = typeof Strings.de;

interface AddTransactionModalProps {
  visible: boolean;
  onAdd: (title: string, amount: string) => void;
  onClose: () => void;
  i18n: I18n;
}

export function AddTransactionModal({ visible, onAdd, onClose, i18n }: AddTransactionModalProps) {
  const [txTitle, setTxTitle] = useState("");
  const [txAmount, setTxAmount] = useState("");

  const reset = () => {
    setTxTitle("");
    setTxAmount("");
  };

  const handleAdd = () => {
    if (!txTitle.trim() || !txAmount.trim()) return;
    onAdd(txTitle, txAmount);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={i18n.add_tx_title}
      width={460}
      actions={
        <>
          <Button variant="text" onPress={handleClose}>{i18n.cancel}</Button>
          <Button onPress={handleAdd} disabled={!txTitle.trim() || !txAmount.trim()}>
            {i18n.add_short}
          </Button>
        </>
      }
    >
      <Field
        label={i18n.tx_title_label}
        placeholder={i18n.tx_title_ph}
        value={txTitle}
        onChangeText={setTxTitle}
        autoFocus
      />
      <Field
        label={i18n.amount_label}
        placeholder="-12,50"
        value={txAmount}
        onChangeText={setTxAmount}
        onSubmitEditing={handleAdd}
        keyboardType="numeric"
        suffix="€"
        hint={i18n.add_tx_sub}
        mono
      />
    </Sheet>
  );
}
