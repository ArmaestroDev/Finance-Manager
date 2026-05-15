import React from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import {
  Button,
  IconEdit,
  IconPlus,
  IconTrash,
  useFMTheme,
} from "@/src/shared/design";
import type { Profile } from "../../hooks/useInvestCalculator";

interface ManageProfilesModalProps {
  visible: boolean;
  profiles: Profile[];
  onEdit: (profile: Profile) => void;
  onDelete: (id: string) => Promise<void>;
  onCreateNew: () => void;
  onClose: () => void;
  i18n: Record<string, string>;
}

export function ManageProfilesModal({
  visible,
  profiles,
  onEdit,
  onDelete,
  onCreateNew,
  onClose,
  i18n,
}: ManageProfilesModalProps) {
  const t = useFMTheme();

  const confirmDelete = (profile: Profile) => {
    Alert.alert(
      i18n.delete_profile_title,
      (i18n.delete_profile_msg ?? "Delete {name}?").replace(
        "{name}",
        profile.name,
      ),
      [
        { text: i18n.cancel, style: "cancel" },
        {
          text: i18n.delete,
          style: "destructive",
          onPress: () => onDelete(profile.id),
        },
      ],
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={i18n.manage_profiles}
      subtitle={`${profiles.length} saved · tap Edit to load & adjust`}
      width={520}
      actions={
        <Button
          variant="primary"
          full
          icon={<IconPlus size={12} color={t.bg} />}
          onPress={() => {
            onClose();
            setTimeout(() => onCreateNew(), 120);
          }}
        >
          {i18n.create_profile}
        </Button>
      }
    >
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        style={{ maxHeight: 420 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: t.line }} />
        )}
        ListEmptyComponent={
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 12,
              color: t.inkMuted,
              textAlign: "center",
              paddingVertical: 22,
            }}
          >
            No scenarios saved yet.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View
              style={{
                width: 10,
                height: 38,
                borderRadius: 2,
                backgroundColor: item.color,
              }}
            />
            <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
              <Text
                style={{
                  fontFamily: FMFonts.sansSemibold,
                  fontSize: 13.5,
                  color: t.ink,
                }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  fontSize: 10.5,
                  color: t.inkMuted,
                  marginTop: 3,
                  fontVariant: ["tabular-nums"],
                }}
                numberOfLines={1}
              >
                {fmtShort(parseFloat(item.initial) || 0)} · +
                {fmtShort(parseFloat(item.monthly) || 0)}/mo · {item.years}y ·{" "}
                {item.returnVal}%
              </Text>
            </View>
            <View style={styles.actions}>
              <Button
                variant="secondary"
                size="sm"
                icon={<IconEdit size={11} color={t.ink} />}
                onPress={() => {
                  onClose();
                  setTimeout(() => onEdit(item), 120);
                }}
              >
                {i18n.edit}
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<IconTrash size={11} color={t.neg} />}
                onPress={() => confirmDelete(item)}
              >
                {i18n.delete}
              </Button>
            </View>
          </View>
        )}
      />
    </Sheet>
  );
}

function fmtShort(value: number): string {
  return `${Math.round(value).toLocaleString("de-DE")} €`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 6,
    marginLeft: 10,
  },
});
