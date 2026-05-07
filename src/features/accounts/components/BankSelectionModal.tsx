import React from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { Button, IconChevR, IconSearch, useFMTheme } from "@/src/shared/design";
import type { ASPSP } from "../hooks/useBankConnections";

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
      title={i18n.select_bank_title ?? "Select your bank"}
      subtitle="300+ German & EU institutions"
      width={520}
      actions={<Button variant="ghost" onPress={onClose}>{i18n.cancel ?? "Close"}</Button>}
    >
      <View style={[styles.search, { backgroundColor: t.surface, borderColor: t.lineStrong }]}>
        <IconSearch size={13} color={t.inkSoft} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearch}
          placeholder={i18n.search_bank_placeholder ?? "Search a bank…"}
          placeholderTextColor={t.inkMuted}
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
        <View style={{ paddingVertical: 28, alignItems: "center" }}>
          <ActivityIndicator size="small" color={t.accent} />
          <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkSoft, marginTop: 8 }}>
            Loading banks…
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBanks}
          keyExtractor={(item, i) => `${item.name}-${i}`}
          style={{ maxHeight: 420 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: t.line }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelectBank(item)}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[styles.avatar, { backgroundColor: t.surfaceAlt, borderColor: t.line }]}>
                <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 11, color: t.inkSoft }}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13, color: t.ink }} numberOfLines={1}>
                  {item.name}
                </Text>
                {(item as any).country ? (
                  <Text style={{ fontFamily: FMFonts.sans, fontSize: 11, color: t.inkMuted, marginTop: 2 }}>
                    {(item as any).country}
                  </Text>
                ) : null}
              </View>
              <IconChevR size={11} color={t.inkMuted} />
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkMuted, textAlign: "center", padding: 24 }}>
              No banks match your search.
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
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
