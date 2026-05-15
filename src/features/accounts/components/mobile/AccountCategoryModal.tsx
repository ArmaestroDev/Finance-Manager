import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { Button, IconCheck, useFMTheme } from "@/src/shared/design";

type AccountCategory = "Giro" | "Savings" | "Stock";

interface CatMeta {
  key: AccountCategory;
  title: string;
  desc: string;
}

const CATEGORIES: readonly CatMeta[] = [
  {
    key: "Giro",
    title: "Giro",
    desc: "Everyday checking — salary, spending, direct debits.",
  },
  {
    key: "Savings",
    title: "Savings",
    desc: "Money set aside — emergency fund, goals, deposits.",
  },
  {
    key: "Stock",
    title: "Stock",
    desc: "Brokerage / depot — ETFs, shares, invested capital.",
  },
];

interface AccountCategoryModalProps {
  visible: boolean;
  currentCategory: AccountCategory;
  onSelect: (category: AccountCategory) => void;
  onClose: () => void;
  backgroundColor?: string;
  textColor?: string;
  tintColor?: string;
}

// Account-category picker. Radio-style rows with a description for each option
// so it reads as a real settings choice rather than three bare buttons.
export function AccountCategoryModal({
  visible,
  currentCategory,
  onSelect,
  onClose,
}: AccountCategoryModalProps) {
  const t = useFMTheme();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Account category"
      subtitle="How this account is grouped in the Accounts overview."
      actions={
        <Button variant="ghost" onPress={onClose}>
          Close
        </Button>
      }
    >
      <View style={{ gap: 8 }}>
        {CATEGORIES.map((cat) => {
          const active = currentCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              onPress={() => {
                onSelect(cat.key);
                onClose();
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: active ? t.accentSoft : t.surface,
                  borderColor: active ? t.accent : t.lineStrong,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: active ? t.accent : t.lineStrong,
                    backgroundColor: active ? t.accent : "transparent",
                  },
                ]}
              >
                {active ? <IconCheck size={11} color={t.bg} /> : null}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{
                    fontFamily: FMFonts.sansSemibold,
                    fontSize: 13.5,
                    color: t.ink,
                  }}
                >
                  {cat.title}
                </Text>
                <Text
                  style={{
                    fontFamily: FMFonts.sans,
                    fontSize: 11.5,
                    color: t.inkSoft,
                    marginTop: 3,
                    lineHeight: 16,
                  }}
                >
                  {cat.desc}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderRadius: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
});
