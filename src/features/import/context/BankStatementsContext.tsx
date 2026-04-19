import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "bank_statements";
const PDF_STORAGE_PREFIX = "statement_pdf_";

export interface BankStatement {
  id: string;
  accountId: string;
  fileName: string;
  uploadedAt: string;
  bank: string;
  period: string | null;
  iban: string | null;
  importedTxIds: string[];
  skippedCount: number;
  parseWarning: string | null;
  hasPdf?: boolean;
  mimeType?: string;
}

interface BankStatementsContextValue {
  statements: BankStatement[];
  getStatementsForAccount: (accountId: string) => BankStatement[];
  addStatement: (s: BankStatement) => Promise<void>;
  deleteStatement: (id: string) => Promise<void>;
  savePdfData: (statementId: string, base64: string) => Promise<boolean>;
  getPdfData: (statementId: string) => Promise<string | null>;
}

const BankStatementsContext = createContext<BankStatementsContextValue | null>(
  null,
);

export function BankStatementsProvider({ children }: { children: ReactNode }) {
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setStatements(JSON.parse(raw));
      } catch (e) {
        console.error("Failed to load bank statements:", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: BankStatement[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addStatement = useCallback(
    async (s: BankStatement) => {
      setStatements((prev) => {
        const next = [s, ...prev];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const deleteStatement = useCallback(
    async (id: string) => {
      setStatements((prev) => {
        const next = prev.filter((s) => s.id !== id);
        persist(next);
        return next;
      });
      try {
        await AsyncStorage.removeItem(`${PDF_STORAGE_PREFIX}${id}`);
      } catch (e) {
        console.warn("Failed to delete stored PDF:", e);
      }
    },
    [persist],
  );

  const savePdfData = useCallback(
    async (statementId: string, base64: string) => {
      try {
        await AsyncStorage.setItem(
          `${PDF_STORAGE_PREFIX}${statementId}`,
          base64,
        );
        return true;
      } catch (e) {
        console.warn("Failed to save PDF data:", e);
        return false;
      }
    },
    [],
  );

  const getPdfData = useCallback(async (statementId: string) => {
    try {
      return await AsyncStorage.getItem(`${PDF_STORAGE_PREFIX}${statementId}`);
    } catch (e) {
      console.warn("Failed to read PDF data:", e);
      return null;
    }
  }, []);

  const getStatementsForAccount = useCallback(
    (accountId: string) =>
      statements.filter((s) => s.accountId === accountId),
    [statements],
  );

  const value = useMemo<BankStatementsContextValue>(
    () => ({
      statements,
      getStatementsForAccount,
      addStatement,
      deleteStatement,
      savePdfData,
      getPdfData,
    }),
    [
      statements,
      getStatementsForAccount,
      addStatement,
      deleteStatement,
      savePdfData,
      getPdfData,
    ],
  );

  if (!loaded) return null;

  return (
    <BankStatementsContext.Provider value={value}>
      {children}
    </BankStatementsContext.Provider>
  );
}

export function useBankStatements(): BankStatementsContextValue {
  const ctx = useContext(BankStatementsContext);
  if (!ctx) {
    throw new Error(
      "useBankStatements must be used within a BankStatementsProvider",
    );
  }
  return ctx;
}
