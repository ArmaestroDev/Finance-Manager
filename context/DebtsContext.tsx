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

export type DebtType = "I_OWE" | "OWES_ME";

export interface DebtEntity {
  id: string;
  name: string;
  type: "person" | "institution";
  // Optimistic UI might benefit from a cached balance, but let's compute it for now
}

export interface DebtItem {
  id: string;
  entityId: string;
  amount: number;
  currency: string;
  description: string;
  date: string; // ISO 8601 YYYY-MM-DD
  type: DebtType;
}

interface DebtsContextType {
  entities: DebtEntity[];
  debts: DebtItem[];
  isLoading: boolean;
  addEntity: (name: string, type: "person" | "institution") => Promise<string>;
  updateEntity: (id: string, name: string) => Promise<void>;
  deleteEntity: (id: string) => Promise<void>;
  addDebt: (
    entityId: string,
    amount: number,
    description: string,
    type: DebtType,
    date: string,
  ) => Promise<string>;
  updateDebt: (
    id: string,
    updates: Partial<Omit<DebtItem, "id" | "entityId">>,
  ) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  getNetBalance: (entityId: string) => number;
}

const DebtsContext = createContext<DebtsContextType | undefined>(undefined);

const ENTITIES_KEY = "debt_entities";
const DEBTS_KEY = "debt_items";

export function DebtsProvider({ children }: { children: ReactNode }) {
  const [entities, setEntities] = useState<DebtEntity[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entData, debtData] = await Promise.all([
        AsyncStorage.getItem(ENTITIES_KEY),
        AsyncStorage.getItem(DEBTS_KEY),
      ]);
      if (entData) setEntities(JSON.parse(entData));
      if (debtData) setDebts(JSON.parse(debtData));
    } catch (e) {
      console.error("Failed to load debts data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const persistEntities = async (data: DebtEntity[]) => {
    try {
      await AsyncStorage.setItem(ENTITIES_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to persist entities", e);
    }
  };

  const persistDebts = async (data: DebtItem[]) => {
    try {
      await AsyncStorage.setItem(DEBTS_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to persist debts", e);
    }
  };

  const addEntity = useCallback(
    async (name: string, type: "person" | "institution") => {
      const id = `entity_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newEntity: DebtEntity = { id, name, type };
      const updated = [...entities, newEntity];
      setEntities(updated);
      await persistEntities(updated);
      return id;
    },
    [entities],
  );

  const updateEntity = useCallback(
    async (id: string, name: string) => {
      const updated = entities.map((e) => (e.id === id ? { ...e, name } : e));
      setEntities(updated);
      await persistEntities(updated);
    },
    [entities],
  );

  const deleteEntity = useCallback(
    async (id: string) => {
      // Optimistic updatre
      const updatedEntities = entities.filter((e) => e.id !== id);
      setEntities(updatedEntities);

      // Cascade delete debts for this entity
      const updatedDebts = debts.filter((d) => d.entityId !== id);
      setDebts(updatedDebts);

      // Async persist
      await Promise.all([
        persistEntities(updatedEntities),
        persistDebts(updatedDebts),
      ]);
    },
    [entities, debts],
  );

  const addDebt = useCallback(
    async (
      entityId: string,
      amount: number,
      description: string,
      type: DebtType,
      date: string,
    ) => {
      const id = `debt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newDebt: DebtItem = {
        id,
        entityId,
        amount,
        currency: "EUR", // Default for now, could be dynamic later
        description,
        type,
        date,
      };
      // Add to beginning of list
      const updated = [newDebt, ...debts];
      setDebts(updated);
      await persistDebts(updated);
      return id;
    },
    [debts],
  );

  const updateDebt = useCallback(
    async (id: string, updates: Partial<Omit<DebtItem, "id" | "entityId">>) => {
      const updated = debts.map((d) =>
        d.id === id ? { ...d, ...updates } : d,
      );
      setDebts(updated);
      await persistDebts(updated);
    },
    [debts],
  );

  const deleteDebt = useCallback(
    async (id: string) => {
      const updated = debts.filter((d) => d.id !== id);
      setDebts(updated);
      await persistDebts(updated);
    },
    [debts],
  );

  const getNetBalance = useCallback(
    (entityId: string) => {
      // Calculate net balance for an entity
      // Positive: They owe me
      // Negative: I owe them
      const entityDebts = debts.filter((d) => d.entityId === entityId);
      return entityDebts.reduce((acc, debt) => {
        if (debt.type === "OWES_ME") {
          return acc + debt.amount;
        } else {
          // I_OWE
          return acc - debt.amount;
        }
      }, 0);
    },
    [debts],
  );

  return (
    <DebtsContext.Provider
      value={{
        entities,
        debts,
        isLoading,
        addEntity,
        updateEntity,
        deleteEntity,
        addDebt,
        updateDebt,
        deleteDebt,
        getNetBalance,
      }}
    >
      {children}
    </DebtsContext.Provider>
  );
}

export function useDebts() {
  const context = useContext(DebtsContext);
  if (!context) {
    throw new Error("useDebts must be used within a DebtsProvider");
  }
  return context;
}
