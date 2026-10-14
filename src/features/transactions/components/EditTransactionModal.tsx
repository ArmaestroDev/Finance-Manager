import React, { useEffect, useState } from "react";

import type { Strings } from "@/src/constants/Strings";
import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { Button, Field, IconTrash } from "@/src/shared/design";
import type { Transaction } from "@/src/services/enableBanking";

type I18n = typeof Strings.de;

interface EditTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onUpdate: (editingTx: Transaction, editTitle: string, editAmount: string) => void;
  onDelete: (editingTx: Transaction) => void;
  onClose: () => void;
  i18n: I18n;
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
  const { language } = useSettings();

  useEffect(() => {
    if (transaction) {
      setEditTitle(transaction.remittance_information?.[0] || transaction.creditor?.name || "");
      // Stored as "-12.5"; show the decimal comma in German (parseLocaleNumber reads both).
      const raw = transaction.transaction_amount.amount;
      setEditAmount(language === "de" ? raw.replace(".", ",") : raw);
    }
  }, [transaction, language]);

  if (!transaction) return null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={i18n.edit_tx_title}
      width={460}
      leftActions={
        <Button
          variant="danger"
          icon={<IconTrash size={16} />}
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
          <Button variant="text" onPress={onClose}>{i18n.cancel}</Button>
          <Button
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
        label={i18n.tx_title_label}
        value={editTitle}
        onChangeText={setEditTitle}
      />
      <Field
        label={i18n.amount_label}
        value={editAmount}
        onChangeText={setEditAmount}
        keyboardType="numeric"
        suffix="€"
        mono
      />
    </Sheet>
  );
}
