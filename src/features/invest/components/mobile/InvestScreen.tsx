import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
import {
  Balance,
  Chip,
  GrowthChart,
  IconPlus,
  IconRefresh,
  IconSliders,
  Label,
  Money,
  formatEUR,
  splitForHero,
  useFMTheme,
} from "@/src/shared/design";
import { useSettings } from "@/src/shared/context/SettingsContext";
import {
  type Profile,
  useInvestCalculator,
} from "../../hooks/useInvestCalculator";
import { InvestProfileModal } from "../InvestProfileModal";
import { ManageProfilesModal } from "../ManageProfilesModal";

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

  const finalValue = currentDisplay.value;
  const finalInvested = currentDisplay.invested;
  const gain = currentDisplay.gain;

  const heroParts = splitForHero(finalValue, masked);
  const chartWidth = Math.min(windowWidth - 36 - 32, 560);

  const openEditModal = (profile: Profile) => {
    setEditingProfileId(profile.id);
    applyProfile(profile);
    setModalVisible(true);
  };

  const handleProfileLongPress = (profile: Profile) => {
    if (Platform.OS === "web") {
      const choice = window.confirm(
        `${i18n.edit_profile_title} ${profile.name}?\nOK to Edit, Cancel to Delete.`,
      );
      if (choice) {
        openEditModal(profile);
      } else if (
        window.confirm((i18n.delete_profile_msg ?? "Delete {name}?").replace("{name}", profile.name))
      ) {
        deleteProfile(profile.id);
      }
    } else {
      Alert.alert(i18n.edit_profile_title, profile.name, [
        { text: i18n.cancel, style: "cancel" },
        { text: i18n.edit, onPress: () => openEditModal(profile) },
        {
          text: i18n.delete,
          style: "destructive",
          onPress: () => deleteProfile(profile.id),
        },
      ]);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <MobileHeader
        title={i18n.invest_title}
        sub="ETF compound simulator"
        right={
          <>
            <Chip onPress={handleReset} icon={<IconRefresh size={11} color={t.inkSoft} />}>
              {i18n.reset}
            </Chip>
            <Chip onPress={() => setManageModalVisible(true)} icon={<IconSliders size={11} color={t.inkSoft} />}>
              {i18n.manage_profiles}
            </Chip>
          </>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Result hero */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
          <View style={styles.cardHeader}>
            <Label>In {years} years</Label>
            <Text style={{ fontFamily: FMFonts.sans, fontSize: 10, color: t.inkMuted }}>
              @ {interestRate}% p.a.
            </Text>
          </View>
          <View style={styles.heroRow}>
            <Text
              style={{
                fontFamily: FMFonts.display,
                fontSize: 36,
                color: t.accent,
                lineHeight: 38,
                letterSpacing: -0.5,
              }}
            >
              {heroParts.sign}
              {heroParts.integer}
              <Text style={{ color: t.inkMuted }}>{heroParts.fraction}</Text>
            </Text>
            <Text
              style={{
                fontFamily: FMFonts.display,
                fontSize: 18,
                color: t.inkSoft,
                marginLeft: 4,
              }}
            >
              €
            </Text>
          </View>

          <View style={{ marginTop: 10 }}>
            <GrowthChart data={series} width={chartWidth} height={92} masked={masked} />
          </View>

          <View style={styles.legendRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.legendItem}>
                <View style={{ width: 8, height: 1.5, backgroundColor: t.inkMuted }} />
                <Text style={[styles.legendLabel, { color: t.inkMuted }]}>{i18n.total_invested}</Text>
              </View>
              <View style={{ marginTop: 2 }}>
                <Balance value={finalInvested} masked={masked} size={12} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.legendItem}>
                <View style={{ width: 8, height: 1.5, backgroundColor: t.accent }} />
                <Text style={[styles.legendLabel, { color: t.inkMuted }]}>{i18n.total_gain}</Text>
              </View>
              <Text
                style={{
                  fontFamily: FMFonts.sansSemibold,
                  fontSize: 12,
                  color: t.accent,
                  marginTop: 2,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {masked ? "••••" : `+${formatEUR(gain).replace(" €", "")} €`}
              </Text>
            </View>
          </View>
        </View>

        {/* Inputs */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Label style={{ marginBottom: 10 }}>Inputs</Label>
          <InputRow
            label={i18n.initial_inv}
            value={initialInvestment}
            onChange={setInitialInvestment}
            suffix="€"
          />
          <InputRow
            label={i18n.monthly_inv}
            value={monthlyInvestment}
            onChange={setMonthlyInvestment}
            suffix="€/mo"
          />
          <InputRow
            label={i18n.duration}
            value={years}
            onChange={setYears}
            suffix={i18n.years_suffix ?? "yrs"}
          />
          <InputRow
            label={i18n.est_return}
            value={interestRate}
            onChange={setInterestRate}
            suffix="%"
            isLast
          />
        </View>

        {/* Profiles */}
        <Label style={{ marginBottom: 6, paddingHorizontal: 2 }}>
          {i18n.manage_profiles ?? "Profiles"}
        </Label>
        <View style={styles.profilesRow}>
          <Pressable
            onPress={() => {
              setEditingProfileId(null);
              setModalVisible(true);
            }}
            style={({ pressed }) => [
              styles.profileCard,
              {
                backgroundColor: t.surface,
                borderColor: t.lineStrong,
                borderStyle: "dashed",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <IconPlus size={13} color={t.inkSoft} />
            <Text style={{ fontFamily: FMFonts.sansMedium, fontSize: 11, color: t.inkSoft, marginTop: 4 }}>
              {i18n.save}
            </Text>
          </Pressable>
          {profiles.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => applyProfile(p)}
              onLongPress={() => handleProfileLongPress(p)}
              style={({ pressed }) => [
                styles.profileCard,
                {
                  backgroundColor: t.surface,
                  borderColor: t.line,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: p.color }} />
                <Text style={{ fontFamily: FMFonts.sansSemibold, fontSize: 11, color: t.ink }}>
                  {p.name}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: FMFonts.sans,
                  fontSize: 9.5,
                  color: t.inkMuted,
                  marginTop: 3,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {p.returnVal}% · {p.years}y
              </Text>
            </Pressable>
          ))}
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
    </View>
  );
}

interface InputRowProps {
  label: string;
  value: string;
  onChange: (s: string) => void;
  suffix: string;
  isLast?: boolean;
}

function InputRow({ label, value, onChange, suffix, isLast }: InputRowProps) {
  const t = useFMTheme();
  return (
    <View style={[styles.inputRow, !isLast && { borderBottomColor: t.line, borderBottomWidth: 1 }]}>
      <Text style={{ flex: 1, fontFamily: FMFonts.sansMedium, fontSize: 12, color: t.inkSoft }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={{
          fontFamily: FMFonts.sansSemibold,
          fontSize: 13,
          color: t.ink,
          textAlign: "right",
          minWidth: 80,
          fontVariant: ["tabular-nums"],
        }}
      />
      <Text style={{ fontFamily: FMFonts.sans, fontSize: 12, color: t.inkMuted, marginLeft: 6 }}>
        {suffix}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 96 },
  card: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  legendRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendLabel: {
    fontFamily: FMFonts.sansSemibold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  profilesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  profileCard: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    minWidth: 90,
  },
});
