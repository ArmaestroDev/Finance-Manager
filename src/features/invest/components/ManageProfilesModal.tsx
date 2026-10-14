import React from "react";
import { ScrollView, View } from "react-native";

import type { Strings } from "@/src/constants/Strings";
import { Sheet } from "@/src/shared/components/Sheet";
import {
  Avatar,
  Button,
  EmptyState,
  IconButton,
  IconCoins,
  IconEdit,
  IconPlus,
  IconTrash,
  ListItem,
  useFMTheme,
} from "@/src/shared/design";
import { showAlert } from "@/src/shared/utils/alert";
import type { Profile } from "../hooks/useInvestCalculator";
import { profileSummary } from "./investFormat";

interface ManageProfilesModalProps {
  visible: boolean;
  profiles: Profile[];
  onEdit: (profile: Profile) => void;
  onDelete: (id: string) => Promise<void>;
  onCreateNew: () => void;
  onClose: () => void;
  i18n: typeof Strings.de;
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
    showAlert(i18n.delete_profile_title, i18n.delete_profile_msg.replace("{name}", profile.name), [
      { text: i18n.cancel, style: "cancel" },
      { text: i18n.delete, style: "destructive", onPress: () => onDelete(profile.id) },
    ]);
  };

  // Close first, then open the follow-up sheet once this one has dismissed.
  const thenClose = (fn: () => void) => {
    onClose();
    setTimeout(fn, 120);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={i18n.manage_profiles}
      width={520}
      actions={
        <Button icon={<IconPlus size={16} />} onPress={() => thenClose(onCreateNew)}>
          {i18n.create_profile}
        </Button>
      }
    >
      <ScrollView style={{ maxHeight: 420, marginHorizontal: -24 }} showsVerticalScrollIndicator={false}>
        {profiles.length === 0 ? (
          <EmptyState icon={<IconCoins />} title={i18n.invest_no_scenarios_short} style={{ paddingVertical: 16 }} />
        ) : (
          profiles.map((item) => (
            <ListItem
              key={item.id}
              leading={<Avatar label={item.name} color={item.color} />}
              title={item.name}
              subtitle={profileSummary(item, i18n)}
              style={{ paddingHorizontal: 24 }}
              trailing={
                <View style={{ flexDirection: "row" }}>
                  <IconButton
                    icon={<IconEdit size={18} />}
                    label={`${i18n.edit}: ${item.name}`}
                    onPress={() => thenClose(() => onEdit(item))}
                  />
                  <IconButton
                    icon={<IconTrash size={18} color={t.error} />}
                    label={`${i18n.delete}: ${item.name}`}
                    onPress={() => confirmDelete(item)}
                  />
                </View>
              }
            />
          ))
        )}
      </ScrollView>
    </Sheet>
  );
}
