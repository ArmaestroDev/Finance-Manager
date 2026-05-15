import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, Platform } from "react-native";
import { useSettings } from "@/src/shared/context/SettingsContext";

// --- Types ---
export interface TransactionCategory {
  id: string;
  name: string;
  color: string;
  system?: "ignore";
}

// A single named line of an expected monthly spend, e.g. { label: "Fuel",
// amount: 60 }. Amounts are positive EUR/month; a category's total monthly
// estimate is the sum of its line items.
export interface BudgetLineItem {
  id: string;
  label: string;
  amount: number;
  /** "ai" marks an auto-detected suggestion the user hasn't confirmed yet. */
  source?: "ai";
}

// Map of transactionId -> categoryId
type TransactionCategoryMap = Record<string, string>;

// Map of categoryId -> its budget line items
type CategoryBudgetMap = Record<string, BudgetLineItem[]>;

// --- Storage Keys ---
const CATEGORIES_KEY = "tx_categories";
const TX_CATEGORY_MAP_KEY = "tx_category_map";
const CATEGORY_BUDGETS_KEY = "tx_category_budgets";

// --- System category IDs ---
export const SYSTEM_IGNORE_ID = "cat_system_ignore";
export const SYSTEM_IGNORE_COLOR = "#8a847a";

// --- Default color palette ---
export const CATEGORY_COLORS = [
  "#FF6B6B", // Red
  "#FF8E53", // Orange
  "#FFC93C", // Yellow
  "#4ECB71", // Green
  "#2ECC71", // Emerald
  "#00B894", // Mint
  "#0984E3", // Blue
  "#6C5CE7", // Purple
  "#A29BFE", // Lavender
  "#FD79A8", // Pink
  "#636E72", // Gray
  "#00CEC9", // Teal
];

// --- Context Type ---
interface CategoriesContextType {
  categories: TransactionCategory[];
  transactionCategoryMap: TransactionCategoryMap;
  categoryBudgets: CategoryBudgetMap;
  setCategoryBudget: (
    categoryId: string,
    items: BudgetLineItem[],
  ) => Promise<void>;
  getCategoryEstimate: (categoryId: string) => number;
  addCategory: (name: string, color: string) => Promise<string>;
  updateCategory: (
    id: string,
    updates: { name?: string; color?: string },
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  assignCategory: (
    transactionId: string,
    categoryId: string | null,
  ) => Promise<void>;
  getCategoryForTransaction: (
    transactionId: string,
  ) => TransactionCategory | null;
  bulkAssignCategories: (
    assignments: Record<string, string | null>,
  ) => Promise<void>;
  bulkAddCategories: (
    newCategories: { name: string; color: string }[],
  ) => Promise<TransactionCategory[]>;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(
  undefined,
);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { i18n } = useSettings();
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [transactionCategoryMap, setTransactionCategoryMap] =
    useState<TransactionCategoryMap>({});
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgetMap>({});
  const bootstrappedRef = useRef(false);

  // Refs mirror state so async callers always read the latest value, even when
  // multiple awaited mutations run before React commits a re-render.
  const categoriesRef = useRef<TransactionCategory[]>([]);
  const mapRef = useRef<TransactionCategoryMap>({});
  const budgetsRef = useRef<CategoryBudgetMap>({});

  const commitCategories = (next: TransactionCategory[]) => {
    categoriesRef.current = next;
    setCategories(next);
  };

  const commitMap = (next: TransactionCategoryMap) => {
    mapRef.current = next;
    setTransactionCategoryMap(next);
  };

  const commitBudgets = (next: CategoryBudgetMap) => {
    budgetsRef.current = next;
    setCategoryBudgets(next);
  };

  // Load from AsyncStorage on mount (one-time bootstrap)
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const [catData, mapData, budgetData] = await Promise.all([
        AsyncStorage.getItem(CATEGORIES_KEY),
        AsyncStorage.getItem(TX_CATEGORY_MAP_KEY),
        AsyncStorage.getItem(CATEGORY_BUDGETS_KEY),
      ]);

      let cats: TransactionCategory[] = catData ? JSON.parse(catData) : [];
      let mutated = false;
      const ignoreIdx = cats.findIndex((c) => c.id === SYSTEM_IGNORE_ID);
      const ignoreName = i18n.cat_ignore ?? "Ignore";

      if (ignoreIdx === -1) {
        cats = [
          {
            id: SYSTEM_IGNORE_ID,
            name: ignoreName,
            color: SYSTEM_IGNORE_COLOR,
            system: "ignore",
          },
          ...cats,
        ];
        mutated = true;
      } else if (cats[ignoreIdx].system !== "ignore") {
        cats = cats.map((c, i) =>
          i === ignoreIdx ? { ...c, system: "ignore" as const } : c,
        );
        mutated = true;
      }

      commitCategories(cats);
      if (mutated) await persistCategories(cats);
      if (mapData) commitMap(JSON.parse(mapData));
      if (budgetData) commitBudgets(JSON.parse(budgetData));
    } catch (e) {
      console.error("Failed to load categories:", e);
    }
  };

  const persistCategories = async (cats: TransactionCategory[]) => {
    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
  };

  const persistMap = async (map: TransactionCategoryMap) => {
    await AsyncStorage.setItem(TX_CATEGORY_MAP_KEY, JSON.stringify(map));
  };

  const persistBudgets = async (budgets: CategoryBudgetMap) => {
    await AsyncStorage.setItem(CATEGORY_BUDGETS_KEY, JSON.stringify(budgets));
  };

  const addCategory = useCallback(async (name: string, color: string) => {
    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const next = [...categoriesRef.current, { id, name, color }];
    commitCategories(next);
    await persistCategories(next);
    return id;
  }, []);

  const bulkAddCategories = useCallback(
    async (newCatsInput: { name: string; color: string }[]) => {
      const newCats: TransactionCategory[] = newCatsInput.map((Input) => ({
        id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${Math.random()
          .toString(36)
          .slice(2, 4)}`,
        name: Input.name,
        color: Input.color,
      }));

      const next = [...categoriesRef.current, ...newCats];
      commitCategories(next);
      await persistCategories(next);
      return newCats;
    },
    [],
  );

  const updateCategory = useCallback(
    async (id: string, updates: { name?: string; color?: string }) => {
      const next = categoriesRef.current.map((cat) =>
        cat.id === id
          ? {
              ...cat,
              ...(updates.name !== undefined && { name: updates.name }),
              ...(updates.color !== undefined && { color: updates.color }),
            }
          : cat,
      );
      commitCategories(next);
      await persistCategories(next);
    },
    [],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const target = categoriesRef.current.find((c) => c.id === id);
      if (target?.system === "ignore") {
        const msg =
          i18n.system_category_delete_blocked ??
          "System category — cannot be deleted.";
        if (Platform.OS === "web") {
          if (typeof window !== "undefined") window.alert(msg);
        } else {
          Alert.alert("Cannot delete", msg);
        }
        return;
      }

      const nextCats = categoriesRef.current.filter((cat) => cat.id !== id);
      commitCategories(nextCats);
      await persistCategories(nextCats);

      const updatedMap = { ...mapRef.current };
      let changed = false;
      for (const txId of Object.keys(updatedMap)) {
        if (updatedMap[txId] === id) {
          delete updatedMap[txId];
          changed = true;
        }
      }
      if (changed) {
        commitMap(updatedMap);
        await persistMap(updatedMap);
      }

      // Drop any budget attached to the removed category so it can't orphan.
      if (budgetsRef.current[id] !== undefined) {
        const nextBudgets = { ...budgetsRef.current };
        delete nextBudgets[id];
        commitBudgets(nextBudgets);
        await persistBudgets(nextBudgets);
      }
    },
    [i18n.system_category_delete_blocked],
  );

  const assignCategory = useCallback(
    async (transactionId: string, categoryId: string | null) => {
      const updatedMap = { ...mapRef.current };
      if (categoryId === null) {
        if (updatedMap[transactionId] === undefined) return;
        delete updatedMap[transactionId];
      } else {
        if (updatedMap[transactionId] === categoryId) return;
        updatedMap[transactionId] = categoryId;
      }
      commitMap(updatedMap);
      await persistMap(updatedMap);
    },
    [],
  );

  const bulkAssignCategories = useCallback(
    async (assignments: Record<string, string | null>) => {
      const updatedMap = { ...mapRef.current };
      let changed = false;
      for (const [txId, catId] of Object.entries(assignments)) {
        if (catId === null) {
          if (updatedMap[txId] !== undefined) {
            delete updatedMap[txId];
            changed = true;
          }
        } else if (updatedMap[txId] !== catId) {
          updatedMap[txId] = catId;
          changed = true;
        }
      }
      if (!changed) return;
      commitMap(updatedMap);
      await persistMap(updatedMap);
    },
    [],
  );

  // Replace a category's budget with the given line items (empty array clears
  // it). Items are stored verbatim — callers normalize labels/amounts.
  const setCategoryBudget = useCallback(
    async (categoryId: string, items: BudgetLineItem[]) => {
      const next = { ...budgetsRef.current };
      const cleaned = items.filter(
        (it) => it.label.trim().length > 0 || it.amount !== 0,
      );
      if (cleaned.length === 0) {
        if (next[categoryId] === undefined) return;
        delete next[categoryId];
      } else {
        next[categoryId] = cleaned;
      }
      commitBudgets(next);
      await persistBudgets(next);
    },
    [],
  );

  // Sum of a category's line items (0 when none). Reads state so consumers
  // re-render when budgets change.
  const getCategoryEstimate = useCallback(
    (categoryId: string): number => {
      const items = categoryBudgets[categoryId];
      if (!items || items.length === 0) return 0;
      return items.reduce(
        (s, it) => s + (Number.isFinite(it.amount) ? it.amount : 0),
        0,
      );
    },
    [categoryBudgets],
  );

  const getCategoryForTransaction = useCallback(
    (transactionId: string): TransactionCategory | null => {
      const catId = transactionCategoryMap[transactionId];
      if (!catId) return null;
      return categories.find((c) => c.id === catId) || null;
    },
    [categories, transactionCategoryMap],
  );

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        transactionCategoryMap,
        categoryBudgets,
        setCategoryBudget,
        getCategoryEstimate,
        addCategory,
        bulkAddCategories,
        updateCategory,
        deleteCategory,
        assignCategory,
        bulkAssignCategories,
        getCategoryForTransaction,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error("useCategories must be used within a CategoriesProvider");
  }
  return context;
}
