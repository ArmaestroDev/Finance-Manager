import React from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import {
  Button,
  IconEdit,
  IconPlus,
  IconTrash,
  formatEUR,
  formatEURCompact,
  useFMTheme,
} from "@/src/shared/design";
import type { Profile } from "../hooks/useInvestCalculator";

interface ManageProfilesModalProps {
  visible: boolean;
  profiles: Profile[];
  onEdit: (profile: Profile) => void;
  onDelete: (id: string) => Promise<void>;
  onCreateNew: () => void;
  onClose: () => void;
  textColor?: string;
  cardColor?: string;
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

  const handleDelete = (profile: Profile) => {
    if (Platform.OS === "web") {
      if (window.confirm(i18n.delete_profile_msg.replace("{name}", profile.name))) {
        onDelete(profile.id);
      }
    } else {
      Alert.alert(
        i18n.delete_profile_title,
        i18n.delete_profile_msg.replace("{name}", profile.name),
        [
          { text: i18n.cancel, style: "cancel" },
          { text: i18n.delete, style: "destructive", onPress: () => onDelete(profile.id) },
        ],
      );
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={i18n.manage_profiles}
      subtitle={`${profiles.length} saved · tap to apply`}
      width={520}
      leftActions={
        <Button
          variant="secondary"
          icon={<IconPlus size={11} color={t.ink} />}
          onPress={() => {
            onClose();
            setTimeout(() => onCreateNew(), 100);
          }}
        >
          {i18n.create_profile}
        </Button>
      }
      actions={<Button variant="primary" onPress={onClose}>Done</Button>}
    >
      <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
        {profiles.length === 0 ? (
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 12,
              color: t.inkMuted,
              textAlign: "center",
              paddingVertical: 18,
            }}
          >
            No profiles yet.
          </Text>
        ) : (
          profiles.map((p, i) => (
            <View
              key={p.id}
              style={[
                styles.row,
                {
                  borderTopColor: t.line,
                  borderTopWidth: i === 0 ? 0 : 1,
                },
              ]}
            >
              <View style={{ width: 8, height: 36, borderRadius: 2, backgroundColor: p.color }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13.5, color: t.ink }}>
                  {p.name}
                </Text>
                <Text
                  style={{
                    fontFamily: FMFonts.sans,
                    fontSize: 10.5,
                    color: t.inkMuted,
                    marginTop: 3,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {formatEUR(parseFloat(p.initial) || 0)} · +{formatEUR(parseFloat(p.monthly) || 0)}/mo · {p.years}y · {p.returnVal}%
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  onClose();
                  setTimeout(() => onEdit(p), 100);
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
              >
                <IconEdit size={13} color={t.inkSoft} />
              </Pressable>
              <Pressable
                onPress={() => handleDelete(p)}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
              >
                <IconTrash size={13} color={t.neg} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
});
