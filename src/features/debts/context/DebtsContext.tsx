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
import { useReadyGate } from "../../../shared/hooks/useReadyGate";
import { roundCents } from "../../../shared/utils/number";

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
  const gate = useReadyGate();

  // Refs mirror state so back-to-back mutations (e.g. add two debts in one
  // handler, or add right after delete) build on the latest list instead of
  // a stale render closure that silently drops the earlier change.
  const entitiesRef = useRef<DebtEntity[]>([]);
  const debtsRef = useRef<DebtItem[]>([]);

  const commitEntities = (next: DebtEntity[]) => {
    entitiesRef.current = next;
    setEntities(next);
  };
  const commitDebts = (next: DebtItem[]) => {
    debtsRef.current = next;
    setDebts(next);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const [entData, debtData] = await Promise.all([
        AsyncStorage.getItem(ENTITIES_KEY),
        AsyncStorage.getItem(DEBTS_KEY),
      ]);
      if (entData) commitEntities(JSON.parse(entData));
      if (debtData) commitDebts(JSON.parse(debtData));
    } catch (e) {
      console.error("Failed to load debts data:", e);
    } finally {
      setIsLoading(false);
      gate.open();
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
      await gate.wait();
      const id = `entity_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newEntity: DebtEntity = { id, name, type };
      const updated = [...entitiesRef.current, newEntity];
      commitEntities(updated);
      await persistEntities(updated);
      return id;
    },
    [gate],
  );

  const updateEntity = useCallback(
    async (id: string, name: string) => {
      await gate.wait();
      const updated = entitiesRef.current.map((e) =>
        e.id === id ? { ...e, name } : e,
      );
      commitEntities(updated);
      await persistEntities(updated);
    },
    [gate],
  );

  const deleteEntity = useCallback(
    async (id: string) => {
      await gate.wait();
      const updatedEntities = entitiesRef.current.filter((e) => e.id !== id);
      commitEntities(updatedEntities);

      // Cascade delete debts for this entity
      const updatedDebts = debtsRef.current.filter((d) => d.entityId !== id);
      commitDebts(updatedDebts);

      await Promise.all([
        persistEntities(updatedEntities),
        persistDebts(updatedDebts),
      ]);
    },
    [gate],
  );

  const addDebt = useCallback(
    async (
      entityId: string,
      amount: number,
      description: string,
      type: DebtType,
      date: string,
    ) => {
      await gate.wait();
      const id = `debt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newDebt: DebtItem = {
        id,
        entityId,
        amount: roundCents(Math.abs(amount)),
        currency: "EUR", // Default for now, could be dynamic later
        description,
        type,
        date,
      };
      // Add to beginning of list
      const updated = [newDebt, ...debtsRef.current];
      commitDebts(updated);
      await persistDebts(updated);
      return id;
    },
    [gate],
  );

  const updateDebt = useCallback(
    async (id: string, updates: Partial<Omit<DebtItem, "id" | "entityId">>) => {
      await gate.wait();
      const normalized =
        updates.amount !== undefined
          ? { ...updates, amount: roundCents(Math.abs(updates.amount)) }
          : updates;
      const updated = debtsRef.current.map((d) =>
        d.id === id ? { ...d, ...normalized } : d,
      );
      commitDebts(updated);
      await persistDebts(updated);
    },
    [gate],
  );

  const deleteDebt = useCallback(
    async (id: string) => {
      await gate.wait();
      const updated = debtsRef.current.filter((d) => d.id !== id);
      commitDebts(updated);
      await persistDebts(updated);
    },
    [gate],
  );

  const getNetBalance = useCallback(
    (entityId: string) => {
      // Positive: They owe me. Negative: I owe them.
      // Rounded to cents — float sums like 10.1 − 5.05 − 5.05 left a tiny
      // non-zero residue, so a fully repaid person never showed as settled.
      const entityDebts = debts.filter((d) => d.entityId === entityId);
      const net = entityDebts.reduce((acc, debt) => {
        const amt = Number(debt.amount) || 0;
        return debt.type === "OWES_ME" ? acc + amt : acc - amt;
      }, 0);
      return roundCents(net);
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
