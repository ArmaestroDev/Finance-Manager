import React, { useEffect, useState } from "react";

import { Sheet } from "@/src/shared/components/Sheet";
import { Button, Field, IconTrash } from "@/src/shared/design";
import type { Transaction } from "@/src/services/enableBanking";

interface EditTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onUpdate: (editingTx: Transaction, editTitle: string, editAmount: string) => void;
  onDelete: (editingTx: Transaction) => void;
  onClose: () => void;
  backgroundColor?: string;
  textColor?: string;
  tintColor?: string;
  i18n: Record<string, string>;
}

export function EditTransactionModal({
  visible,
  transaction,
  onUpdate,
  onDelete,
  onClose,
  i18n,
}: EditTransactionModalProps) {
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");

  useEffect(() => {
    if (transaction) {
      setEditTitle(transaction.remittance_information?.[0] || transaction.creditor?.name || "");
      setEditAmount(transaction.transaction_amount.amount);
    }
  }, [transaction]);

  if (!transaction) return null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={i18n.edit_tx_title ?? "Edit transaction"}
      width={460}
      leftActions={
        <Button
          variant="danger"
          icon={<IconTrash size={11} />}
          onPress={() => {
            onDelete(transaction);
            onClose();
          }}
        >
          {i18n.delete}
        </Button>
      }
      actions={
        <>
          <Button variant="ghost" onPress={onClose}>{i18n.cancel}</Button>
          <Button
            variant="primary"
            onPress={() => {
              onUpdate(transaction, editTitle, editAmount);
              onClose();
            }}
            disabled={!editTitle.trim() || !editAmount.trim()}
          >
            {i18n.save}
          </Button>
        </>
      }
    >
      <Field
        label={i18n.tx_name ?? "Title / payee"}
        value={editTitle}
        onChangeText={setEditTitle}
      />
      <Field
        label={i18n.amount ?? "Amount"}
        value={editAmount}
        onChangeText={setEditAmount}
        keyboardType="numeric"
        suffix="€"
        mono
      />
    </Sheet>
  );
}
