import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { Button, Field, Label, useFMTheme } from "@/src/shared/design";
import type { AccountCategory } from "../context/AccountsContext";

const CATEGORIES: readonly AccountCategory[] = ["Giro", "Savings", "Stock"];

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
  name: string;
  setName: (name: string) => void;
  balance: string;
  setBalance: (balance: string) => void;
  category: AccountCategory;
  setCategory: (category: AccountCategory) => void;
  textColor?: string;
  backgroundColor?: string;
  tintColor?: string;
  i18n: any;
}

export function AddAccountModal({
  visible,
  onClose,
  onAdd,
  name,
  setName,
  balance,
  setBalance,
  category,
  setCategory,
  i18n,
}: AddAccountModalProps) {
  const t = useFMTheme();
  const labelFor = (cat: AccountCategory): string => {
    if (cat === "Giro") return i18n.cat_giro ?? "Giro";
    if (cat === "Savings") return i18n.cat_savings ?? "Savings";
    return i18n.cat_stock ?? "Stock";
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={i18n.add_manual_title ?? "Add manual account"}
      subtitle="Cash, savings, brokerage — anything not connected via Open Banking."
      width={460}
      actions={
        <>
          <Button variant="ghost" onPress={onClose}>{i18n.cancel}</Button>
          <Button variant="primary" onPress={onAdd} disabled={!name.trim()}>
            {i18n.create_btn ?? "Create"}
          </Button>
        </>
      }
    >
      <Field
        label={i18n.name_label ?? "Name"}
        placeholder={i18n.placeholder_name ?? "House fund, ING savings, …"}
        value={name}
        onChangeText={setName}
      />
      <Field
        label={i18n.balance_label ?? "Initial balance"}
        placeholder="0,00"
        value={balance}
        onChangeText={setBalance}
        keyboardType="numeric"
        suffix="€"
        mono
      />
      <View style={{ marginBottom: 4 }}>
        <Label style={{ marginBottom: 6 }}>{i18n.category_label ?? "Category"}</Label>
        <View style={styles.catRow}>
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={({ pressed }) => [
                  styles.catBtn,
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
                    fontSize: 12.5,
                    color: active ? t.bg : t.ink,
                  }}
                >
                  {labelFor(cat)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  catRow: {
    flexDirection: "row",
    gap: 6,
  },
  catBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
  },
});
