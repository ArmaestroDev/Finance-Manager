import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { Button, Field, Label, useFMTheme } from "@/src/shared/design";
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
  backgroundColor?: string;
  textColor?: string;
  tintColor?: string;
  i18n: Record<string, string>;
}

export function AddDebtModal({ visible, entities, onAdd, onClose, i18n }: AddDebtModalProps) {
  const t = useFMTheme();
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
    const amount = parseFloat(debtAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid positive amount.");
      return;
    }
    await onAdd(selectedEntityId, amount, debtDesc || "Debt", debtDirection, new Date().toISOString());
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
      title={i18n.add_debt_title ?? "Add debt"}
      width={460}
      actions={
        <>
          <Button variant="ghost" onPress={handleClose}>{i18n.cancel}</Button>
          <Button
            variant="primary"
            onPress={handleAddDebt}
            disabled={!selectedEntityId || !debtAmount}
          >
            {i18n.save}
          </Button>
        </>
      }
    >
      <View style={{ marginBottom: 12 }}>
        <Label style={{ marginBottom: 6 }}>{i18n.person_label ?? "Person"}</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {entities.map((e) => {
            const active = selectedEntityId === e.id;
            return (
              <Pressable
                key={e.id}
                onPress={() => setSelectedEntityId(e.id)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: active ? t.ink : t.surface,
                    borderColor: active ? t.ink : t.lineStrong,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: FMFonts.sansMedium,
                    fontSize: 12,
                    color: active ? t.bg : t.ink,
                  }}
                >
                  {e.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Field
        label={i18n.amount_label ?? "Amount"}
        placeholder="0,00"
        value={debtAmount}
        onChangeText={setDebtAmount}
        keyboardType="numeric"
        suffix="€"
        mono
      />
      <Field
        label={i18n.desc_label ?? "Description"}
        placeholder={i18n.placeholder_desc ?? "e.g. concert tickets"}
        value={debtDesc}
        onChangeText={setDebtDesc}
      />

      <View style={{ marginBottom: 4 }}>
        <Label style={{ marginBottom: 6 }}>{i18n.who_owes_who ?? "Direction"}</Label>
        <View style={styles.dirRow}>
          <Pressable
            onPress={() => setDebtDirection("I_OWE")}
            style={({ pressed }) => [
              styles.dirBtn,
              {
                backgroundColor: debtDirection === "I_OWE" ? t.negSoft : t.surface,
                borderColor: debtDirection === "I_OWE" ? t.neg : t.lineStrong,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: FMFonts.sansSemibold,
                fontSize: 12,
                color: debtDirection === "I_OWE" ? t.neg : t.inkSoft,
              }}
            >
              {i18n.i_owe_them}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setDebtDirection("OWES_ME")}
            style={({ pressed }) => [
              styles.dirBtn,
              {
                backgroundColor: debtDirection === "OWES_ME" ? t.posSoft : t.surface,
                borderColor: debtDirection === "OWES_ME" ? t.pos : t.lineStrong,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: FMFonts.sansSemibold,
                fontSize: 12,
                color: debtDirection === "OWES_ME" ? t.pos : t.inkSoft,
              }}
            >
              {i18n.they_owe_me}
            </Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  dirRow: {
    flexDirection: "row",
    gap: 6,
  },
  dirBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
  },
});
