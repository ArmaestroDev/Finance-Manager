import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// --- Types ---
export interface TransactionCategory {
  id: string;
  name: string;
  color: string;
}

// Map of transactionId -> categoryId
type TransactionCategoryMap = Record<string, string>;

// --- Storage Keys ---
const CATEGORIES_KEY = "tx_categories";
const TX_CATEGORY_MAP_KEY = "tx_category_map";

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
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [transactionCategoryMap, setTransactionCategoryMap] =
    useState<TransactionCategoryMap>({});

  // Load from AsyncStorage on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [catData, mapData] = await Promise.all([
        AsyncStorage.getItem(CATEGORIES_KEY),
        AsyncStorage.getItem(TX_CATEGORY_MAP_KEY),
      ]);
      if (catData) setCategories(JSON.parse(catData));
      if (mapData) setTransactionCategoryMap(JSON.parse(mapData));
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

  const addCategory = useCallback(
    async (name: string, color: string) => {
      const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newCat: TransactionCategory = {
        id,
        name,
        color,
      };
      const updated = [...categories, newCat];
      setCategories(updated);
      await persistCategories(updated);
      return id;
    },
    [categories],
  );

  const bulkAddCategories = useCallback(
    async (newCatsInput: { name: string; color: string }[]) => {
      const newCats: TransactionCategory[] = newCatsInput.map((Input) => ({
        id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${Math.random()
          .toString(36)
          .slice(2, 4)}`, // Extra random to ensure uniqueness in fast loop
        name: Input.name,
        color: Input.color,
      }));

      // Calculate updated state based on CURRENT categories (from dependency)
      // Note: This still relies on 'categories' dependency, so this function MUST be called once per batch
      // to avoid stale state if called multiple times in parallel.
      // But since we are doing "bulk", we call it once.
      const updated = [...categories, ...newCats];
      setCategories(updated);
      await persistCategories(updated);
      return newCats;
    },
    [categories],
  );

  const updateCategory = useCallback(
    async (id: string, updates: { name?: string; color?: string }) => {
      const updated = categories.map((cat) =>
        cat.id === id
          ? {
              ...cat,
              ...(updates.name !== undefined && { name: updates.name }),
              ...(updates.color !== undefined && { color: updates.color }),
            }
          : cat,
      );
      setCategories(updated);
      await persistCategories(updated);
    },
    [categories],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      // Remove category
      const updatedCats = categories.filter((cat) => cat.id !== id);
      setCategories(updatedCats);
      await persistCategories(updatedCats);

      // Remove all assignments to this category
      const updatedMap = { ...transactionCategoryMap };
      let changed = false;
      for (const txId of Object.keys(updatedMap)) {
        if (updatedMap[txId] === id) {
          delete updatedMap[txId];
          changed = true;
        }
      }
      if (changed) {
        setTransactionCategoryMap(updatedMap);
        await persistMap(updatedMap);
      }
    },
    [categories, transactionCategoryMap],
  );

  const assignCategory = useCallback(
    async (transactionId: string, categoryId: string | null) => {
      const updatedMap = { ...transactionCategoryMap };
      if (categoryId === null) {
        delete updatedMap[transactionId];
      } else {
        updatedMap[transactionId] = categoryId;
      }
      setTransactionCategoryMap(updatedMap);
      await persistMap(updatedMap);
    },
    [transactionCategoryMap],
  );

  const bulkAssignCategories = useCallback(
    async (assignments: Record<string, string | null>) => {
      // Create a single updated map based on CURRENT state
      const updatedMap = { ...transactionCategoryMap };
      let changed = false;

      Object.entries(assignments).forEach(([txId, catId]) => {
        if (catId === null) {
          if (updatedMap[txId]) {
            delete updatedMap[txId];
            changed = true;
          }
        } else {
          if (updatedMap[txId] !== catId) {
            updatedMap[txId] = catId;
            changed = true;
          }
        }
      });

      if (changed) {
        setTransactionCategoryMap(updatedMap);
        await persistMap(updatedMap);
      }
    },
    [transactionCategoryMap],
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
