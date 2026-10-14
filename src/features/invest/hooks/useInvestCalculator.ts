import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { useSettings } from "../../../shared/context/SettingsContext";
import { showAlert } from "../../../shared/utils/alert";
import { parseLocaleNumber } from "../../../shared/utils/number";

// German input ("7,09", "1.000") used to be read by parseFloat as 7 / 1.
const num = (v: string) => {
  const n = parseLocaleNumber(v);
  return Number.isFinite(n) ? n : NaN;
};

// Invest profiles are a self-contained, invest-only storage domain (no
// provider needed — nothing else reads them).
const PROFILES_KEY = "etf_calc_profiles";
const DEFAULTS = { initial: "1000", monthly: "150", years: "10", rate: "7,09" };

interface Profile {
  id: string;
  name: string;
  color: string;
  initial: string;
  monthly: string;
  years: string;
  returnVal: string;
}

export const PROFILE_COLORS = [
  "#00afdb",
  "#e6b800",
  "#4caf50",
  "#fe3d3d",
  "#9c27b0",
  "#ff9800",
];

export function useInvestCalculator() {
  const { i18n } = useSettings();
  // State for inputs
  const [initialInvestment, setInitialInvestment] = useState(DEFAULTS.initial);
  const [monthlyInvestment, setMonthlyInvestment] = useState(DEFAULTS.monthly);
  const [years, setYears] = useState(DEFAULTS.years);
  const [interestRate, setInterestRate] = useState(DEFAULTS.rate);

  // State for Profiles
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  // Load profiles on mount
  useEffect(() => {
    AsyncStorage.getItem(PROFILES_KEY)
      .then((stored) => {
        if (stored) setProfiles(JSON.parse(stored));
      })
      .catch((e) => console.error("Failed to load profiles", e));
  }, []);

  const saveProfile = async (profileName: string, color: string) => {
    if (!profileName.trim()) {
      showAlert(i18n.error_title, i18n.invest_profile_name_required);
      return;
    }

    let updatedProfiles: Profile[];

    if (editingProfileId) {
      updatedProfiles = profiles.map((p) =>
        p.id === editingProfileId
          ? {
              ...p,
              name: profileName,
              color: color,
              initial: initialInvestment,
              monthly: monthlyInvestment,
              years: years,
              returnVal: interestRate,
            }
          : p,
      );
    } else {
      const newProfile: Profile = {
        id: Date.now().toString(),
        name: profileName,
        color: color,
        initial: initialInvestment,
        monthly: monthlyInvestment,
        years: years,
        returnVal: interestRate,
      };
      updatedProfiles = [...profiles, newProfile];
    }

    setProfiles(updatedProfiles);
    setEditingProfileId(null);
    try {
      await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(updatedProfiles));
    } catch {
      showAlert(i18n.error_title, i18n.invest_profile_save_failed);
    }
  };

  const applyProfile = (profile: Profile) => {
    setInitialInvestment(profile.initial);
    setMonthlyInvestment(profile.monthly);
    setYears(profile.years);
    setInterestRate(profile.returnVal);
  };

  const deleteProfile = async (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
  };

  const calculateData = useMemo(() => {
    const p = num(initialInvestment) || 0;
    const pm = num(monthlyInvestment) || 0;
    const y = num(years) || 1;
    const r = num(interestRate) || 0;

    const monthlyRate = r / 100 / 12;
    // Whole months only (fractional years like 2.5 → 30 months), capped so
    // a typo like "1000" years can't freeze the UI.
    const months = Math.min(Math.round(Math.max(y, 0) * 12), 100 * 12);

    const dataTotalValue = [];
    const dataTotalInvested = [];

    let currentValue = p;
    let currentInvested = p;

    // Add start point (Year 0)
    dataTotalValue.push({
      value: p,
      label: new Date().getFullYear().toString(),
      dataPointText: "",
    });
    dataTotalInvested.push({ value: p, dataPointText: "" });

    for (let i = 1; i <= months; i++) {
      currentValue = (currentValue + pm) * (1 + monthlyRate);
      currentInvested += pm;

      if (i % 12 === 0) {
        const yearIndex = i / 12;
        const yearLabel = (new Date().getFullYear() + yearIndex).toString();
        dataTotalValue.push({
          value: parseFloat(currentValue.toFixed(2)),
          label: yearLabel,
        });
        dataTotalInvested.push({
          value: currentInvested,
        });
      }
    }

    return {
      dataTotalValue,
      dataTotalInvested,
      finalValue: currentValue,
      finalInvested: currentInvested,
    };
  }, [initialInvestment, monthlyInvestment, years, interestRate]);

  const handleReset = () => {
    setInitialInvestment(DEFAULTS.initial);
    setMonthlyInvestment(DEFAULTS.monthly);
    setYears(DEFAULTS.years);
    setInterestRate(DEFAULTS.rate);
  };

  const currentDisplay = {
    value: calculateData.finalValue,
    invested: calculateData.finalInvested,
    gain: calculateData.finalValue - calculateData.finalInvested,
  };

  return {
    // Input state
    initialInvestment,
    setInitialInvestment,
    monthlyInvestment,
    setMonthlyInvestment,
    years,
    setYears,
    interestRate,
    setInterestRate,
    // Profile state
    profiles,
    editingProfileId,
    setEditingProfileId,
    // Computed
    calculateData,
    currentDisplay,
    // Actions
    saveProfile,
    applyProfile,
    deleteProfile,
    handleReset,
  };
}

export type { Profile };
