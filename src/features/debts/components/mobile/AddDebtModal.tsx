import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { Button, Field, IconCheck, Label, useFMTheme } from "@/src/shared/design";
import type { DebtEntity } from "../../context/DebtsContext";

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
    await onAdd(
      selectedEntityId,
      amount,
      debtDesc.trim() || "Debt",
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
      title={i18n.add_debt_title ?? "Add debt"}
      width={460}
      actions={
        <>
          <Button variant="ghost" onPress={handleClose}>
            {i18n.cancel ?? "Cancel"}
          </Button>
          <Button
            variant="primary"
            onPress={handleAddDebt}
            disabled={!selectedEntityId || !debtAmount}
          >
            {i18n.save ?? "Save"}
          </Button>
        </>
      }
    >
      {/* Person selector — vertical rows with avatars */}
      <Label style={{ marginBottom: 8 }}>{i18n.person_label ?? "Person"}</Label>
      <View style={styles.personList}>
        {entities.map((e) => {
          const active = selectedEntityId === e.id;
          const isInstitution = e.type === "institution";
          return (
            <Pressable
              key={e.id}
              onPress={() => setSelectedEntityId(e.id)}
              style={({ pressed }) => [
                styles.personRow,
                {
                  backgroundColor: active ? t.accentSoft : t.surface,
                  borderColor: active ? t.accent : t.lineStrong,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: isInstitution ? t.surfaceAlt : t.accentSoft,
                    borderColor: t.line,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: FMFonts.sansSemibold,
                    fontSize: 12,
                    color: isInstitution ? t.inkSoft : t.accent,
                  }}
                >
                  {e.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text
                style={{
                  flex: 1,
                  marginLeft: 12,
                  fontFamily: FMFonts.sansMedium,
                  fontSize: 13,
                  color: t.ink,
                }}
                numberOfLines={1}
              >
                {e.name}
              </Text>
              {active ? <IconCheck size={14} color={t.accent} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 16 }}>
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
          placeholder={i18n.placeholder_desc ?? "What for?"}
          value={debtDesc}
          onChangeText={setDebtDesc}
        />
      </View>

      <View style={{ marginBottom: 4 }}>
        <Label style={{ marginBottom: 8 }}>
          {i18n.who_owes_who ?? "Who owes who?"}
        </Label>
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
                fontSize: 12.5,
                color: debtDirection === "I_OWE" ? t.neg : t.inkSoft,
              }}
            >
              {i18n.i_owe_them ?? "I owe them"}
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
                fontSize: 12.5,
                color: debtDirection === "OWES_ME" ? t.pos : t.inkSoft,
              }}
            >
              {i18n.they_owe_me ?? "They owe me"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  personList: {
    gap: 6,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dirRow: {
    flexDirection: "row",
    gap: 8,
  },
  dirBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
});
