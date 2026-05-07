import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CategoryPalette, FMFonts } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { Button, Field, Label, useFMTheme } from "@/src/shared/design";

interface InvestProfileModalProps {
  visible: boolean;
  isEditing: boolean;
  onSave: (name: string, color: string) => void;
  onClose: () => void;
  textColor?: string;
  cardColor?: string;
  i18n: Record<string, string>;
}

export function InvestProfileModal({ visible, isEditing, onSave, onClose, i18n }: InvestProfileModalProps) {
  const t = useFMTheme();
  const [profileName, setProfileName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(CategoryPalette[0]);

  const handleSave = () => {
    if (!profileName.trim()) return;
    onSave(profileName, selectedColor);
    setProfileName("");
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={isEditing ? i18n.edit_profile_title : i18n.save_profile_title}
      subtitle="Stored locally · re-applies inputs in one tap"
      width={460}
      actions={
        <>
          <Button variant="ghost" onPress={onClose}>{i18n.cancel}</Button>
          <Button variant="primary" onPress={handleSave} disabled={!profileName.trim()}>
            {isEditing ? i18n.update : i18n.save}
          </Button>
        </>
      }
    >
      <Field
        label={i18n.profile_name_label ?? "Name"}
        placeholder="Balanced ETF"
        value={profileName}
        onChangeText={setProfileName}
      />
      <View style={{ marginTop: 4 }}>
        <Label style={{ marginBottom: 8 }}>{i18n.profile_color_label ?? "Color"}</Label>
        <View style={styles.swatchRow}>
          {CategoryPalette.map((c) => {
            const active = selectedColor === c;
            return (
              <Pressable
                key={c}
                onPress={() => setSelectedColor(c)}
                style={({ pressed }) => [
                  styles.swatch,
                  {
                    backgroundColor: c,
                    borderColor: active ? t.ink : "transparent",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
  },
});
