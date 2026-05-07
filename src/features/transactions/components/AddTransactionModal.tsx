import React, { useState } from "react";

import { Sheet } from "@/src/shared/components/Sheet";
import { Button, Field } from "@/src/shared/design";

interface AddTransactionModalProps {
  visible: boolean;
  onAdd: (title: string, amount: string) => void;
  onClose: () => void;
  backgroundColor?: string;
  textColor?: string;
  tintColor?: string;
  i18n: Record<string, string>;
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
      title={i18n.add_tx_title ?? "Add transaction"}
      subtitle={i18n.add_tx_sub ?? "Negative amounts count as expenses."}
      width={460}
      actions={
        <>
          <Button variant="ghost" onPress={handleClose}>{i18n.cancel ?? "Cancel"}</Button>
          <Button variant="primary" onPress={handleAdd} disabled={!txTitle.trim() || !txAmount.trim()}>
            {i18n.add ?? "Add"}
          </Button>
        </>
      }
    >
      <Field
        label={i18n.tx_name ?? "Title / payee"}
        placeholder="REWE, Salary, …"
        value={txTitle}
        onChangeText={setTxTitle}
      />
      <Field
        label={i18n.amount ?? "Amount"}
        placeholder="-12,50"
        value={txAmount}
        onChangeText={setTxAmount}
        keyboardType="numeric"
        suffix="€"
        mono
      />
    </Sheet>
  );
}
