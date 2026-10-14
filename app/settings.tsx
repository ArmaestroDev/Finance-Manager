import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FMColors, FMFonts, FMRadius, ThemePalette } from "@/src/constants/theme";
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
import { Sheet } from "@/src/shared/components/Sheet";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import {
  Avatar,
  Button,
  Chip,
  Field,
  IconAI,
  IconBank,
  IconCheck,
  IconChevR,
  IconEyeOff,
  IconSliders,
  IconWarn,
  ListItem,
  SegmentedButtons,
  Switch,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { useAccounts } from "@/src/features/accounts/context/AccountsContext";
import { showAlert } from "@/src/shared/utils/alert";
import { accountBankLabel, accountCategoryLabel, accountDisplayName } from "@/src/features/accounts/utils/accountDisplay";
import {
  isLocalProvider,
  listOllamaModels,
  normalizeOllamaUrl,
  ollamaHasModel,
  type AiProvider,
} from "@/src/features/transactions/utils/aiProviders";
import { BrowserAiRow } from "@/src/features/transactions/components/BrowserAiRow";

// The in-browser model needs WebGPU; the native app can only use Ollama.
const LOCAL_DEFAULT: AiProvider = Platform.OS === "web" ? "browser" : "ollama";

type KeyTarget = "gemini" | "claude";

export default function SettingsScreen() {
  const t = useFMTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isMobile = useIsMobileLayout();

  const {
    isBalanceHidden,
    userPin,
    setPin,
    toggleBalanceHidden,
    verifyPin,
    language,
    setLanguage,
    mainAccountId,
    setMainAccountId,
    theme,
    setTheme,
    palette,
    setPalette,
    geminiApiKey,
    setGeminiApiKey,
    claudeApiKey,
    setClaudeApiKey,
    aiProvider,
    setAiProvider,
    ollamaUrl,
    setOllamaUrl,
    ollamaModel,
    setOllamaModel,
    i18n,
  } = useSettings();

  const { accounts } = useAccounts();

  const [isPinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState<"create" | "verify">("create");
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);

  const [isMainAccModalVisible, setMainAccModalVisible] = useState(false);
  const [keyTarget, setKeyTarget] = useState<KeyTarget | null>(null);
  const [ollamaSheetOpen, setOllamaSheetOpen] = useState(false);
  const ollamaStatus = useOllamaStatus(aiProvider === "ollama" ? ollamaUrl : null, ollamaModel);

  const activeMainAccount =
    accounts.find((a) => a.id === mainAccountId) ||
    accounts.find((a) => a.category === "Giro") ||
    accounts[0];

  const handleToggleBalance = async () => {
    if (isBalanceHidden) {
      setPinMode("verify");
      setPinInput("");
      setPinModalVisible(true);
      setIsChangingPin(false);
    } else {
      if (!userPin) {
        setPinMode("create");
        setPinInput("");
        setPinModalVisible(true);
        setIsChangingPin(false);
      } else {
        try {
          await toggleBalanceHidden();
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handlePinSubmit = async () => {
    if (pinInput.length !== 5) {
      setError(i18n.pin_error_length);
      return;
    }
    try {
      if (pinMode === "verify") {
        const isValid = verifyPin(pinInput);
        if (!isValid) {
          setError(i18n.pin_error_incorrect);
          return;
        }
        if (isChangingPin) {
          setPinMode("create");
          setPinInput("");
          setError(null);
        } else {
          const success = await toggleBalanceHidden(pinInput);
          if (success) setPinModalVisible(false);
        }
      } else {
        await setPin(pinInput);
        setPinModalVisible(false);
        if (!isChangingPin) await toggleBalanceHidden(pinInput);
        setIsChangingPin(false);
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : i18n.generic_error);
    }
  };

  const maskKey = (k: string | null) => (k ? k.slice(0, 4) + "•••••" + k.slice(-4) : i18n.not_set);

  const sections = (
    <>
      <SettingsGroup title={i18n.settings_general}>
        <ListItem
          leading={<RowIcon icon={<IconBank size={18} />} />}
          title={i18n.main_account}
          subtitle={activeMainAccount ? accountDisplayName(activeMainAccount, i18n) : i18n.not_set}
          trailing={<IconChevR size={16} color={t.inkSoft} />}
          onPress={() => setMainAccModalVisible(true)}
          accessibilityLabel={i18n.main_account}
        />
        <ControlRow label={i18n.language}>
          <SegmentedButtons
            options={[
              { label: i18n.german, value: "de" },
              { label: i18n.english, value: "en" },
            ]}
            value={language}
            onChange={(v) => setLanguage(v as "en" | "de")}
            full
          />
        </ControlRow>
      </SettingsGroup>

      <SettingsGroup title={i18n.appearance}>
        <ControlRow>
          <SegmentedButtons
            options={[
              { label: i18n.theme_system, value: "system" },
              { label: i18n.theme_light, value: "light" },
              { label: i18n.theme_dark, value: "dark" },
            ]}
            value={theme}
            onChange={(v) => setTheme(v as "system" | "light" | "dark")}
            full
          />
        </ControlRow>
        <ControlRow label={i18n.palette}>
          <PaletteSwatches active={palette} onSelect={setPalette} />
        </ControlRow>
      </SettingsGroup>

      <SettingsGroup title={i18n.ai_section}>
        <ControlRow>
          <SegmentedButtons
            options={[
              { label: i18n.ai_provider_gemini, value: "gemini" },
              { label: i18n.ai_provider_claude, value: "claude" },
              { label: i18n.ai_provider_ollama, value: "local" },
            ]}
            value={isLocalProvider(aiProvider) ? "local" : aiProvider}
            onChange={(v) => {
              if (v !== "local") void setAiProvider(v as AiProvider);
              else if (!isLocalProvider(aiProvider)) void setAiProvider(LOCAL_DEFAULT);
            }}
            full
          />
        </ControlRow>
        {aiProvider === "browser" ? (
          <BrowserAiRow leading={(icon) => <RowIcon icon={icon as React.ReactElement<{ color?: string }>} />} />
        ) : null}
        {isLocalProvider(aiProvider) && Platform.OS === "web" ? (
          <ListItem
            leading={<RowIcon icon={<IconSliders size={18} />} />}
            title={i18n.ai_browser_use_ollama}
            subtitle={i18n.ai_browser_use_ollama_sub}
            trailingAction={
              <Switch
                value={aiProvider === "ollama"}
                onValueChange={() => setAiProvider(aiProvider === "ollama" ? "browser" : "ollama")}
                label={i18n.ai_browser_use_ollama}
              />
            }
            onPress={() => setAiProvider(aiProvider === "ollama" ? "browser" : "ollama")}
            accessibilityLabel={i18n.ai_browser_use_ollama}
          />
        ) : null}
        {aiProvider === "gemini" ? (
          <ListItem
            leading={<RowIcon icon={<IconAI size={18} />} />}
            title={i18n.ai_gemini_key_label}
            subtitle={maskKey(geminiApiKey)}
            trailingAction={<Button variant="text" size="sm" onPress={() => setKeyTarget("gemini")}>{geminiApiKey ? i18n.ai_key_change : i18n.ai_key_add}</Button>}
            onPress={() => setKeyTarget("gemini")}
            accessibilityLabel={i18n.ai_gemini_key_label}
          />
        ) : null}
        {aiProvider === "claude" ? (
          <ListItem
            leading={<RowIcon icon={<IconAI size={18} />} />}
            title={i18n.ai_claude_key_label}
            subtitle={maskKey(claudeApiKey)}
            trailingAction={<Button variant="text" size="sm" onPress={() => setKeyTarget("claude")}>{claudeApiKey ? i18n.ai_key_change : i18n.ai_key_add}</Button>}
            onPress={() => setKeyTarget("claude")}
            accessibilityLabel={i18n.ai_claude_key_label}
          />
        ) : null}
        {aiProvider === "ollama" ? (
          <ListItem
            leading={<RowIcon icon={<IconAI size={18} />} />}
            title={ollamaModel}
            subtitle={ollamaStatusText(ollamaStatus, ollamaModel, i18n)}
            lines={2}
            trailing={<OllamaStatusIcon status={ollamaStatus} />}
            onPress={() => setOllamaSheetOpen(true)}
            accessibilityLabel={i18n.ai_ollama_title}
          />
        ) : null}
      </SettingsGroup>

      <SettingsGroup title={i18n.privacy}>
        <ListItem
          leading={<RowIcon icon={<IconEyeOff size={18} />} />}
          title={i18n.hide_total}
          subtitle={i18n.hide_total_sub}
          lines={2}
          trailingAction={<Switch value={isBalanceHidden} onValueChange={handleToggleBalance} label={i18n.hide_total} />}
          onPress={handleToggleBalance}
          accessibilityLabel={i18n.hide_total}
        />
        <ListItem
          leading={<RowIcon icon={<IconSliders size={18} />} />}
          title={userPin ? i18n.change_pin : i18n.set_privacy_pin}
          trailing={<IconChevR size={16} color={t.inkSoft} />}
          onPress={() => {
            if (userPin) {
              setPinMode("verify");
              setIsChangingPin(true);
            } else {
              setPinMode("create");
              setIsChangingPin(false);
            }
            setPinInput("");
            setError(null);
            setPinModalVisible(true);
          }}
        />
      </SettingsGroup>

      <Text style={[styles.footer, { color: t.inkSoft }]}>{i18n.settings_footer_note}</Text>
    </>
  );

  const modals = (
    <>
      <Sheet
        visible={isPinModalVisible}
        onClose={() => setPinModalVisible(false)}
        width={400}
        title={
          pinMode === "create"
            ? isChangingPin
              ? i18n.enter_new_pin
              : i18n.create_pin
            : isChangingPin
              ? i18n.enter_current_pin
              : i18n.enter_pin
        }
        actions={
          <>
            <Button variant="text" onPress={() => setPinModalVisible(false)}>
              {i18n.cancel}
            </Button>
            <Button onPress={handlePinSubmit}>
              {pinMode === "create" ? i18n.set_pin_btn : i18n.confirm_btn}
            </Button>
          </>
        }
      >
        <Field
          // Remount per step so autoFocus moves to the "new PIN" field after verifying.
          key={pinMode}
          label="PIN"
          value={pinInput}
          onChangeText={(text) => {
            if (/^\d*$/.test(text) && text.length <= 5) {
              setPinInput(text);
              setError(null);
            }
          }}
          onSubmitEditing={handlePinSubmit}
          keyboardType="number-pad"
          maxLength={5}
          secureTextEntry
          autoFocus
          mono
          error={error ?? undefined}
          containerStyle={{ marginBottom: 0 }}
        />
      </Sheet>

      <Sheet
        visible={isMainAccModalVisible}
        onClose={() => setMainAccModalVisible(false)}
        title={i18n.select_main_account}
        width={440}
      >
        <ScrollView style={{ maxHeight: 400, marginHorizontal: -24 }}>
          {accounts.length === 0 ? (
            <Text style={[styles.empty, { color: t.inkSoft }]}>{i18n.no_accounts}</Text>
          ) : (
            accounts.map((acc) => {
              const isActive = activeMainAccount?.id === acc.id;
              const name = accountDisplayName(acc, i18n);
              return (
                <ListItem
                  key={acc.id}
                  leading={<Avatar label={name} />}
                  title={name}
                  subtitle={`${accountBankLabel(acc, i18n)} · ${accountCategoryLabel(acc.category, i18n)}`}
                  trailing={isActive ? <IconCheck size={18} color={t.primary} /> : undefined}
                  selected={isActive}
                  onPress={async () => {
                    await setMainAccountId(acc.id);
                    setMainAccModalVisible(false);
                  }}
                  accessibilityLabel={name}
                  style={{ paddingHorizontal: 24 }}
                />
              );
            })
          )}
        </ScrollView>
      </Sheet>

      <ApiKeySheet
        target={keyTarget}
        onClose={() => setKeyTarget(null)}
        gemini={{ value: geminiApiKey, save: setGeminiApiKey }}
        claude={{ value: claudeApiKey, save: setClaudeApiKey }}
      />

      <OllamaSheet
        visible={ollamaSheetOpen}
        onClose={() => {
          setOllamaSheetOpen(false);
          ollamaStatus.recheck();
        }}
        url={ollamaUrl}
        model={ollamaModel}
        onSave={async (url, model) => {
          await Promise.all([setOllamaUrl(url), setOllamaModel(model)]);
        }}
      />
    </>
  );

  if (!isMobile) {
    return (
      <DesktopShell title={i18n.settings_title} onBack={() => router.back()}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.desktopPage}>{sections}</View>
        {modals}
      </DesktopShell>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <MobileHeader title={i18n.settings_title} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {sections}
      </ScrollView>
      {modals}
    </View>
  );
}

function RowIcon({ icon }: { icon: React.ReactElement<{ color?: string }> }) {
  const t = useFMTheme();
  return <View style={{ width: 40, alignItems: "center" }}>{React.cloneElement(icon, { color: t.onSurfaceVariant })}</View>;
}

// Android-settings style group: primary-coloured title, rows in one rounded card.
function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useFMTheme();
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: FMFonts.sansMedium, fontSize: 14, lineHeight: 20, color: t.primary, marginBottom: 8, marginLeft: 16 }}
      >
        {title}
      </Text>
      <View style={[styles.group, { backgroundColor: t.surface }]}>{children}</View>
    </View>
  );
}

// Row that hosts a control (segmented buttons, swatches) under an optional label.
function ControlRow({ label, children }: { label?: string; children: React.ReactNode }) {
  const t = useFMTheme();
  return (
    <View style={styles.controlRow}>
      {label ? (
        <Text style={{ fontFamily: FMFonts.sans, fontSize: 16, lineHeight: 22, color: t.ink, marginBottom: 12 }}>
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

type PaletteLabelKey =
  | "palette_mulberry"
  | "palette_red"
  | "palette_purple"
  | "palette_green"
  | "palette_turquoise";

const PALETTE_ORDER: { value: ThemePalette; labelKey: PaletteLabelKey }[] = [
  { value: "mulberry", labelKey: "palette_mulberry" },
  { value: "red", labelKey: "palette_red" },
  { value: "purple", labelKey: "palette_purple" },
  { value: "green", labelKey: "palette_green" },
  { value: "turquoise", labelKey: "palette_turquoise" },
];

function PaletteSwatches({ active, onSelect }: { active: ThemePalette; onSelect: (p: ThemePalette) => Promise<void> }) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "space-between", maxWidth: 360 }} accessibilityRole="radiogroup">
      {PALETTE_ORDER.map((opt) => {
        const p = FMColors[opt.value].light;
        const isActive = active === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            accessibilityRole="radio"
            accessibilityLabel={i18n[opt.labelKey]}
            accessibilityState={{ checked: isActive, selected: isActive }}
            style={{ alignItems: "center", width: 58 }}
          >
            <View
              style={[
                styles.swatchRing,
                { borderColor: isActive ? t.ink : "transparent" },
              ]}
            >
              {/* M3 dynamic-colour style swatch: primary over its container tones */}
              <View style={[styles.swatch, { backgroundColor: p.primaryContainer }]}>
                <View style={[styles.swatchHalf, { backgroundColor: p.primary }]} />
              </View>
            </View>
            <Text
              style={{
                fontFamily: isActive ? FMFonts.sansMedium : FMFonts.sans,
                fontSize: 12,
                color: isActive ? t.ink : t.inkSoft,
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {i18n[opt.labelKey]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface KeyStore {
  value: string | null;
  save: (key: string) => Promise<void>;
}

function ApiKeySheet({
  target,
  onClose,
  gemini,
  claude,
}: {
  target: KeyTarget | null;
  onClose: () => void;
  gemini: KeyStore;
  claude: KeyStore;
}) {
  const { i18n } = useSettings();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [openFor, setOpenFor] = useState<KeyTarget | null>(null);
  const store = target === "claude" ? claude : gemini;

  // Seed the draft when the sheet opens for a provider.
  if (target !== openFor) {
    setOpenFor(target);
    setDraft(target ? (store.value ?? "") : "");
  }

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await store.save(trimmed);
      onClose();
    } catch (e) {
      showAlert(i18n.error_title, e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={target !== null}
      onClose={onClose}
      width={440}
      title={target === "claude" ? i18n.ai_claude_key_label : i18n.ai_gemini_key_label}
      actions={
        <>
          <Button variant="text" onPress={onClose}>
            {i18n.cancel}
          </Button>
          <Button disabled={!draft.trim()} loading={saving} onPress={save}>
            {i18n.save}
          </Button>
        </>
      }
    >
      <Field
        label={i18n.api_key}
        value={draft}
        onChangeText={setDraft}
        placeholder={target === "claude" ? "sk-ant-…" : "AIza…"}
        hint={target === "claude" ? i18n.ai_claude_explainer : i18n.ai_gemini_explainer}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        mono
        containerStyle={{ marginBottom: 0 }}
      />
    </Sheet>
  );
}

// ── Local AI (Ollama) ──

type OllamaState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "unreachable" }
  | { kind: "ok"; installed: string[]; hasModel: boolean };

type Strings = ReturnType<typeof useSettings>["i18n"];

async function checkOllama(url: string, model: string): Promise<OllamaState> {
  try {
    const installed = await listOllamaModels(url);
    return { kind: "ok", installed, hasModel: ollamaHasModel(installed, model) };
  } catch {
    return { kind: "unreachable" };
  }
}

/** Reachability + model presence of the configured server; `url` null = off. */
function useOllamaStatus(url: string | null, model: string) {
  const [state, setState] = useState<OllamaState>({ kind: "idle" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    setState({ kind: "checking" });
    checkOllama(url, model).then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, [url, model, tick]);
  const recheck = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, recheck };
}

function ollamaStatusText(s: OllamaState, model: string, i18n: Strings): string {
  if (s.kind === "checking" || s.kind === "idle") return i18n.ai_ollama_checking;
  if (s.kind === "unreachable") return i18n.ai_ollama_unreachable;
  return s.hasModel ? i18n.ai_ollama_ok : i18n.ai_ollama_model_missing.replace(/\{model\}/g, model);
}

function OllamaStatusIcon({ status }: { status: OllamaState }) {
  const t = useFMTheme();
  if (status.kind === "checking" || status.kind === "idle") {
    return <ActivityIndicator size="small" color={t.inkSoft} />;
  }
  if (status.kind === "ok" && status.hasModel) return <IconCheck size={20} color={t.pos} />;
  return <IconWarn size={20} color={t.error} />;
}

function OllamaSheet({
  visible,
  onClose,
  url,
  model,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  url: string;
  model: string;
  onSave: (url: string, model: string) => Promise<void>;
}) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  const [draftUrl, setDraftUrl] = useState(url);
  const [draftModel, setDraftModel] = useState(model);
  const [status, setStatus] = useState<OllamaState>({ kind: "idle" });
  const [wasVisible, setWasVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed drafts each time the sheet opens.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDraftUrl(url);
      setDraftModel(model);
      setStatus({ kind: "idle" });
    }
  }

  const test = useCallback(async (u: string, m: string) => {
    setStatus({ kind: "checking" });
    setStatus(await checkOllama(normalizeOllamaUrl(u), m.trim()));
  }, []);

  // Fetch the installed models once on open, for the chips.
  useEffect(() => {
    if (visible) test(url, model);
  }, [visible, url, model, test]);

  const installed = status.kind === "ok" ? status.installed : [];
  // Model presence follows the field as the user types or picks a chip.
  const live: OllamaState =
    status.kind === "ok" ? { ...status, hasModel: ollamaHasModel(status.installed, draftModel) } : status;
  const save = async () => {
    setSaving(true);
    try {
      await onSave(draftUrl, draftModel);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const statusColor =
    live.kind === "ok" && live.hasModel ? t.pos : live.kind === "checking" ? t.inkSoft : t.error;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      width={460}
      title={i18n.ai_ollama_title}
      actions={
        <>
          <Button variant="text" onPress={() => test(draftUrl, draftModel)}>
            {i18n.ai_ollama_test}
          </Button>
          <View style={{ flex: 1 }} />
          <Button variant="text" onPress={onClose}>
            {i18n.cancel}
          </Button>
          <Button disabled={!draftModel.trim()} loading={saving} onPress={save}>
            {i18n.save}
          </Button>
        </>
      }
    >
      <Field
        label={i18n.ai_ollama_model}
        value={draftModel}
        onChangeText={setDraftModel}
        placeholder="qwen3.5:9b"
        autoCapitalize="none"
        autoCorrect={false}
        mono
      />
      {installed.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: -4, marginBottom: 16 }}>
          {installed.map((m) => (
            <Chip key={m} filter active={m === draftModel.trim()} onPress={() => setDraftModel(m)}>
              {m}
            </Chip>
          ))}
        </View>
      ) : null}
      <Field
        label={i18n.ai_ollama_url}
        value={draftUrl}
        onChangeText={setDraftUrl}
        placeholder="http://localhost:11434"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        mono
        hint={Platform.OS !== "web" ? i18n.ai_ollama_native_hint : undefined}
      />
      {status.kind !== "idle" ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: FMFonts.sans, fontSize: 14, lineHeight: 20, color: statusColor }}
        >
          {ollamaStatusText(live, draftModel.trim(), i18n)}
        </Text>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  desktopPage: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  group: {
    borderRadius: FMRadius.lg,
    overflow: "hidden",
    paddingVertical: 4,
  },
  controlRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  swatchRing: {
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
    overflow: "hidden",
  },
  swatchHalf: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 19,
  },
  footer: {
    textAlign: "center",
    fontFamily: FMFonts.sans,
    fontSize: 12,
    marginTop: 4,
  },
  empty: {
    fontFamily: FMFonts.sans,
    fontSize: 14,
    textAlign: "center",
    padding: 24,
  },
});
