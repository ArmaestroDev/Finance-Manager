import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { DesktopShell } from "@/src/shared/components/DesktopShell";
import {
  Button,
  Card,
  EmptyState,
  GrowthChart,
  IconCoins,
  IconPlus,
  IconRefresh,
  SectionTitle,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { showAlert } from "@/src/shared/utils/alert";
import { type Profile, useInvestCalculator } from "../../hooks/useInvestCalculator";
import { InvestProfileModal } from "../InvestProfileModal";
import { InvestSlider } from "../InvestSlider";
import { ManageProfilesModal } from "../ManageProfilesModal";
import { ResultHero } from "../ResultHero";
import { ScenarioList } from "../ScenarioList";

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
  const [chartW, setChartW] = useState(620);

  const series = useMemo(
    () =>
      calculateData.dataTotalValue.map((p, i) => ({
        value: p.value,
        contributed: calculateData.dataTotalInvested[i]?.value ?? 0,
      })),
    [calculateData],
  );

  const openSaveModal = () => {
    setEditingProfileId(null);
    setModalVisible(true);
  };

  const openEditModal = (profile: Profile) => {
    setEditingProfileId(profile.id);
    applyProfile(profile);
    setModalVisible(true);
  };

  const handleProfileAction = (profile: Profile) => {
    // showAlert degrades to one confirm per action on web ("Edit?", "Delete?").
    showAlert(profile.name, undefined, [
      { text: i18n.cancel, style: "cancel" },
      { text: i18n.edit, onPress: () => openEditModal(profile) },
      { text: i18n.delete, style: "destructive", onPress: () => deleteProfile(profile.id) },
    ]);
  };

  return (
    <DesktopShell
      title={i18n.invest_title}
      actions={
        <>
          <Button variant="outlined" icon={<IconRefresh size={16} />} onPress={handleReset}>
            {/* The string carries its own ↺ glyph; the button already has an icon. */}
            {i18n.reset.replace(/\s*↺\s*$/, "")}
          </Button>
          <Button icon={<IconPlus size={16} />} onPress={openSaveModal}>
            {i18n.invest_save_scenario}
          </Button>
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.page}>
        <View style={styles.mainGrid}>
          <Card padding={24} style={{ flex: 1 }}>
            <SectionTitle style={{ marginBottom: 8 }}>{i18n.invest_inputs}</SectionTitle>
            <InvestSlider label={i18n.initial_inv} value={initialInvestment} onChange={setInitialInvestment} suffix="€" max={50000} step={500} />
            <InvestSlider label={i18n.monthly_inv} value={monthlyInvestment} onChange={setMonthlyInvestment} suffix={i18n.invest_eur_per_month} max={2000} step={25} />
            <InvestSlider label={i18n.duration} value={years} onChange={setYears} suffix={i18n.years_suffix.trim()} max={40} step={1} />
            <InvestSlider label={i18n.est_return} value={interestRate} onChange={setInterestRate} suffix="%" max={12} step={0.1} decimals={2} />
          </Card>

          <Card padding={24} style={{ flex: 1.6 }}>
            <ResultHero
              value={currentDisplay.value}
              invested={currentDisplay.invested}
              gain={currentDisplay.gain}
              years={years}
              masked={masked}
              heroSize={45}
              i18n={i18n}
            />
            <View
              style={{ marginTop: 16 }}
              onLayout={(e) => {
                const w = Math.floor(e.nativeEvent.layout.width);
                if (w > 0 && w !== chartW) setChartW(w);
              }}
            >
              <GrowthChart data={series} width={chartW} height={240} masked={masked} />
            </View>
            <Text style={[styles.disclaimer, { color: t.inkSoft }]}>{i18n.invest_disclaimer}</Text>
          </Card>
        </View>

        <Card padding={24}>
          <View style={styles.cardHeader}>
            <SectionTitle style={{ flex: 1 }}>{i18n.invest_scenarios}</SectionTitle>
            <Button variant="text" size="sm" onPress={() => setManageModalVisible(true)} style={{ marginRight: -12 }}>
              {i18n.manage_profiles}
            </Button>
          </View>
          {profiles.length === 0 ? (
            <EmptyState
              icon={<IconCoins />}
              title={i18n.invest_no_scenarios_short}
              action={
                <Button variant="tonal" icon={<IconPlus size={16} />} onPress={openSaveModal}>
                  {i18n.invest_save_scenario}
                </Button>
              }
              style={{ paddingVertical: 16 }}
            />
          ) : (
            <ScenarioList
              profiles={profiles}
              masked={masked}
              onApply={applyProfile}
              onLongPress={handleProfileAction}
              inset={24}
              i18n={i18n}
            />
          )}
        </Card>
      </View>

      <InvestProfileModal
        visible={modalVisible}
        isEditing={!!editingProfileId}
        initial={profiles.find((p) => p.id === editingProfileId) ?? null}
        onSave={(name, color) => {
          saveProfile(name, color);
          setModalVisible(false);
        }}
        onClose={() => setModalVisible(false)}
        i18n={i18n}
      />
      <ManageProfilesModal
        visible={manageModalVisible}
        profiles={profiles}
        onEdit={openEditModal}
        onDelete={deleteProfile}
        onCreateNew={openSaveModal}
        onClose={() => setManageModalVisible(false)}
        i18n={i18n}
      />
    </DesktopShell>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 24, paddingBottom: 32, gap: 16 },
  mainGrid: { flexDirection: "row", gap: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  disclaimer: { fontFamily: FMFonts.sans, fontSize: FMType.caption, marginTop: 12 },
});
