import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toApiDate, toUiDate } from "../utils/date";

const DATE_FILTER_KEY = "date_filter_state";

// Merge `patch` into the persisted filter record (best effort).
async function persistFilterState(patch: Record<string, unknown>) {
  try {
    const saved = await AsyncStorage.getItem(DATE_FILTER_KEY);
    const existing = saved ? JSON.parse(saved) : {};
    await AsyncStorage.setItem(DATE_FILTER_KEY, JSON.stringify({ ...existing, ...patch }));
  } catch (e) {
    console.warn("Failed to persist date filter state", e);
  }
}

const isUiDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(v);

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

  // Default range: 1st of this month → today
  const applyDefaultRange = () => {
    const d = new Date();
    d.setDate(1);
    setFilterDateFrom(toUiDate(d));
    setFilterDateTo(toUiDate(new Date()));
  };

  // Load persisted state
  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await AsyncStorage.getItem(DATE_FILTER_KEY);
        const parsed = saved ? JSON.parse(saved) : {};
        const { from, to, catId, stmtId } = parsed || {};
        // The record can exist without a range (a category/statement filter
        // picked before any date change persists only `catId`/`stmtId`).
        // Restoring `undefined` there meant transactions never loaded.
        if (isUiDate(from) && isUiDate(to)) {
          setFilterDateFrom(from);
          setFilterDateTo(to);
        } else {
          applyDefaultRange();
        }
        if (catId) setSelectedCategoryId(catId);
        if (stmtId) setSelectedStatementId(stmtId);
      } catch (e) {
        console.error("Failed to load date filter state", e);
        applyDefaultRange();
      } finally {
        setIsInitialized(true);
      }
    };
    loadState();
  }, []);

  const applyDateFilter = async (fromIn: string, toIn: string) => {
    // Reject malformed input (e.g. dayjs "Invalid Date" from a half-typed
    // field) and normalise a reversed range, which otherwise yields an
    // empty result with no explanation.
    if (!isUiDate(fromIn) || !isUiDate(toIn)) return;
    let from = fromIn;
    let to = toIn;
    if (toApiDate(from) > toApiDate(to)) [from, to] = [to, from];
    setFilterDateFrom(from);
    setFilterDateTo(to);
    setRefreshSignal(prev => prev + 1);
    await persistFilterState({ from, to });
  };

  const handleSetSelectedCategoryId = async (id: string | null) => {
    setSelectedCategoryId(id);
    await persistFilterState({ catId: id });
  };

  const handleSetSelectedStatementId = async (id: string | null) => {
    setSelectedStatementId(id);
    await persistFilterState({ stmtId: id });
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
