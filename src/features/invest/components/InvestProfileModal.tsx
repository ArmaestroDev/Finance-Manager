import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { Strings } from "@/src/constants/Strings";
import { Sheet } from "@/src/shared/components/Sheet";
import { Button, Field, IconCheck, Label, useFMTheme } from "@/src/shared/design";
import { PROFILE_COLORS } from "../hooks/useInvestCalculator";

interface InvestProfileModalProps {
  visible: boolean;
  isEditing: boolean;
  /** Name and colour of the profile being edited (prefilled when editing). */
  initial?: { name: string; color: string } | null;
  onSave: (name: string, color: string) => void;
  onClose: () => void;
  i18n: typeof Strings.de;
}

export function InvestProfileModal({ visible, isEditing, initial, onSave, onClose, i18n }: InvestProfileModalProps) {
  const t = useFMTheme();
  const [profileName, setProfileName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(PROFILE_COLORS[0]);

  // Reset the form each time the sheet opens so an edit doesn't leak the
  // previous draft into a fresh "save current" flow.
  useEffect(() => {
    if (visible) {
      setProfileName(isEditing && initial ? initial.name : "");
      setSelectedColor(isEditing && initial ? initial.color : PROFILE_COLORS[0]);
    }
    // Only when the sheet opens; `initial` is stable while it's visible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      width={460}
      actions={
        <>
          <Button variant="text" onPress={onClose}>
            {i18n.cancel}
          </Button>
          <Button onPress={handleSave} disabled={!canSave}>
            {isEditing ? i18n.update : i18n.save}
          </Button>
        </>
      }
    >
      <Field
        label={i18n.profile_name_label}
        placeholder={i18n.invest_profile_name_placeholder}
        value={profileName}
        onChangeText={setProfileName}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleSave}
      />

      <Label style={{ marginBottom: 12 }}>{i18n.profile_color_label}</Label>
      <View style={styles.swatchGrid}>
        {PROFILE_COLORS.map((color, i) => {
          const active = selectedColor === color;
          return (
            <Pressable
              key={color}
              onPress={() => setSelectedColor(color)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${i18n.profile_color_label} ${i + 1}`}
              style={[styles.ring, { borderColor: active ? t.ink : "transparent" }]}
            >
              <View style={[styles.swatch, { backgroundColor: color }]}>
                {/* Check sits on its own surface disc so it stays AA on any swatch. */}
                {active ? (
                  <View style={[styles.checkDisc, { backgroundColor: t.surface }]}>
                    <IconCheck size={13} color={t.ink} />
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  swatchGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ring: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  checkDisc: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
