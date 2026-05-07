import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import {
  Button,
  GrowthChart,
  IconPlus,
  IconRefresh,
  Label,
  formatEUR,
  formatEURCompact,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  type Profile,
  useInvestCalculator,
} from "../../hooks/useInvestCalculator";
import { InvestProfileModal } from "./InvestProfileModal";
import { ManageProfilesModal } from "./ManageProfilesModal";

export function InvestScreen() {
  const t = useFMTheme();
  const { i18n, isBalanceHidden } = useSettings();
  const masked = isBalanceHidden;

  const {
    initialInvestment,
    setInitialInvestment,
    monthlyInvestment,
    setMonthlyInvestment,
    years,
    setYears,
    interestRate,
    setInterestRate,
    profiles,
    editingProfileId,
    setEditingProfileId,
    calculateData,
    currentDisplay,
    saveProfile,
    applyProfile,
    deleteProfile,
    handleReset,
  } = useInvestCalculator();

  const [modalVisible, setModalVisible] = useState(false);
  const [manageModalVisible, setManageModalVisible] = useState(false);

  const series = useMemo(
    () =>
      calculateData.dataTotalValue.map((p, i) => ({
        value: p.value,
        contributed: calculateData.dataTotalInvested[i]?.value ?? 0,
      })),
    [calculateData],
  );

  const heroParts = splitForHero(currentDisplay.value, masked);
  const gain = currentDisplay.gain;

  const openEditModal = (profile: Profile) => {
    setEditingProfileId(profile.id);
    applyProfile(profile);
    setModalVisible(true);
  };

  const handleProfileAction = (profile: Profile) => {
    if (Platform.OS === "web") {
      const choice = window.confirm(
        `${i18n.edit_profile_title} ${profile.name}?\nOK to Edit, Cancel to Delete.`,
      );
      if (choice) openEditModal(profile);
      else if (
        window.confirm((i18n.delete_profile_msg ?? "Delete {name}?").replace("{name}", profile.name))
      ) {
        deleteProfile(profile.id);
      }
    } else {
      Alert.alert(profile.name, undefined, [
        { text: i18n.cancel, style: "cancel" },
        { text: i18n.edit, onPress: () => openEditModal(profile) },
        { text: i18n.delete, style: "destructive", onPress: () => deleteProfile(profile.id) },
      ]);
    }
  };

  return (
    <DesktopShell>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.page, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.pageTitle, { color: t.ink }]}>{i18n.invest_title}</Text>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkSoft, marginTop: 4 }}>
              ETF compound-interest simulator · for planning, not advice
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Button variant="secondary" icon={<IconRefresh size={12} color={t.ink} />} onPress={handleReset}>
              {i18n.reset}
            </Button>
            <Button
              variant="primary"
              icon={<IconPlus size={12} color={t.bg} />}
              onPress={() => {
                setEditingProfileId(null);
                setModalVisible(true);
              }}
            >
              {i18n.save}
            </Button>
          </View>
        </View>

        <View style={styles.mainGrid}>
          <View style={[styles.inputCard, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Label style={{ marginBottom: 14 }}>Inputs</Label>
            <SliderField
              label={i18n.initial_inv}
              hint={i18n.initial_inv_sub}
              value={initialInvestment}
              onChange={setInitialInvestment}
              suffix="€"
              max={50000}
            />
            <SliderField
              label={i18n.monthly_inv}
              hint={i18n.monthly_inv_sub}
              value={monthlyInvestment}
              onChange={setMonthlyInvestment}
              suffix="€/mo"
              max={2000}
            />
            <SliderField
              label={i18n.duration}
              hint={i18n.duration_sub}
              value={years}
              onChange={setYears}
              suffix={i18n.years_suffix ?? "yrs"}
              max={40}
            />
            <SliderField
              label={i18n.est_return}
              hint={i18n.est_return_sub}
              value={interestRate}
              onChange={setInterestRate}
              suffix="%"
              max={12}
            />
          </View>

          <View style={[styles.resultCard, { backgroundColor: t.surface, borderColor: t.line }]}>
            <View style={styles.resultHeader}>
              <View>
                <Label>
                  Final value · {years} years @ {interestRate}%
                </Label>
                <View style={styles.heroRow}>
                  <Text
                    style={{
                      fontFamily: FMFonts.display,
                      fontSize: 56,
                      color: t.accent,
                      lineHeight: 58,
                      letterSpacing: -1,
                    }}
                  >
                    {heroParts.sign}
                    {heroParts.integer}
                    <Text style={{ color: t.inkMuted }}>{heroParts.fraction}</Text>
                  </Text>
                  <Text
                    style={{
                      fontFamily: FMFonts.display,
                      fontSize: 24,
                      color: t.inkSoft,
                      marginLeft: 8,
                    }}
                  >
                    €
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 24 }}>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <View style={{ width: 12, height: 1.5, backgroundColor: t.inkMuted }} />
                    <Label>{i18n.total_invested}</Label>
                  </View>
                  <Text
                    style={{
                      fontFamily: FMFonts.sansSemibold,
                      fontSize: 16,
                      color: t.ink,
                      marginTop: 4,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {masked ? "••••••" : `${Math.round(currentDisplay.invested).toLocaleString("de-DE")} €`}
                  </Text>
                </View>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <View style={{ width: 12, height: 1.5, backgroundColor: t.accent }} />
                    <Label>{i18n.total_gain}</Label>
                  </View>
                  <Text
                    style={{
                      fontFamily: FMFonts.sansSemibold,
                      fontSize: 16,
                      color: t.accent,
                      marginTop: 4,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {masked ? "••••••" : `+${Math.round(gain).toLocaleString("de-DE")} €`}
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ marginTop: 16 }}>
              <GrowthChart data={series} width={620} height={220} masked={masked} />
            </View>
          </View>
        </View>

        <View style={[styles.scenariosWrap, { backgroundColor: t.surface, borderColor: t.line }]}>
          <View style={styles.scenariosHeader}>
            <Label>{`Saved scenarios · ${profiles.length}`}</Label>
            <Pressable onPress={() => setManageModalVisible(true)}>
              <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.accent }}>
                {i18n.manage_profiles} →
              </Text>
            </Pressable>
          </View>
          {profiles.length === 0 ? (
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkMuted, marginTop: 6 }}>
              No scenarios saved yet. Adjust the inputs and click Save.
            </Text>
          ) : (
            <View style={styles.scenariosGrid}>
              {profiles.map((p) => {
                const finalValue = simulateProfileValue(p);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => applyProfile(p)}
                    onLongPress={() => handleProfileAction(p)}
                    style={({ pressed }) => [
                      styles.scenarioCell,
                      { backgroundColor: t.surfaceAlt, borderColor: t.line, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <View style={{ width: 10, height: 36, borderRadius: 2, backgroundColor: p.color }} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 13, color: t.ink }}>
                        {p.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: FMFonts.sans,
                          fontSize: 10.5,
                          color: t.inkMuted,
                          marginTop: 2,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {formatEUR(parseFloat(p.initial) || 0)} · +{formatEUR(parseFloat(p.monthly) || 0)}/mo · {p.years}y · {p.returnVal}%
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          fontFamily: FMFonts.sansSemibold,
                          fontSize: 14,
                          color: t.accent,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {formatEURCompact(finalValue)}
                      </Text>
                      <Text style={{ fontFamily: FMFonts.sans, fontSize: 9.5, color: t.inkMuted, marginTop: 1 }}>
                        final
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <InvestProfileModal
        visible={modalVisible}
        isEditing={!!editingProfileId}
        onSave={(name, color) => {
          saveProfile(name, color);
          setModalVisible(false);
        }}
        onClose={() => setModalVisible(false)}
        textColor={t.ink}
        cardColor={t.surface}
        i18n={i18n}
      />
      <ManageProfilesModal
        visible={manageModalVisible}
        profiles={profiles}
        onEdit={openEditModal}
        onDelete={deleteProfile}
        onCreateNew={() => {
          setEditingProfileId(null);
          setModalVisible(true);
        }}
        onClose={() => setManageModalVisible(false)}
        textColor={t.ink}
        cardColor={t.surface}
        i18n={i18n}
      />
    </DesktopShell>
  );
}

interface SliderFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (s: string) => void;
  suffix: string;
  max: number;
}

function SliderField({ label, hint, value, onChange, suffix, max }: SliderFieldProps) {
  const t = useFMTheme();
  const numeric = parseFloat(value) || 0;
  const pct = Math.min(1, Math.max(0, numeric / max));
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 12, color: t.inkSoft }}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
          <TextInput
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            style={{
              fontFamily: FMFonts.sansSemibold,
              fontSize: 14,
              color: t.ink,
              textAlign: "right",
              minWidth: 72,
              fontVariant: ["tabular-nums"],
            }}
          />
          <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkSoft, marginLeft: 4 }}>{suffix}</Text>
        </View>
      </View>
      <View style={{ height: 4, backgroundColor: t.surfaceAlt, borderRadius: 2 }}>
        <View
          style={{
            width: `${pct * 100}%` as `${number}%`,
            height: 4,
            backgroundColor: t.accent,
            borderRadius: 2,
          }}
        />
      </View>
      {hint ? (
        <Text style={{ fontFamily: FMFonts.sans, fontSize: 10.5, color: t.inkMuted, marginTop: 4 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

function simulateProfileValue(p: Profile): number {
  const initial = parseFloat(p.initial) || 0;
  const monthly = parseFloat(p.monthly) || 0;
  const yrs = parseFloat(p.years) || 1;
  const rate = parseFloat(p.returnVal) || 0;
  const r = rate / 100 / 12;
  const months = yrs * 12;
  let value = initial;
  for (let i = 0; i < months; i++) value = (value + monthly) * (1 + r);
  return value;
}

const styles = StyleSheet.create({
  page: { padding: 24 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 18,
  },
  pageTitle: {
    fontFamily: FMFonts.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  mainGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  inputCard: {
    flex: 1,
    padding: 22,
    borderWidth: 1,
    borderRadius: 14,
  },
  resultCard: {
    flex: 1.6,
    padding: 24,
    borderWidth: 1,
    borderRadius: 14,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
  },
  scenariosWrap: {
    padding: 18,
    borderWidth: 1,
    borderRadius: 12,
  },
  scenariosHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  scenariosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scenarioCell: {
    flexBasis: "30%",
    flexGrow: 1,
    minWidth: 240,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
});
