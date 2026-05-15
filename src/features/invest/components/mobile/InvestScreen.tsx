import React, { useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { FMFonts } from "@/src/constants/theme";
import { MobileShell } from "@/src/shared/components/MobileShell";
import { MobileHeader } from "@/src/shared/components/MobileHeader";
import {
  Chip,
  GrowthChart,
  IconPlus,
  IconRefresh,
  IconSliders,
  Label,
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

  const heroParts = splitForHero(currentDisplay.value, masked);
  const gain = currentDisplay.gain;
  const invested = currentDisplay.invested;

  // Card inner content width: screen − 2*18 shell padding − 2*18 card padding.
  const chartWidth = windowWidth - 18 * 2 - 18 * 2;

  const openEditModal = (profile: Profile) => {
    setEditingProfileId(profile.id);
    applyProfile(profile);
    setModalVisible(true);
  };

  return (
    <MobileShell
      headerOverride={
        <MobileHeader
          title={i18n.invest_title}
          sub="ETF compound-interest simulator · for planning"
          right={
            <>
              <Chip
                onPress={handleReset}
                icon={<IconRefresh size={11} color={t.inkSoft} />}
              >
                {i18n.reset}
              </Chip>
              <Chip
                onPress={() => setManageModalVisible(true)}
                icon={<IconSliders size={11} color={t.inkSoft} />}
              >
                {i18n.manage_profiles}
              </Chip>
            </>
          }
        />
      }
    >
      {/* Result hero */}
      <View
        style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}
      >
        <Label>{`Final value · ${years} years @ ${interestRate}%`}</Label>
        <View style={styles.heroRow}>
          <Text
            style={{
              fontFamily: FMFonts.display,
              fontSize: 44,
              color: t.accent,
              lineHeight: 46,
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
              fontSize: 22,
              color: t.inkSoft,
              marginLeft: 6,
            }}
          >
            €
          </Text>
        </View>

        <View style={styles.breakdownRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.breakdownKey}>
              <View
                style={{ width: 12, height: 1.5, backgroundColor: t.inkMuted }}
              />
              <Label>{i18n.total_invested}</Label>
            </View>
            <Text
              style={{
                fontFamily: FMFonts.sansSemibold,
                fontSize: 16,
                color: t.ink,
                marginTop: 5,
                fontVariant: ["tabular-nums"],
              }}
            >
              {masked
                ? "••••••"
                : `${Math.round(invested).toLocaleString("de-DE")} €`}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.breakdownKey}>
              <View
                style={{ width: 12, height: 1.5, backgroundColor: t.accent }}
              />
              <Label>{i18n.total_gain}</Label>
            </View>
            <Text
              style={{
                fontFamily: FMFonts.sansSemibold,
                fontSize: 16,
                color: t.accent,
                marginTop: 5,
                fontVariant: ["tabular-nums"],
              }}
            >
              {masked
                ? "••••••"
                : `+${Math.round(gain).toLocaleString("de-DE")} €`}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <GrowthChart
            data={series}
            width={chartWidth}
            height={200}
            masked={masked}
          />
        </View>
      </View>

      {/* Inputs */}
      <View
        style={[
          styles.card,
          { backgroundColor: t.surface, borderColor: t.line, marginTop: 12 },
        ]}
      >
        <Label style={{ marginBottom: 16 }}>Inputs</Label>
        <SliderField
          label={i18n.initial_inv}
          hint={i18n.initial_inv_sub}
          value={initialInvestment}
          onChange={setInitialInvestment}
          suffix="€"
          max={50000}
          step={500}
        />
        <SliderField
          label={i18n.monthly_inv}
          hint={i18n.monthly_inv_sub}
          value={monthlyInvestment}
          onChange={setMonthlyInvestment}
          suffix="€/mo"
          max={2000}
          step={25}
        />
        <SliderField
          label={i18n.duration}
          hint={i18n.duration_sub}
          value={years}
          onChange={setYears}
          suffix={(i18n.years_suffix ?? "yrs").trim()}
          max={40}
          step={1}
        />
        <SliderField
          label={i18n.est_return}
          hint={i18n.est_return_sub}
          value={interestRate}
          onChange={setInterestRate}
          suffix="%"
          max={12}
          step={0.1}
          decimals={2}
          isLast
        />
      </View>

      {/* Saved scenarios */}
      <View
        style={[
          styles.card,
          { backgroundColor: t.surface, borderColor: t.line, marginTop: 12 },
        ]}
      >
        <View style={styles.scenariosHeader}>
          <Label>{`Saved scenarios · ${profiles.length}`}</Label>
          <Pressable
            onPress={() => setManageModalVisible(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text
              style={{
                fontFamily: FMFonts.sansMedium,
                fontSize: 11,
                color: t.accent,
              }}
            >
              {i18n.manage_profiles} →
            </Text>
          </Pressable>
        </View>

        {profiles.length === 0 ? (
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 12,
              color: t.inkMuted,
              paddingVertical: 14,
            }}
          >
            No scenarios saved yet. Adjust the inputs and tap Save.
          </Text>
        ) : (
          <View style={{ gap: 8, marginTop: 12 }}>
            {profiles.map((p) => {
              const finalValue = simulateProfileValue(p);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => applyProfile(p)}
                  onLongPress={() => openEditModal(p)}
                  style={({ pressed }) => [
                    styles.scenarioRow,
                    {
                      backgroundColor: t.surfaceAlt,
                      borderColor: t.line,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 10,
                      height: 40,
                      borderRadius: 2,
                      backgroundColor: p.color,
                    }}
                  />
                  <View style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
                    <Text
                      style={{
                        fontFamily: FMFonts.sansSemibold,
                        fontSize: 13,
                        color: t.ink,
                      }}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: FMFonts.sans,
                        fontSize: 10.5,
                        color: t.inkMuted,
                        marginTop: 3,
                        fontVariant: ["tabular-nums"],
                      }}
                      numberOfLines={1}
                    >
                      {fmtShort(parseFloat(p.initial) || 0)} · +
                      {fmtShort(parseFloat(p.monthly) || 0)}/mo · {p.years}y ·{" "}
                      {p.returnVal}%
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", marginLeft: 12 }}>
                    <Text
                      style={{
                        fontFamily: FMFonts.sansSemibold,
                        fontSize: 14,
                        color: t.accent,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {masked ? "••••" : fmtCompact(finalValue)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: FMFonts.sans,
                        fontSize: 9.5,
                        color: t.inkMuted,
                        marginTop: 1,
                      }}
                    >
                      final
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={() => {
            setEditingProfileId(null);
            setModalVisible(true);
          }}
          style={({ pressed }) => [
            styles.saveCurrentBtn,
            {
              backgroundColor: t.ink,
              borderColor: t.ink,
              opacity: pressed ? 0.85 : 1,
              marginTop: profiles.length === 0 ? 12 : 12,
            },
          ]}
        >
          <IconPlus size={12} color={t.bg} />
          <Text
            style={{
              fontFamily: FMFonts.sansMedium,
              fontSize: 13,
              color: t.bg,
              marginLeft: 6,
            }}
          >
            {`${i18n.save} — save current as scenario`}
          </Text>
        </Pressable>
      </View>

      <InvestProfileModal
        visible={modalVisible}
        isEditing={!!editingProfileId}
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
        onCreateNew={() => {
          setEditingProfileId(null);
          setModalVisible(true);
        }}
        onClose={() => setManageModalVisible(false)}
        i18n={i18n}
      />
    </MobileShell>
  );
}

interface SliderFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (s: string) => void;
  suffix: string;
  max: number;
  step: number;
  decimals?: number;
  isLast?: boolean;
}

// Touch slider: a draggable proportional bar plus a tap-to-edit numeric value.
// Mirrors desktop's SliderField (proportional bar + editable numeric) but adds
// a draggable handle so the bar itself is usable on touch.
function SliderField({
  label,
  hint,
  value,
  onChange,
  suffix,
  max,
  step,
  decimals = 0,
  isLast,
}: SliderFieldProps) {
  const t = useFMTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const trackWidth = useRef(0);

  const numeric = parseFloat(value) || 0;
  const pct = Math.min(1, Math.max(0, numeric / max));

  const commitFromX = (x: number) => {
    const w = trackWidth.current;
    if (w <= 0) return;
    const ratio = Math.min(1, Math.max(0, x / w));
    const raw = ratio * max;
    const snapped = Math.round(raw / step) * step;
    const next = decimals > 0 ? snapped.toFixed(decimals) : String(Math.round(snapped));
    onChange(next);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => commitFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => commitFromX(e.nativeEvent.locationX),
    }),
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  const commitEdit = () => {
    setEditing(false);
    onChange(draft.trim() === "" ? "0" : draft);
  };

  return (
    <View style={{ marginBottom: isLast ? 0 : 20 }}>
      <View style={styles.sliderHeader}>
        <Text
          style={{
            fontFamily: FMFonts.sansMedium,
            fontSize: 12,
            color: t.inkSoft,
          }}
        >
          {label}
        </Text>
        <Pressable
          onPress={() => {
            setDraft(value);
            setEditing(true);
          }}
          style={styles.valueBox}
        >
          {editing ? (
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onBlur={commitEdit}
              onSubmitEditing={commitEdit}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              style={{
                fontFamily: FMFonts.sansSemibold,
                fontSize: 15,
                color: t.ink,
                textAlign: "right",
                minWidth: 70,
                padding: 0,
                fontVariant: ["tabular-nums"],
              }}
            />
          ) : (
            <Text
              style={{
                fontFamily: FMFonts.sansSemibold,
                fontSize: 15,
                color: t.ink,
                fontVariant: ["tabular-nums"],
              }}
            >
              {value}
            </Text>
          )}
          <Text
            style={{
              fontFamily: FMFonts.sans,
              fontSize: 12,
              color: t.inkSoft,
              marginLeft: 4,
            }}
          >
            {suffix}
          </Text>
        </Pressable>
      </View>

      <View
        {...pan.panHandlers}
        onLayout={onTrackLayout}
        style={styles.trackHit}
      >
        <View style={[styles.track, { backgroundColor: t.surfaceAlt }]}>
          <View
            style={{
              width: `${pct * 100}%` as `${number}%`,
              height: "100%",
              backgroundColor: t.accent,
              borderRadius: 3,
            }}
          />
        </View>
        <View
          style={[
            styles.handle,
            {
              left: `${pct * 100}%` as `${number}%`,
              backgroundColor: t.accent,
              borderColor: t.surface,
            },
          ]}
        />
      </View>

      {hint ? (
        <Text
          style={{
            fontFamily: FMFonts.sans,
            fontSize: 10.5,
            color: t.inkMuted,
            marginTop: 8,
          }}
        >
          {hint}
        </Text>
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

function fmtShort(value: number): string {
  return `${Math.round(value).toLocaleString("de-DE")} €`;
}

function fmtCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M €`;
  if (abs >= 1_000) return `${Math.round(abs / 1000)}k €`;
  return `${Math.round(abs)} €`;
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderRadius: 12,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
  },
  breakdownRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 14,
  },
  breakdownKey: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scenariosHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scenarioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveCurrentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  valueBox: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  trackHit: {
    height: 24,
    justifyContent: "center",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  handle: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    marginLeft: -9,
  },
});
