import React, { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { Sheet } from "@/src/shared/components/Sheet";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { Button, IconAI, IconCheck, IconWarn, ListItem, useFMTheme } from "@/src/shared/design";

import { useBrowserAi } from "../hooks/useBrowserAi";
import {
  BROWSER_AI_DOWNLOAD_GB,
  BROWSER_AI_MODEL_LABEL,
  type BrowserAiState,
} from "../utils/browserAi";

type Strings = ReturnType<typeof useSettings>["i18n"];

const formatGb = (gb: number, language: string) =>
  gb.toLocaleString(language === "de" ? "de-DE" : "en-US", { maximumFractionDigits: 1 });

function statusText(state: BrowserAiState, i18n: Strings, size: string): string {
  switch (state.phase) {
    case "idle":
    case "checking":
      return i18n.ai_browser_checking;
    case "available":
      return i18n.ai_browser_available.replace("{size}", size);
    case "downloading":
      return i18n.ai_browser_downloading.replace("{percent}", String(Math.round(state.progress * 100)));
    case "loading":
      return i18n.ai_browser_loading.replace("{percent}", String(Math.round(state.progress * 100)));
    case "verifying":
      return i18n.ai_browser_verifying;
    case "ready":
      return i18n.ai_browser_ready;
    case "unsupported":
      return `${i18n.ai_browser_not_possible}. ${i18n[`ai_browser_reason_${state.reason}`]}`;
    case "error":
      return i18n.ai_browser_error.replace("{message}", state.message);
  }
}

// Settings row for the in-browser model: hardware check → consent → download
// → ready, or a plain "not possible on this device" with the reason.
export function BrowserAiRow({ leading }: { leading?: (icon: React.ReactElement) => React.ReactNode }) {
  const t = useFMTheme();
  const { i18n, language } = useSettings();
  const { state, download, remove, recheck } = useBrowserAi(true);
  const [confirm, setConfirm] = useState<"download" | "remove" | null>(null);
  const size = formatGb(BROWSER_AI_DOWNLOAD_GB, language);

  const busy = state.phase === "downloading" || state.phase === "loading";
  const progress = busy ? state.progress : 0;

  const trailing =
    state.phase === "idle" || state.phase === "checking" || state.phase === "verifying" || busy ? (
      <ActivityIndicator size="small" color={t.inkSoft} />
    ) : state.phase === "ready" ? (
      <IconCheck size={20} color={t.pos} />
    ) : state.phase === "unsupported" || state.phase === "error" ? (
      <IconWarn size={20} color={t.error} />
    ) : undefined;

  const action =
    state.phase === "available" ? (
      <Button size="sm" onPress={() => setConfirm("download")}>
        {i18n.ai_browser_download}
      </Button>
    ) : state.phase === "ready" ? (
      <Button variant="text" size="sm" onPress={() => setConfirm("remove")}>
        {i18n.ai_browser_remove}
      </Button>
    ) : state.phase === "unsupported" || state.phase === "error" ? (
      <Button variant="text" size="sm" onPress={() => void recheck()}>
        {i18n.ai_browser_recheck}
      </Button>
    ) : undefined;

  const icon = <IconAI size={18} />;

  return (
    <>
      <ListItem
        leading={leading ? leading(icon) : icon}
        title={`${BROWSER_AI_MODEL_LABEL} · ${i18n.ai_browser_title}`}
        subtitle={statusText(state, i18n, size)}
        lines={3}
        trailing={action ? undefined : trailing}
        trailingAction={action}
        accessibilityLabel={i18n.ai_browser_title}
      />
      {busy ? (
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          style={{
            height: 4,
            borderRadius: 2,
            marginHorizontal: 16,
            marginBottom: 12,
            backgroundColor: t.primaryContainer,
            overflow: "hidden",
          }}
        >
          <View style={{ width: `${Math.round(progress * 100)}%`, height: "100%", backgroundColor: t.primary }} />
        </View>
      ) : null}

      <Sheet
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        width={440}
        title={confirm === "remove" ? i18n.ai_browser_remove_title : i18n.ai_browser_consent_title}
        actions={
          <>
            <Button variant="text" onPress={() => setConfirm(null)}>
              {i18n.cancel}
            </Button>
            <Button
              onPress={() => {
                const which = confirm;
                setConfirm(null);
                if (which === "remove") void remove();
                else void download();
              }}
            >
              {confirm === "remove" ? i18n.ai_browser_remove : i18n.ai_browser_download}
            </Button>
          </>
        }
      >
        <Text style={{ fontFamily: FMFonts.sans, fontSize: FMType.body, lineHeight: 22, color: t.inkSoft }}>
          {confirm === "remove"
            ? i18n.ai_browser_remove_msg.replace("{size}", size)
            : i18n.ai_browser_consent_msg.replace("{model}", BROWSER_AI_MODEL_LABEL).replace("{size}", size)}
        </Text>
      </Sheet>
    </>
  );
}
