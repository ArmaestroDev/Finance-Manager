import React from "react";
import { View } from "react-native";

import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { IconCheck, ListItem, useFMTheme } from "@/src/shared/design";
import type { AccountCategory } from "../context/AccountsContext";
import { ACCOUNT_CATEGORIES, accountCategoryHint, accountCategoryLabel } from "../utils/accountDisplay";

interface AccountCategoryModalProps {
  visible: boolean;
  currentCategory: AccountCategory;
  onSelect: (category: AccountCategory) => void;
  onClose: () => void;
}

// Account-category picker (dialog on desktop, bottom sheet on mobile):
// single-select list; the current choice is highlighted with a check.
export function AccountCategoryModal({
  visible,
  currentCategory,
  onSelect,
  onClose,
}: AccountCategoryModalProps) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  return (
    <Sheet visible={visible} onClose={onClose} title={i18n.acct_category_title} width={440}>
      <View style={{ marginHorizontal: -24, marginBottom: 16 }} accessibilityRole="radiogroup">
        {ACCOUNT_CATEGORIES.map((cat) => {
          const active = currentCategory === cat;
          const label = accountCategoryLabel(cat, i18n);
          return (
            <ListItem
              key={cat}
              selected={active}
              title={label}
              subtitle={accountCategoryHint(cat, i18n)}
              trailing={active ? <IconCheck size={20} color={t.onSecondaryContainer} /> : undefined}
              accessibilityLabel={label}
              onPress={() => {
                onSelect(cat);
                onClose();
              }}
              style={{ paddingHorizontal: 24 }}
            />
          );
        })}
      </View>
    </Sheet>
  );
}
