import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Sheet } from "@/src/shared/components/Sheet";
import { Button, Field, IconCheck, Label, useFMTheme } from "@/src/shared/design";
import { PROFILE_COLORS } from "../../hooks/useInvestCalculator";

interface InvestProfileModalProps {
  visible: boolean;
  isEditing: boolean;
  onSave: (name: string, color: string) => void;
  onClose: () => void;
  i18n: Record<string, string>;
}

export function InvestProfileModal({
  visible,
  isEditing,
  onSave,
  onClose,
  i18n,
}: InvestProfileModalProps) {
  const t = useFMTheme();
  const [profileName, setProfileName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(PROFILE_COLORS[0]);

  // Reset the form each time the sheet opens so an edit doesn't leak the
  // previous draft into a fresh "save current" flow.
  useEffect(() => {
    if (visible) {
      setProfileName("");
      setSelectedColor(PROFILE_COLORS[0]);
    }
  }, [visible]);

  const canSave = profileName.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave(profileName.trim(), selectedColor);
    setProfileName("");
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={isEditing ? i18n.edit_profile_title : i18n.save_profile_title}
      subtitle="Stored locally · re-applies the inputs in one tap"
      width={460}
      actions={
        <>
          <Button variant="ghost" onPress={onClose}>
            {i18n.cancel}
          </Button>
          <Button variant="primary" onPress={handleSave} disabled={!canSave}>
            {isEditing ? i18n.update : i18n.save}
          </Button>
        </>
      }
    >
      <Field
        label={i18n.profile_name_label ?? "Name"}
        placeholder="Retirement, House…"
        value={profileName}
        onChangeText={setProfileName}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleSave}
      />

      <View style={{ marginTop: 4 }}>
        <Label style={{ marginBottom: 10 }}>
          {i18n.profile_color_label ?? "Color"}
        </Label>
        <View style={styles.swatchGrid}>
          {PROFILE_COLORS.map((color) => {
            const active = selectedColor === color;
            return (
              <Pressable
                key={color}
                onPress={() => setSelectedColor(color)}
                style={({ pressed }) => [
                  styles.swatch,
                  {
                    backgroundColor: color,
                    borderColor: active ? t.ink : t.line,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {active ? <IconCheck size={16} color="#ffffff" /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
