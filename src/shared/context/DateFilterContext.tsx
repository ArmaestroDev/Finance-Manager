import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toUiDate } from "../utils/date";

const DATE_FILTER_KEY = "date_filter_state";

interface DateFilterContextType {
  filterDateFrom: string;
  filterDateTo: string;
  refreshSignal: number;
  selectedCategoryId: string | null;
  selectedStatementId: string | null;
  applyDateFilter: (from: string, to: string) => Promise<void>;
  applyPreset: (days: number | "year") => void;
  setSelectedCategoryId: (id: string | null) => void;
  setSelectedStatementId: (id: string | null) => void;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load persisted state
  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await AsyncStorage.getItem(DATE_FILTER_KEY);
        if (saved) {
          const { from, to, catId, stmtId } = JSON.parse(saved);
          setFilterDateFrom(from);
          setFilterDateTo(to);
          if (catId) setSelectedCategoryId(catId);
          if (stmtId) setSelectedStatementId(stmtId);
        } else {
          // Default to 1st of this month → today
          const d = new Date();
          d.setDate(1);
          setFilterDateFrom(toUiDate(d));
          setFilterDateTo(toUiDate(new Date()));
        }
      } catch (e) {
        console.error("Failed to load date filter state", e);
      } finally {
        setIsInitialized(true);
      }
    };
    loadState();
  }, []);

  const applyDateFilter = async (from: string, to: string) => {
    setFilterDateFrom(from);
    setFilterDateTo(to);
    setRefreshSignal(prev => prev + 1);
    try {
      const saved = await AsyncStorage.getItem(DATE_FILTER_KEY);
      const existing = saved ? JSON.parse(saved) : {};
      await AsyncStorage.setItem(DATE_FILTER_KEY, JSON.stringify({ ...existing, from, to }));
    } catch (e) {}
  };

  const handleSetSelectedCategoryId = async (id: string | null) => {
    setSelectedCategoryId(id);
    try {
      const saved = await AsyncStorage.getItem(DATE_FILTER_KEY);
      const existing = saved ? JSON.parse(saved) : {};
      await AsyncStorage.setItem(DATE_FILTER_KEY, JSON.stringify({ ...existing, catId: id }));
    } catch (e) {}
  };

  const handleSetSelectedStatementId = async (id: string | null) => {
    setSelectedStatementId(id);
    try {
      const saved = await AsyncStorage.getItem(DATE_FILTER_KEY);
      const existing = saved ? JSON.parse(saved) : {};
      await AsyncStorage.setItem(DATE_FILTER_KEY, JSON.stringify({ ...existing, stmtId: id }));
    } catch (e) {}
  };

  const applyPreset = (days: number | "year") => {
    const to = new Date();
    const from = new Date();

    if (days === "year") {
      from.setMonth(0, 1); // Jan 1st of current year
    } else {
      from.setDate(from.getDate() - days);
    }

    const fromUi = toUiDate(from);
    const toUi = toUiDate(to);
    applyDateFilter(fromUi, toUi);
  };

  if (!isInitialized) return null;

  return (
    <DateFilterContext.Provider
      value={{
        filterDateFrom,
        filterDateTo,
        refreshSignal,
        selectedCategoryId,
        selectedStatementId,
        applyDateFilter,
        applyPreset,
        setSelectedCategoryId: handleSetSelectedCategoryId,
        setSelectedStatementId: handleSetSelectedStatementId,
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    throw new Error("useDateFilter must be used within a DateFilterProvider");
  }
  return context;
}
