import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import type { Strings } from "@/src/constants/Strings";
import { FMType } from "@/src/constants/theme";
import {
  Avatar,
  Button,
  Field,
  IconArrowDown,
  IconArrowUp,
  ListItem,
  Money,
  SegmentedButtons,
  useFMTheme,
} from "@/src/shared/design";
import { showAlert } from "@/src/shared/utils/alert";
import { formatDate, toApiDate } from "@/src/shared/utils/date";
import { parseLocaleNumber, roundCents } from "@/src/shared/utils/number";
import { useDebts, type DebtItem, type DebtType } from "../context/DebtsContext";

interface DebtEntryRowProps {
  item: DebtItem;
  /** Kept for call-site compatibility (rows no longer draw separators). */
  first?: boolean;
  i18n: typeof Strings.de;
  /** Horizontal inset so the row's state layer reaches the sheet edges. */
  inset?: number;
}

// One history line in the debt detail sheet. Tap to expand into an inline
// editor — direction, amount, description, date — with Delete / Cancel / Save.
export function DebtEntryRow({ item, i18n, inset = 24 }: DebtEntryRowProps) {
  const t = useFMTheme();
  const { updateDebt, deleteDebt } = useDebts();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [direction, setDirection] = useState<DebtType>(item.type);
  const [busy, setBusy] = useState(false);

  const startEdit = () => {
    setAmount(String(item.amount).replace(".", ","));
    setDesc(item.description);
    setDate(formatDate(item.date));
    setDirection(item.type);
    setEditing(true);
  };

  const save = async () => {
    const value = roundCents(parseLocaleNumber(amount));
    if (!Number.isFinite(value) || value <= 0) {
      showAlert(i18n.invalid_amount_title, i18n.invalid_amount_msg);
      return;
    }
    const iso = date.trim() ? toApiDate(date.trim()) : item.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      showAlert(i18n.invalid_date_title, i18n.invalid_date_msg);
      return;
    }
    setBusy(true);
    try {
      await updateDebt(item.id, {
        amount: value,
        description: desc.trim() || item.description,
        date: iso,
        type: direction,
      });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    showAlert(i18n.delete, `"${item.description}"?`, [
      { text: i18n.cancel, style: "cancel" },
      {
        text: i18n.delete,
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await deleteDebt(item.id);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const owesMe = item.type === "OWES_ME";

  if (!editing) {
    return (
      <ListItem
        onPress={startEdit}
        accessibilityLabel={`${i18n.edit}: ${item.description}`}
        leading={
          <Avatar
            size={36}
            color={owesMe ? t.pos : t.neg}
            icon={owesMe ? <IconArrowDown size={16} color={t.pos} /> : <IconArrowUp size={16} color={t.neg} />}
          />
        }
        title={item.description}
        subtitle={formatDate(item.date)}
        trailing={<Money value={owesMe ? item.amount : -item.amount} size={FMType.body} />}
        style={{ paddingHorizontal: inset }}
      />
    );
  }

  return (
    <View style={[styles.editor, { marginHorizontal: inset, backgroundColor: t.surfaceContainerHigh }]}>
      <SegmentedButtons
        full
        value={direction}
        onChange={setDirection}
        options={[
          { value: "OWES_ME", label: i18n.owes_me },
          { value: "I_OWE", label: i18n.i_owe },
        ]}
        style={{ marginBottom: 16 }}
      />
      <Field
        label={i18n.amount_label}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        suffix="€"
        mono
      />
      <Field label={i18n.desc_label} value={desc} onChangeText={setDesc} />
      <Field
        label={i18n.debt_col_date}
        value={date}
        onChangeText={setDate}
        placeholder={i18n.date_placeholder_ddmmyyyy}
        mono
      />
      <View style={styles.actions}>
        <Button variant="danger" size="sm" onPress={remove} disabled={busy}>
          {i18n.delete}
        </Button>
        <View style={{ flex: 1 }} />
        <Button variant="text" size="sm" onPress={() => setEditing(false)} disabled={busy}>
          {i18n.cancel}
        </Button>
        <Button size="sm" onPress={save} loading={busy}>
          {i18n.save}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: {
    padding: 16,
    borderRadius: 16,
    marginVertical: 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
