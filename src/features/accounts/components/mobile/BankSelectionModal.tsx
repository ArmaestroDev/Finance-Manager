import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { Button, IconBank, IconChevR, IconSearch, useFMTheme } from "@/src/shared/design";
import type { ASPSP } from "../../hooks/useBankConnections";

interface BankSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  loadingBanks: boolean;
  filteredBanks: ASPSP[];
  searchQuery: string;
  onSearch: (text: string) => void;
  onSelectBank: (bank: ASPSP) => void;
  textColor?: string;
  backgroundColor?: string;
  tintColor?: string;
  i18n: any;
}

// Bank picker. Search field, scrollable bank rows with a bank glyph + chevron,
// loading spinner and an empty "no banks" state.
export function BankSelectionModal({
  visible,
  onClose,
  loadingBanks,
  filteredBanks,
  searchQuery,
  onSearch,
  onSelectBank,
  i18n,
}: BankSelectionModalProps) {
  const t = useFMTheme();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={i18n.select_bank_title ?? "Select Bank"}
      subtitle="300+ German & EU institutions"
      actions={
        <Button variant="ghost" onPress={onClose}>
          {i18n.cancel ?? "Close"}
        </Button>
      }
    >
      <View
        style={[
          styles.search,
          { backgroundColor: t.surface, borderColor: t.lineStrong },
        ]}
      >
        <IconSearch size={13} color={t.inkSoft} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearch}
          placeholder={i18n.search_bank_placeholder ?? "Search bank…"}
          placeholderTextColor={t.inkMuted}
          autoFocus
          style={{
            flex: 1,
            marginLeft: 8,
            fontFamily: FMFonts.sansMedium,
            fontSize: 13,
            color: t.ink,
          }}
        />
      </View>

      {loadingBanks ? (
        <View style={{ paddingVertical: 36, alignItems: "center" }}>
          <ActivityIndicator size="small" color={t.accent} />
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 12,
              color: t.inkSoft,
              marginTop: 10,
            }}
          >
            Loading banks…
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBanks}
          keyExtractor={(item, i) => `${item.name}-${i}`}
          style={{ maxHeight: 440 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: t.line }} />
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelectBank(item)}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: t.surfaceAlt, borderColor: t.line },
                ]}
              >
                <IconBank size={15} color={t.inkSoft} />
              </View>
              <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                <Text
                  style={{
                    fontFamily: FMFonts.sansSemibold,
                    fontSize: 13,
                    color: t.ink,
                  }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {(item as any).country ? (
                  <Text
                    style={{
                      fontFamily: FMFonts.sans,
                      fontSize: 11,
                      color: t.inkMuted,
                      marginTop: 2,
                    }}
                  >
                    {(item as any).country}
                  </Text>
                ) : null}
              </View>
              <IconChevR size={12} color={t.inkMuted} />
            </Pressable>
          )}
          ListEmptyComponent={
            <Text
              style={{
                fontFamily: FMFonts.sans,
                fontSize: 12,
                color: t.inkMuted,
                textAlign: "center",
                paddingVertical: 28,
              }}
            >
              No banks found.
            </Text>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
