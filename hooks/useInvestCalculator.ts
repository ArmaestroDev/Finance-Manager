import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

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
  // State for inputs
  const [initialInvestment, setInitialInvestment] = useState("1000");
  const [monthlyInvestment, setMonthlyInvestment] = useState("150");
  const [years, setYears] = useState("10");
  const [interestRate, setInterestRate] = useState("7.09");

  // State for Profiles
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const storedProfiles = await AsyncStorage.getItem("etf_calc_profiles");
      if (storedProfiles) {
        setProfiles(JSON.parse(storedProfiles));
      }
    } catch (e) {
      console.error("Failed to load profiles", e);
    }
  };

  const saveProfile = async (profileName: string, color: string) => {
    if (!profileName.trim()) {
      Alert.alert("Error", "Please enter a profile name");
      return;
    }

    let updatedProfiles;

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
      await AsyncStorage.setItem(
        "etf_calc_profiles",
        JSON.stringify(updatedProfiles),
      );
    } catch (e) {
      Alert.alert("Error", "Failed to save profile");
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
    await AsyncStorage.setItem("etf_calc_profiles", JSON.stringify(updated));
  };

  const calculateData = useMemo(() => {
    const p = parseFloat(initialInvestment) || 0;
    const pm = parseFloat(monthlyInvestment) || 0;
    const y = parseFloat(years) || 1;
    const r = parseFloat(interestRate) || 0;

    const monthlyRate = r / 100 / 12;
    const months = y * 12;

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
    setInitialInvestment("1000");
    setMonthlyInvestment("150");
    setYears("10");
    setInterestRate("7.09");
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
