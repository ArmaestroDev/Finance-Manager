import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import type { Transaction } from "../../../services/enableBanking";
import { processStatementWithGemini } from "../services/processStatement";

// ── Types ──

export type QueueItemStatus =
  | "idle"
  | "processing"
  | "waiting"
  | "completed"
  | "failed";

export interface QueueItem {
  /** Unique identifier for the queue item */
  id: string;
  /** Display name of the PDF file */
  fileName: string;
  /** Local URI to the picked file */
  fileUri: string;
  /** MIME type of the file */
  fileMimeType: string;
  /** Web File object for reading base64 (web platform only) */
  fileObject?: File;
  /** Current processing state */
  status: QueueItemStatus;
  /** 0-100 progress indicator */
  progress: number;
  /** Error message if processing failed */
  error?: string;
  /** Timestamp (ms) when the cooldown ends and processing should resume */
  scheduledAt?: number;
  /** Extracted transactions on successful processing */
  resultTransactions?: Transaction[];
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
  | { type: "SKIP_WAIT"; id: string }
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
          item.id === action.id
            ? { ...item, progress: action.progress }
            : item,
        ),
      };

    case "SKIP_WAIT":
      return {
        items: state.items.map((item) =>
          item.id === action.id
            ? { ...item, status: "idle" as const, scheduledAt: undefined }
            : item,
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
                scheduledAt: undefined,
              }
            : item,
        ),
      };

    default:
      return state;
  }
}

// ── Context ──

interface ImportQueueContextValue {
  items: QueueItem[];
  /** Add picked PDF files to the processing queue */
  addFiles: (
    files: Array<{
      uri: string;
      name: string;
      mimeType: string;
      file?: File;
    }>,
  ) => void;
  /** Skip the 30s cooldown for a waiting item */
  skipWait: (id: string) => void;
  /** Remove a completed/failed item from the queue */
  removeItem: (id: string) => void;
  /** Retry a failed item */
  retryItem: (id: string) => void;
  /** Configure the queue processor with account-specific data */
  configure: (config: {
    geminiApiKey: string;
    currentCurrency: string;
    accountId: string;
    accountType: "connected" | "manual";
    handleImportBankStatement: (txs: Transaction[]) => Promise<void>;
  }) => void;
}

const ImportQueueContext = createContext<ImportQueueContextValue | null>(null);

const COOLDOWN_MS = 30_000; // 30 seconds between API calls

/**
 * Provider component that manages the background import queue.
 * Mount this at the root layout so the queue persists across navigation.
 */
export function ImportQueueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(queueReducer, { items: [] });

  // Store the latest state in a ref so the processor loop never has stale data
  const stateRef = useRef(state);
  stateRef.current = state;

  // Configuration ref — set by the active AccountDetailScreen
  const configRef = useRef<{
    geminiApiKey: string;
    currentCurrency: string;
    accountId: string;
    accountType: "connected" | "manual";
    handleImportBankStatement: (txs: Transaction[]) => Promise<void>;
  } | null>(null);

  // Lock to prevent concurrent processing
  const isProcessingRef = useRef(false);

  const configure = useCallback(
    (config: {
      geminiApiKey: string;
      currentCurrency: string;
      accountId: string;
      accountType: "connected" | "manual";
      handleImportBankStatement: (txs: Transaction[]) => Promise<void>;
    }) => {
      configRef.current = config;
    },
    [],
  );

  const addFiles = useCallback(
    (
      files: Array<{
        uri: string;
        name: string;
        mimeType: string;
        file?: File;
      }>,
    ) => {
      const newItems: QueueItem[] = files.map((f) => ({
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        fileName: f.name,
        fileUri: f.uri,
        fileMimeType: f.mimeType,
        fileObject: f.file,
        status: "idle" as const,
        progress: 0,
      }));
      dispatch({ type: "ADD_ITEMS", items: newItems });
    },
    [],
  );

  const skipWait = useCallback((id: string) => {
    dispatch({ type: "SKIP_WAIT", id });
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
      // Don't run if already processing
      if (isProcessingRef.current) return;

      const { items } = stateRef.current;
      const config = configRef.current;

      // Check waiting items whose cooldown has expired → transition to idle
      const now = Date.now();
      for (const item of items) {
        if (
          item.status === "waiting" &&
          item.scheduledAt &&
          now >= item.scheduledAt
        ) {
          dispatch({
            type: "UPDATE_STATUS",
            id: item.id,
            status: "idle",
            updates: { scheduledAt: undefined },
          });
          return; // Let the next tick pick it up as idle
        }
      }

      // Find next idle item
      const nextIdle = items.find((i) => i.status === "idle");
      if (!nextIdle || !config || !config.geminiApiKey) return;

      // Lock processing
      isProcessingRef.current = true;

      try {
        // Mark as processing
        dispatch({
          type: "UPDATE_STATUS",
          id: nextIdle.id,
          status: "processing",
        });
        dispatch({ type: "UPDATE_PROGRESS", id: nextIdle.id, progress: 10 });

        // Call Gemini API
        const transactions = await processStatementWithGemini(
          nextIdle,
          config.geminiApiKey,
          config.currentCurrency,
        );

        dispatch({ type: "UPDATE_PROGRESS", id: nextIdle.id, progress: 80 });

        // Save transactions to account
        if (transactions.length > 0) {
          await config.handleImportBankStatement(transactions);
        }

        dispatch({ type: "UPDATE_PROGRESS", id: nextIdle.id, progress: 100 });
        dispatch({
          type: "UPDATE_STATUS",
          id: nextIdle.id,
          status: "completed",
          updates: { resultTransactions: transactions },
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

        // After processing (success or failure), schedule next item with cooldown
        const currentItems = stateRef.current.items;
        const remainingIdle = currentItems.find(
          (i) => i.id !== nextIdle.id && i.status === "idle",
        );
        if (remainingIdle) {
          dispatch({
            type: "UPDATE_STATUS",
            id: remainingIdle.id,
            status: "waiting",
            updates: { scheduledAt: Date.now() + COOLDOWN_MS },
          });
        }
      }
    };

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []); // Empty deps — all reads go through refs

  const value: ImportQueueContextValue = {
    items: state.items,
    addFiles,
    skipWait,
    removeItem,
    retryItem,
    configure,
  };

  return (
    <ImportQueueContext.Provider value={value}>
      {children}
    </ImportQueueContext.Provider>
  );
}

/**
 * Hook to access the import queue state and actions.
 * Must be used within an ImportQueueProvider.
 */
export function useImportQueue(): ImportQueueContextValue {
  const context = useContext(ImportQueueContext);
  if (!context) {
    throw new Error("useImportQueue must be used within an ImportQueueProvider");
  }
  return context;
}
