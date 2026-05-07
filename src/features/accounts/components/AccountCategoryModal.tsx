import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { Button, useFMTheme } from "@/src/shared/design";

type AccountCategory = "Giro" | "Savings" | "Stock";
const CATEGORIES: readonly AccountCategory[] = ["Giro", "Savings", "Stock"];

interface AccountCategoryModalProps {
  visible: boolean;
  currentCategory: AccountCategory;
  onSelect: (category: AccountCategory) => void;
  onClose: () => void;
  backgroundColor?: string;
  textColor?: string;
  tintColor?: string;
}

export function AccountCategoryModal({ visible, currentCategory, onSelect, onClose }: AccountCategoryModalProps) {
  const t = useFMTheme();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Account category"
      width={420}
      actions={<Button variant="ghost" onPress={onClose}>Close</Button>}
    >
      <View style={styles.row}>
        {CATEGORIES.map((cat) => {
          const active = currentCategory === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => {
                onSelect(cat);
                onClose();
              }}
              style={({ pressed }) => [
                styles.btn,
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
                {cat}
              </Text>
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
    gap: 6,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
  },
});
