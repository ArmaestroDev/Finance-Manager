import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import type { Strings } from "@/src/constants/Strings";
import { Sheet } from "@/src/shared/components/Sheet";
import { Button, Chip, Field, Label, SegmentedButtons } from "@/src/shared/design";
import { showAlert } from "@/src/shared/utils/alert";
import { parseLocaleNumber, roundCents } from "@/src/shared/utils/number";
import type { DebtEntity } from "../context/DebtsContext";

interface AddDebtModalProps {
  visible: boolean;
  entities: DebtEntity[];
  onAdd: (
    entityId: string,
    amount: number,
    description: string,
    direction: "I_OWE" | "OWES_ME",
    date: string,
  ) => Promise<void> | Promise<string>;
  onClose: () => void;
  i18n: typeof Strings.de;
}

// Add a debt entry: person (filter chips), direction (segmented), amount, note.
export function AddDebtModal({ visible, entities, onAdd, onClose, i18n }: AddDebtModalProps) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtDesc, setDebtDesc] = useState("");
  const [debtDirection, setDebtDirection] = useState<"I_OWE" | "OWES_ME">("I_OWE");

  const reset = () => {
    setSelectedEntityId(null);
    setDebtAmount("");
    setDebtDesc("");
    setDebtDirection("I_OWE");
  };

  const handleAddDebt = async () => {
    if (!selectedEntityId || !debtAmount) return;
    const amount = roundCents(parseLocaleNumber(debtAmount));
    if (isNaN(amount) || amount <= 0) {
      showAlert(i18n.invalid_amount_title, i18n.invalid_amount_msg);
      return;
    }
    await onAdd(
      selectedEntityId,
      amount,
      debtDesc.trim() || i18n.debt_default_desc,
      debtDirection,
      new Date().toISOString(),
    );
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={i18n.add_debt_title}
      width={480}
      actions={
        <>
          <Button variant="text" onPress={handleClose}>
            {i18n.cancel}
          </Button>
          <Button onPress={handleAddDebt} disabled={!selectedEntityId || !debtAmount}>
            {i18n.save}
          </Button>
        </>
      }
    >
      <Label style={{ marginBottom: 8 }}>{i18n.person_label}</Label>
      <View style={styles.chips}>
        {entities.map((e) => (
          <Chip
            key={e.id}
            filter
            active={selectedEntityId === e.id}
            onPress={() => setSelectedEntityId(e.id)}
          >
            {e.name}
          </Chip>
        ))}
      </View>

      <SegmentedButtons
        full
        value={debtDirection}
        onChange={setDebtDirection}
        options={[
          // Same order as the entry editor and the debt table.
          { value: "OWES_ME", label: i18n.owes_me },
          { value: "I_OWE", label: i18n.i_owe },
        ]}
        style={{ marginBottom: 16 }}
      />

      <Field
        label={i18n.amount_label}
        placeholder="0,00"
        value={debtAmount}
        onChangeText={setDebtAmount}
        keyboardType="decimal-pad"
        suffix="€"
        mono
      />
      <Field
        label={i18n.desc_label}
        placeholder={i18n.placeholder_desc}
        value={debtDesc}
        onChangeText={setDebtDesc}
        containerStyle={{ marginBottom: 0 }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
});
