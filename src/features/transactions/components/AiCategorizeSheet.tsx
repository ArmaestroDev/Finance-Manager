import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { Button, useFMTheme } from "@/src/shared/design";

interface AiCategorizeSheetProps {
  visible: boolean;
  /** Categorization running — shows progress and blocks closing. */
  busy: boolean;
  /** `all` = re-categorize everything, otherwise only uncategorized rows. */
  onRun: (all: boolean) => void;
  onClose: () => void;
  /** Transactions processed so far, while busy. */
  progress?: { done: number; total: number } | null;
}

// AI auto-categorization: choose scope, then show progress.
export function AiCategorizeSheet({ visible, busy, onRun, onClose, progress }: AiCategorizeSheetProps) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  return (
    <Sheet
      visible={visible}
      onClose={() => (busy ? undefined : onClose())}
      title={i18n.ai_categorization_title}
      subtitle={busy ? undefined : i18n.ai_categorization_desc}
      closeButton={!busy}
      width={420}
      actions={
        busy ? undefined : (
          <>
            <Button variant="text" onPress={onClose}>
              {i18n.cancel}
            </Button>
            <Button variant="outlined" onPress={() => onRun(true)}>
              {i18n.recategorize_all}
            </Button>
            <Button onPress={() => onRun(false)}>{i18n.uncategorized_only}</Button>
          </>
        )
      }
    >
      {busy ? (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <ActivityIndicator size="large" color={t.primary} />
          <Text
            style={{
              fontFamily: FMFonts.sans,
              color: t.inkSoft,
              fontSize: FMType.body,
              textAlign: "center",
              marginTop: 16,
            }}
          >
            {i18n.ai_processing}
          </Text>
          {progress && progress.total > 0 ? (
            <>
              <View
                style={{
                  alignSelf: "stretch",
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: t.primaryContainer,
                  marginTop: 16,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${Math.round((progress.done / progress.total) * 100)}%`,
                    height: "100%",
                    backgroundColor: t.primary,
                  }}
                />
              </View>
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  color: t.inkSoft,
                  fontSize: FMType.small,
                  marginTop: 8,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {progress.done} / {progress.total}
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}
