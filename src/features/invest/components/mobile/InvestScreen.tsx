import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { FMFonts, FMType } from "@/src/constants/theme";
import { MobileShell } from "@/src/shared/components/MobileShell";
import {
  Button,
  Card,
  EmptyState,
  GrowthChart,
  IconButton,
  IconCoins,
  IconPlus,
  IconRefresh,
  IconSliders,
  SectionTitle,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { type Profile, useInvestCalculator } from "../../hooks/useInvestCalculator";
import { InvestProfileModal } from "../InvestProfileModal";
import { InvestSlider } from "../InvestSlider";
import { ManageProfilesModal } from "../ManageProfilesModal";
import { ResultHero } from "../ResultHero";
import { ScenarioList } from "../ScenarioList";

const PAD = 16;

export function InvestScreen() {
  const t = useFMTheme();
  const { i18n, isBalanceHidden } = useSettings();
  const masked = isBalanceHidden;
  const { width: windowWidth } = useWindowDimensions();

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

  // Card inner width: screen − 2×16 shell padding − 2×16 card padding.
  const chartWidth = windowWidth - PAD * 4;

  const openSaveModal = () => {
    setEditingProfileId(null);
    setModalVisible(true);
  };

  const openEditModal = (profile: Profile) => {
    setEditingProfileId(profile.id);
    applyProfile(profile);
    setModalVisible(true);
  };

  return (
    <MobileShell
      title={i18n.invest_title}
      right={
        <>
          <IconButton
            onPress={handleReset}
            label={i18n.reset.replace(/\s*↺\s*$/, "")}
            icon={<IconRefresh size={20} />}
          />
          <IconButton
            onPress={() => setManageModalVisible(true)}
            label={i18n.manage_profiles}
            icon={<IconSliders size={20} />}
          />
        </>
      }
    >
      <View style={{ gap: 12 }}>
        <Card padding={PAD}>
          <ResultHero
            value={currentDisplay.value}
            invested={currentDisplay.invested}
            gain={currentDisplay.gain}
            years={years}
            masked={masked}
            heroSize={36}
            i18n={i18n}
          />
          <View style={{ marginTop: 16 }}>
            <GrowthChart data={series} width={chartWidth} height={180} masked={masked} />
          </View>
          <Text style={[styles.disclaimer, { color: t.inkSoft }]}>{i18n.invest_disclaimer}</Text>
        </Card>

        <Card padding={PAD}>
          <SectionTitle style={{ marginBottom: 8 }}>{i18n.invest_inputs}</SectionTitle>
          <InvestSlider label={i18n.initial_inv} value={initialInvestment} onChange={setInitialInvestment} suffix="€" max={50000} step={500} />
          <InvestSlider label={i18n.monthly_inv} value={monthlyInvestment} onChange={setMonthlyInvestment} suffix={i18n.invest_eur_per_month} max={2000} step={25} />
          <InvestSlider label={i18n.duration} value={years} onChange={setYears} suffix={i18n.years_suffix.trim()} max={40} step={1} />
          <InvestSlider label={i18n.est_return} value={interestRate} onChange={setInterestRate} suffix="%" max={12} step={0.1} decimals={2} />
        </Card>

        <Card padding={PAD}>
          <SectionTitle>{i18n.invest_scenarios}</SectionTitle>
          {profiles.length === 0 ? (
            <EmptyState icon={<IconCoins />} title={i18n.invest_no_scenarios_short} style={{ paddingVertical: 16 }} />
          ) : (
            <ScenarioList
              profiles={profiles}
              masked={masked}
              onApply={applyProfile}
              onLongPress={openEditModal}
              inset={PAD}
              i18n={i18n}
            />
          )}
          <Button variant="tonal" full icon={<IconPlus size={16} />} onPress={openSaveModal} style={{ marginTop: 8 }}>
            {i18n.invest_save_scenario}
          </Button>
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
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  disclaimer: { fontFamily: FMFonts.sans, fontSize: FMType.caption, marginTop: 12 },
});
