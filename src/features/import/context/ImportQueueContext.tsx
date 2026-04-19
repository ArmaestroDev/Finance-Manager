import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { useTransactionsContext } from "../../transactions/context/TransactionsContext";
import { parseStatementWithBackend } from "../services/processStatement";
import { useBankStatements } from "./BankStatementsContext";

// ── Types ──

export type QueueItemStatus =
  | "idle"
  | "processing"
  | "completed"
  | "failed";

export interface QueueItem {
  id: string;
  fileName: string;
  fileUri: string;
  fileMimeType: string;
  fileObject?: File;
  status: QueueItemStatus;
  progress: number;
  error?: string;
  // Per-item context — set when enqueueing so the processor doesn't depend on
  // which screen the user is currently viewing.
  accountId: string;
  accountType: "connected" | "manual";
  currency: string;
  // Populated on success
  importedCount?: number;
  skippedCount?: number;
}

// ── Reducer ──

type QueueAction =
  | { type: "ADD_ITEMS"; items: QueueItem[] }
  | {
      type: "UPDATE_STATUS";
      id: string;
      status: QueueItemStatus;
      updates?: Partial<QueueItem>;
    }
  | { type: "UPDATE_PROGRESS"; id: string; progress: number }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "RETRY_ITEM"; id: string };

interface QueueState {
  items: QueueItem[];
}

function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case "ADD_ITEMS":
      return { items: [...state.items, ...action.items] };

    case "UPDATE_STATUS":
      return {
        items: state.items.map((item) =>
          item.id === action.id
            ? { ...item, status: action.status, ...(action.updates ?? {}) }
            : item,
        ),
      };

    case "UPDATE_PROGRESS":
      return {
        items: state.items.map((item) =>
          item.id === action.id ? { ...item, progress: action.progress } : item,
        ),
      };

    case "REMOVE_ITEM":
      return { items: state.items.filter((item) => item.id !== action.id) };

    case "RETRY_ITEM":
      return {
        items: state.items.map((item) =>
          item.id === action.id
            ? {
                ...item,
                status: "idle" as const,
                progress: 0,
                error: undefined,
              }
            : item,
        ),
      };

    default:
      return state;
  }
}

// ── Context ──

export interface EnqueueFile {
  uri: string;
  name: string;
  mimeType: string;
  file?: File;
  accountId: string;
  accountType: "connected" | "manual";
  currency: string;
}

interface ImportQueueContextValue {
  items: QueueItem[];
  addFiles: (files: EnqueueFile[]) => void;
  removeItem: (id: string) => void;
  retryItem: (id: string) => void;
}

const ImportQueueContext = createContext<ImportQueueContextValue | null>(null);

/**
 * Provider for the background PDF-import queue.
 *
 * The processor runs sequentially (one statement at a time) but has no
 * artificial cooldown: parsing is local-CPU via the Node backend, so back-to-
 * back imports finish in under a second each.
 */
export function ImportQueueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(queueReducer, { items: [] });

  const stateRef = useRef(state);
  stateRef.current = state;

  const isProcessingRef = useRef(false);

  const txCtx = useTransactionsContext();
  const bsCtx = useBankStatements();
  const txRef = useRef(txCtx);
  txRef.current = txCtx;
  const bsRef = useRef(bsCtx);
  bsRef.current = bsCtx;

  const addFiles = useCallback((files: EnqueueFile[]) => {
    const newItems: QueueItem[] = files.map((f) => ({
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fileName: f.name,
      fileUri: f.uri,
      fileMimeType: f.mimeType,
      fileObject: f.file,
      status: "idle" as const,
      progress: 0,
      accountId: f.accountId,
      accountType: f.accountType,
      currency: f.currency,
    }));
    dispatch({ type: "ADD_ITEMS", items: newItems });
  }, []);

  const removeItem = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ITEM", id });
  }, []);

  const retryItem = useCallback((id: string) => {
    dispatch({ type: "RETRY_ITEM", id });
  }, []);

  // ── Background Processor Loop ──
  useEffect(() => {
    const tick = async () => {
      if (isProcessingRef.current) return;

      const { items } = stateRef.current;
      const nextIdle = items.find((i) => i.status === "idle");
      if (!nextIdle) return;

      isProcessingRef.current = true;

      const statementId = `stmt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      try {
        dispatch({
          type: "UPDATE_STATUS",
          id: nextIdle.id,
          status: "processing",
        });
        dispatch({ type: "UPDATE_PROGRESS", id: nextIdle.id, progress: 10 });

        const parseResult = await parseStatementWithBackend(
          nextIdle,
          statementId,
          nextIdle.currency,
        );

        dispatch({ type: "UPDATE_PROGRESS", id: nextIdle.id, progress: 70 });

        const importResult = await txRef.current.importBankStatement(
          nextIdle.accountId,
          parseResult.transactions,
          nextIdle.accountType === "manual",
          statementId,
        );

        const savedPdf = await bsRef.current.savePdfData(
          statementId,
          parseResult.pdfBase64,
        );

        await bsRef.current.addStatement({
          id: statementId,
          accountId: nextIdle.accountId,
          fileName: nextIdle.fileName,
          uploadedAt: new Date().toISOString(),
          bank: parseResult.bank,
          period: parseResult.period,
          iban: parseResult.iban,
          importedTxIds: importResult.importedTxIds,
          skippedCount: importResult.skippedCount,
          parseWarning: parseResult.parseWarning,
          hasPdf: savedPdf,
          mimeType: "application/pdf",
        });

        dispatch({ type: "UPDATE_PROGRESS", id: nextIdle.id, progress: 100 });
        dispatch({
          type: "UPDATE_STATUS",
          id: nextIdle.id,
          status: "completed",
          updates: {
            importedCount: importResult.importedTxIds.length,
            skippedCount: importResult.skippedCount,
          },
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        dispatch({
          type: "UPDATE_STATUS",
          id: nextIdle.id,
          status: "failed",
          updates: { error: errorMessage },
        });
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Fast tick since local parse is quick; one statement at a time via the
    // isProcessingRef guard.
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, []);

  const value: ImportQueueContextValue = {
    items: state.items,
    addFiles,
    removeItem,
    retryItem,
  };

  return (
    <ImportQueueContext.Provider value={value}>
      {children}
    </ImportQueueContext.Provider>
  );
}

export function useImportQueue(): ImportQueueContextValue {
  const context = useContext(ImportQueueContext);
  if (!context) {
    throw new Error(
      "useImportQueue must be used within an ImportQueueProvider",
    );
  }
  return context;
}
