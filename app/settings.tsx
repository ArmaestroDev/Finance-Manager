import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FMColors, FMFonts, ThemePalette } from "@/src/constants/theme";
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
import {
  Button,
  IconBack,
  IconChevR,
  Label,
  Rule,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { useAccounts } from "@/src/features/accounts/context/AccountsContext";

export default function SettingsScreen() {
  const t = useFMTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

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
    i18n,
  } = useSettings();

  const { accounts } = useAccounts();

  const [isPinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState<"create" | "verify">("create");
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChangingPin, setIsChangingPin] = useState(false);

  const [isMainAccModalVisible, setMainAccModalVisible] = useState(false);

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
      setError("PIN must be 5 digits");
      return;
    }
    try {
      if (pinMode === "verify") {
        const isValid = verifyPin(pinInput);
        if (!isValid) {
          setError("Incorrect PIN");
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
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
  };

  const sections = (
    <>
      <SettingsSection title={i18n.dashboard_section} desc="Defaults that drive the Overview screen.">
        <SettingsRow
          label={i18n.main_account}
          value={activeMainAccount ? activeMainAccount.name : i18n.not_set}
          onPress={() => setMainAccModalVisible(true)}
        />
      </SettingsSection>

      <SettingsSection title={i18n.language} desc="App language and regional formatting.">
        <SegmentedToggle
          options={[
            { label: i18n.german, value: "de" },
            { label: i18n.english, value: "en" },
          ]}
          active={language}
          onSelect={(v) => setLanguage(v as "en" | "de")}
        />
      </SettingsSection>

      <SettingsSection title={i18n.appearance} desc={i18n.appearance_sub}>
        <SegmentedToggle
          options={[
            { label: i18n.theme_system, value: "system" },
            { label: i18n.theme_light, value: "light" },
            { label: i18n.theme_dark, value: "dark" },
          ]}
          active={theme}
          onSelect={(v) => setTheme(v as "system" | "light" | "dark")}
        />
        <PaletteSwatchRow
          label={i18n.palette}
          active={palette}
          onSelect={setPalette}
        />
      </SettingsSection>

      <SettingsSection title={i18n.ai_section} desc={i18n.ai_gemini_explainer}>
        <GeminiKeyRow apiKey={geminiApiKey} onSave={setGeminiApiKey} />
      </SettingsSection>

      <SettingsSection title={i18n.privacy} desc="Mask balances and protect with a PIN.">
        <SettingsToggle
          label={i18n.hide_total}
          desc={i18n.hide_total_sub}
          value={isBalanceHidden}
          onChange={handleToggleBalance}
        />
        <SettingsRow
          label={userPin ? i18n.change_pin : i18n.set_privacy_pin}
          value={userPin ? i18n.update_pin_sub : i18n.protect_balances_sub}
          onPress={() => {
            if (userPin) {
              setPinMode("verify");
              setIsChangingPin(true);
            } else {
              setPinMode("create");
              setIsChangingPin(false);
            }
            setPinInput("");
            setPinModalVisible(true);
          }}
        />
      </SettingsSection>
    </>
  );

  const modals = (
    <>
      <Modal
        visible={isPinModalVisible}
        transparent
        animationType={isWeb ? "fade" : "slide"}
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: t.surface, borderColor: t.lineStrong }]}>
            <Text style={{ fontFamily: FMFonts.display, fontSize: 22, color: t.ink, letterSpacing: -0.3 }}>
              {pinMode === "create"
                ? isChangingPin
                  ? i18n.enter_new_pin
                  : i18n.create_pin
                : isChangingPin
                  ? i18n.enter_current_pin
                  : i18n.enter_pin}
            </Text>
            <TextInput
              style={[
                styles.pinInput,
                { color: t.ink, borderColor: error ? t.neg : t.lineStrong, backgroundColor: t.bg, fontFamily: FMFonts.sansSemibold },
              ]}
              value={pinInput}
              onChangeText={(text) => {
                if (/^\d*$/.test(text) && text.length <= 5) {
                  setPinInput(text);
                  setError(null);
                }
              }}
              keyboardType="number-pad"
              maxLength={5}
              secureTextEntry
              autoFocus
            />
            {error ? (
              <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 12, color: t.neg, marginTop: 8 }}>
                {error}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <Button variant="ghost" onPress={() => setPinModalVisible(false)}>
                {i18n.cancel}
              </Button>
              <Button variant="primary" onPress={handlePinSubmit}>
                {pinMode === "create" ? i18n.set_pin_btn : i18n.confirm_btn}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isMainAccModalVisible}
        transparent
        animationType={isWeb ? "fade" : "slide"}
        onRequestClose={() => setMainAccModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: t.surface, borderColor: t.lineStrong }]}>
            <Text style={{ fontFamily: FMFonts.display, fontSize: 22, color: t.ink, letterSpacing: -0.3 }}>
              {i18n.select_main_account}
            </Text>
            <ScrollView style={{ width: "100%", maxHeight: 320, marginTop: 12 }}>
              {accounts.length === 0 ? (
                <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkMuted, textAlign: "center", padding: 20 }}>
                  {i18n.no_accounts}
                </Text>
              ) : (
                accounts.map((acc, i) => {
                  const isActive = activeMainAccount?.id === acc.id;
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={async () => {
                        await setMainAccountId(acc.id);
                        setMainAccModalVisible(false);
                      }}
                      style={({ pressed }) => [
                        styles.selectionRow,
                        {
                          borderTopColor: i === 0 ? "transparent" : t.line,
                          borderTopWidth: i === 0 ? 0 : 1,
                          backgroundColor: isActive ? t.accentSoft : "transparent",
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13, color: t.ink }}>
                          {acc.name}
                        </Text>
                        <Text style={{ fontFamily: FMFonts.sans, fontSize: 11, color: t.inkMuted, marginTop: 2 }}>
                          {acc.bankName} · {acc.category}
                        </Text>
                      </View>
                      {isActive ? (
                        <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 11, color: t.accent }}>
                          ✓
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <View style={[styles.modalActions, { marginTop: 14 }]}>
              <Button variant="ghost" full onPress={() => setMainAccModalVisible(false)}>
                {i18n.cancel}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

  if (isWeb) {
    return (
      <DesktopShell breadcrumb={i18n.settings_title} activeId="overview">
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={[styles.desktopPage, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 11, color: t.inkMuted, marginBottom: 4 }}>
              ← {i18n.tab_home ?? "Overview"}
            </Text>
          </Pressable>
          <Text style={{ fontFamily: FMFonts.display, fontSize: 30, color: t.ink, letterSpacing: -0.5, lineHeight: 32 }}>
            {i18n.settings_title}
          </Text>
          <View style={{ marginTop: 18 }}>{sections}</View>
        </ScrollView>
        {modals}
      </DesktopShell>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingTop: insets.top + 12 }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.backRow}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}>
          <IconBack size={15} color={t.inkSoft} />
        </Pressable>
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 12, color: t.inkSoft, marginLeft: 4 }}>
          {i18n.tab_home ?? "Overview"}
        </Text>
      </View>
      <MobileHeader title={i18n.settings_title} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {sections}
        <Text style={{ textAlign: "center", fontFamily: FMFonts.sans, color: t.inkMuted, fontSize: 10, marginTop: 8 }}>
          Finance Manager · all data on this device
        </Text>
      </ScrollView>
      {modals}
    </View>
  );
}

interface SettingsSectionProps {
  title: string;
  desc?: string;
  children: React.ReactNode;
}

function SettingsSection({ title, desc, children }: SettingsSectionProps) {
  const t = useFMTheme();
  const isWeb = Platform.OS === "web";

  if (isWeb) {
    return (
      <View style={[styles.desktopSection, { borderTopColor: t.line }]}>
        <View style={{ width: 240 }}>
          <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 15, color: t.ink }}>{title}</Text>
          {desc ? (
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 12.5, color: t.inkMuted, marginTop: 6, lineHeight: 18 }}>
              {desc}
            </Text>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    );
  }

  const items = React.Children.toArray(children);
  return (
    <View style={{ marginBottom: 18 }}>
      <Label style={{ marginBottom: 8, paddingHorizontal: 2, fontSize: 12 }}>{title}</Label>
      <View style={[styles.sectionList, { backgroundColor: t.surface, borderColor: t.line }]}>
        {items.map((c, i) => (
          <View key={i}>
            {c}
            {i < items.length - 1 ? <Rule style={{ marginLeft: 16 }} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

interface SettingsRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  mono?: boolean;
  icon?: React.ReactNode;
}

function SettingsRow({ label, value, onPress, mono, icon }: SettingsRowProps) {
  const t = useFMTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 15, color: t.ink }}>
          {label}
        </Text>
      </View>
      {value ? (
        <Text
          style={{
            fontFamily: mono ? FMFonts.mono : FMFonts.sans,
            fontSize: 13.5,
            color: t.inkSoft,
            marginRight: 8,
            ...(mono ? { fontVariant: ["tabular-nums"] as any } : {}),
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {icon ?? <IconChevR size={13} color={t.inkMuted} />}
    </Pressable>
  );
}

interface SettingsToggleProps {
  label: string;
  desc?: string;
  value: boolean;
  onChange: () => void;
}

function SettingsToggle({ label, desc, value, onChange }: SettingsToggleProps) {
  const t = useFMTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 15, color: t.ink }}>{label}</Text>
        {desc ? (
          <Text style={{ fontFamily: FMFonts.sans, fontSize: 12.5, color: t.inkMuted, marginTop: 3, lineHeight: 17 }}>
            {desc}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: t.lineStrong, true: t.accent }}
        thumbColor="#fff"
        ios_backgroundColor={t.lineStrong}
      />
    </View>
  );
}

interface PaletteSwatchRowProps {
  label: string;
  active: ThemePalette;
  onSelect: (p: ThemePalette) => Promise<void>;
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

function PaletteSwatchRow({ label, active, onSelect }: PaletteSwatchRowProps) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  return (
    <View style={[styles.row, { flexWrap: "wrap", gap: 12 }]}>
      <View style={{ flex: 1, minWidth: 120 }}>
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 15, color: t.ink }}>
          {label}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
        {PALETTE_ORDER.map((opt) => {
          const swatchColor = FMColors[opt.value].light.accent;
          const isActive = active === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                onSelect(opt.value);
              }}
              style={({ pressed }) => [
                styles.swatchWrap,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={i18n[opt.labelKey] as string}
              accessibilityState={{ selected: isActive }}
            >
              <View
                style={[
                  styles.swatchDot,
                  {
                    backgroundColor: swatchColor,
                    borderColor: isActive ? t.ink : "transparent",
                  },
                ]}
              />
              <Text
                style={{
                  fontFamily: isActive ? FMFonts.sansSemibold : FMFonts.sans,
                  fontSize: 11,
                  color: isActive ? t.ink : t.inkMuted,
                  marginTop: 6,
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                {i18n[opt.labelKey] as string}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface SegmentedToggleProps<T extends string> {
  options: { label: string; value: T }[];
  active: T;
  onSelect: (value: T) => void | Promise<void>;
}

function SegmentedToggle<T extends string>({ options, active, onSelect }: SegmentedToggleProps<T>) {
  const t = useFMTheme();
  return (
    <View style={styles.segmentedRow}>
      {options.map((opt) => {
        const isActive = active === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.segment,
              {
                backgroundColor: isActive ? t.accentSoft : t.surface,
                borderColor: isActive ? t.accent : t.lineStrong,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: isActive ? FMFonts.sansSemibold : FMFonts.sansMedium,
                fontSize: 15,
                color: isActive ? t.accentInk : t.ink,
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function GeminiKeyRow({
  apiKey,
  onSave,
}: {
  apiKey: string | null;
  onSave: (key: string) => Promise<void>;
}) {
  const t = useFMTheme();
  const { i18n } = useSettings();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const masked = apiKey ? apiKey.slice(0, 4) + "•••••••" + apiKey.slice(-4) : null;

  const startEdit = () => {
    setDraft(apiKey ?? "");
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setDraft("");
  };
  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
      setDraft("");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <View style={styles.aiBlock}>
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 15, color: t.ink }}>
          {i18n.ai_gemini_key_label}
        </Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="AIza…"
          placeholderTextColor={t.inkMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={false}
          style={{
            marginTop: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: t.line,
            borderRadius: 8,
            fontFamily: FMFonts.mono,
            fontSize: 14,
            color: t.ink,
            backgroundColor: t.surface,
          }}
        />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <Button variant="primary" disabled={!draft.trim() || saving} onPress={save}>
            {saving ? "…" : i18n.ai_gemini_key_save}
          </Button>
          <Button variant="ghost" onPress={cancel}>
            {i18n.cancel}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.aiBlock}>
      <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 15, color: t.ink }}>
        {i18n.ai_gemini_key_label}
      </Text>
      <Text style={{ fontFamily: FMFonts.sans, fontSize: 12.5, color: t.inkMuted, marginTop: 6, lineHeight: 17 }}>
        {i18n.ai_gemini_explainer}
      </Text>
      {masked ? (
        <Text
          style={{
            fontFamily: FMFonts.mono,
            fontSize: 13.5,
            color: t.inkSoft,
            marginTop: 10,
            fontVariant: ["tabular-nums"],
          }}
        >
          {masked}
        </Text>
      ) : null}
      <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
        <Button variant={apiKey ? "secondary" : "primary"} onPress={startEdit}>
          {apiKey ? i18n.ai_gemini_key_update : i18n.ai_gemini_key_set}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backRow: {
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
  },
  iconBtn: { padding: 6 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  desktopPage: {
    padding: 24,
  },
  desktopSection: {
    flexDirection: "row",
    gap: 32,
    paddingVertical: 24,
    borderTopWidth: 1,
  },
  sectionList: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  selectionRow: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  segmentedRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  segment: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    padding: 22,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "stretch",
  },
  pinInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
    marginTop: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    justifyContent: "flex-end",
  },
  swatchWrap: {
    alignItems: "center",
    width: 52,
  },
  swatchDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  aiBlock: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});
