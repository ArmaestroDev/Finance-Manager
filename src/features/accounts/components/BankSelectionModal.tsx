import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput,
  TextStyle,
  View,
} from "react-native";

import { FMFonts, FMRadius, FMType } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { Avatar, EmptyState, IconBank, IconSearch, ListItem, useFMTheme } from "@/src/shared/design";
import type { ASPSP } from "../hooks/useBankConnections";

// The search bar draws its own container; drop the browser focus ring.
const NO_WEB_OUTLINE = { outlineStyle: "none" } as unknown as TextStyle;

interface BankSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  loadingBanks: boolean;
  filteredBanks: ASPSP[];
  searchQuery: string;
  onSearch: (text: string) => void;
  onSelectBank: (bank: ASPSP) => void;
}

// Bank picker (dialog on desktop, bottom sheet on mobile): M3 search bar,
// scrollable bank list, loading spinner and an empty state.
export function BankSelectionModal({
  visible,
  onClose,
  loadingBanks,
  filteredBanks,
  searchQuery,
  onSearch,
  onSelectBank,
}: BankSelectionModalProps) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  return (
    <Sheet visible={visible} onClose={onClose} title={i18n.select_bank_title}>
      <View style={[styles.search, { backgroundColor: t.surfaceContainerHigh }]}>
        <IconSearch size={18} color={t.onSurfaceVariant} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearch}
          placeholder={i18n.search_bank_placeholder}
          placeholderTextColor={t.onSurfaceVariant}
          accessibilityLabel={i18n.search_bank_placeholder}
          selectionColor={t.primary}
          autoFocus
          style={[NO_WEB_OUTLINE, styles.searchInput, { color: t.ink }]}
        />
      </View>

      {loadingBanks ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredBanks}
          keyExtractor={(item, i) => `${item.name}-${i}`}
          style={[styles.list, { marginHorizontal: -24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ListItem
              onPress={() => onSelectBank(item)}
              accessibilityLabel={item.name}
              leading={<Avatar icon={<IconBank size={18} />} />}
              title={item.name}
              subtitle={item.country || undefined}
              style={{ paddingHorizontal: 24 }}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<IconSearch />}
              title={searchQuery.trim() ? i18n.bank_none_match : i18n.bank_none_found}
            />
          }
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 16,
    borderRadius: FMRadius.full,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    fontFamily: FMFonts.sans,
    fontSize: FMType.subhead,
    paddingVertical: 0,
  },
  loading: { paddingVertical: 40, alignItems: "center" },
  list: { maxHeight: 440 },
});
