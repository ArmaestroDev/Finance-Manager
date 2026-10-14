import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useReadyGate } from "../../../shared/hooks/useReadyGate";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Transaction } from "../../../services/enableBanking";
import { getStableTxId, getTransactionAmount } from "../utils/transactions";
import {
  buildLinkIndex,
  displayAmountFor,
  statAmountFor,
  type LinkIndex,
  type LinkSummary,
} from "../utils/links";
import { useTransactionsContext, type TxIdChange } from "./TransactionsContext";
import { useCategories } from "./CategoriesContext";

const LINKS_STORAGE_KEY = "transaction_links";
const AUTO_CREATED_KEY = "auto_created_links";

interface TransactionLinksContextType {
  links: Record<string, string[]>;
  linkTransaction: (childTxId: string, parentTxId: string) => Promise<void>;
  unlinkTransaction: (childTxId: string, parentTxId: string) => Promise<void>;
  getLinkedChildren: (parentTxId: string) => string[];
  getParentForChild: (childTxId: string) => string | null;
  /**
   * Reimbursed total of an expense. Resolved against every stored
   * transaction (all accounts, any date); the second argument is ignored and
   * only kept for older call sites.
   */
  getLinkedTotal: (parentTxId: string, allTransactions?: Transaction[]) => number;
  getNetExpense: (parentTx: Transaction, allTransactions?: Transaction[]) => number;
  /** Resolved links: per-parent summaries and child → parent. */
  linkIndex: LinkIndex;
  getLinkSummary: (parentTxId: string) => LinkSummary | null;
  /** Row amount: an expense with reimbursements shows −(your share). */
  getDisplayAmount: (tx: Transaction) => number;
  /** Amount for totals, or null when the tx must not count (linked child). */
  getStatAmount: (tx: Transaction) => number | null;
  isLinked: (txId: string) => boolean;
  markAutoCreated: (childTxId: string, accountId: string) => Promise<void>;
  unmarkAutoCreated: (childTxId: string) => Promise<void>;
  getAutoCreatedInfo: (childTxId: string) => { accountId: string } | null;
  /**
   * Drop every link (as parent or child) and auto-created marker that
   * references one of `txIds` — used when their account is deleted.
   */
  removeLinksFor: (txIds: string[]) => Promise<void>;
}

const TransactionLinksContext = createContext<TransactionLinksContextType | undefined>(undefined);

export function TransactionLinksProvider({ children }: { children: ReactNode }) {
  const [links, setLinks] = useState<Record<string, string[]>>({});
  const [autoCreated, setAutoCreated] = useState<Record<string, string>>({});
  const gate = useReadyGate();
  // Refs mirror state so consecutive awaited mutations see each other's
  // result (the render closure would be stale) — see useReadyGate for the
  // matching load-before-save guard.
  const linksRef = useRef<Record<string, string[]>>({});
  const autoCreatedRef = useRef<Record<string, string>>({});
  const { findTransaction, subscribeTxIdChanges } = useTransactionsContext();
  const { bulkAssignCategories } = useCategories();

  const linkIndex = useMemo(
    () => buildLinkIndex(links, (id) => findTransaction(id)?.tx),
    [links, findTransaction],
  );

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(LINKS_STORAGE_KEY),
      AsyncStorage.getItem(AUTO_CREATED_KEY),
    ])
      .then(([linkData, autoData]) => {
        if (linkData) {
          try {
            linksRef.current = JSON.parse(linkData);
            setLinks(linksRef.current);
          } catch {}
        }
        if (autoData) {
          try {
            autoCreatedRef.current = JSON.parse(autoData);
            setAutoCreated(autoCreatedRef.current);
          } catch {}
        }
      })
      .catch((e) => console.error("Failed to load transaction links:", e))
      .finally(() => gate.open());
  }, [gate]);

  const persist = useCallback(async (next: Record<string, string[]>) => {
    linksRef.current = next;
    setLinks(next);
    await AsyncStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const persistAutoCreated = useCallback(async (next: Record<string, string>) => {
    autoCreatedRef.current = next;
    setAutoCreated(next);
    await AsyncStorage.setItem(AUTO_CREATED_KEY, JSON.stringify(next));
  }, []);

  const linkTransaction = useCallback(async (childTxId: string, parentTxId: string) => {
    await gate.wait();
    if (childTxId === parentTxId) return;
    const next: Record<string, string[]> = {};
    // A transaction is the child of at most one expense, and a child can't
    // be a parent: re-linking moves it.
    for (const [pid, kids] of Object.entries(linksRef.current)) {
      const kept = kids.filter((id) => id !== childTxId);
      if (kept.length > 0) next[pid] = kept;
    }
    if (next[childTxId]) return;
    if (!next[parentTxId]) next[parentTxId] = [];
    if (!next[parentTxId].includes(childTxId)) {
      next[parentTxId] = [...next[parentTxId], childTxId];
    }
    await persist(next);
  }, [gate, persist]);

  const unlinkTransaction = useCallback(async (childTxId: string, parentTxId: string) => {
    await gate.wait();
    const next = { ...linksRef.current };
    if (next[parentTxId]) {
      next[parentTxId] = next[parentTxId].filter((id) => id !== childTxId);
      if (next[parentTxId].length === 0) delete next[parentTxId];
    }
    await persist(next);
  }, [gate, persist]);

  const getLinkedChildren = useCallback((parentTxId: string): string[] => {
    return links[parentTxId] || [];
  }, [links]);

  const getParentForChild = useCallback(
    (childTxId: string): string | null => linkIndex.childToParent.get(childTxId) ?? null,
    [linkIndex],
  );

  // Only reimbursements (incoming) reduce the parent expense; negative
  // children are "pay from account" moves (DECISIONS.md §1.8).
  const getLinkedTotal = useCallback(
    (parentTxId: string): number => linkIndex.summaries.get(parentTxId)?.reimbursed ?? 0,
    [linkIndex],
  );

  const getNetExpense = useCallback((parentTx: Transaction): number => {
    const parentId = getStableTxId(parentTx);
    const expenseAmount = Math.abs(getTransactionAmount(parentTx));
    return Math.max(0, expenseAmount - (linkIndex.summaries.get(parentId)?.reimbursed ?? 0));
  }, [linkIndex]);

  const getLinkSummary = useCallback(
    (parentTxId: string) => linkIndex.summaries.get(parentTxId) ?? null,
    [linkIndex],
  );
  const getDisplayAmount = useCallback((tx: Transaction) => displayAmountFor(tx, linkIndex), [linkIndex]);
  const getStatAmount = useCallback((tx: Transaction) => statAmountFor(tx, linkIndex), [linkIndex]);

  const isLinked = useCallback((txId: string): boolean => linkIndex.childToParent.has(txId), [linkIndex]);

  const markAutoCreated = useCallback(async (childTxId: string, accountId: string) => {
    await gate.wait();
    await persistAutoCreated({ ...autoCreatedRef.current, [childTxId]: accountId });
  }, [gate, persistAutoCreated]);

  const unmarkAutoCreated = useCallback(async (childTxId: string) => {
    await gate.wait();
    const next = { ...autoCreatedRef.current };
    delete next[childTxId];
    await persistAutoCreated(next);
  }, [gate, persistAutoCreated]);

  const removeLinksFor = useCallback(async (txIds: string[]) => {
    if (txIds.length === 0) return;
    await gate.wait();
    const gone = new Set(txIds);
    const nextLinks: Record<string, string[]> = {};
    let linksChanged = false;
    for (const [parentId, children] of Object.entries(linksRef.current)) {
      if (gone.has(parentId)) {
        linksChanged = true;
        continue;
      }
      const kept = children.filter((id) => !gone.has(id));
      if (kept.length !== children.length) linksChanged = true;
      if (kept.length > 0) nextLinks[parentId] = kept;
    }
    if (linksChanged) await persist(nextLinks);

    const nextAuto = { ...autoCreatedRef.current };
    let autoChanged = false;
    for (const id of Object.keys(nextAuto)) {
      if (gone.has(id)) {
        delete nextAuto[id];
        autoChanged = true;
      }
    }
    if (autoChanged) await persistAutoCreated(nextAuto);
  }, [gate, persist, persistAutoCreated]);

  // Follow id changes in transaction storage: statement rows replaced by the
  // bank's version keep their links; deleted transactions drop theirs.
  const remapIds = useCallback(async (remap: Record<string, string>) => {
    await gate.wait();
    const map = (id: string) => remap[id] ?? id;
    let changed = false;
    const nextLinks: Record<string, string[]> = {};
    for (const [parentId, children] of Object.entries(linksRef.current)) {
      const p = map(parentId);
      const kids = children.map(map);
      if (p !== parentId || kids.some((k, i) => k !== children[i])) changed = true;
      nextLinks[p] = Array.from(new Set([...(nextLinks[p] ?? []), ...kids])).filter((k) => k !== p);
      if (nextLinks[p].length === 0) delete nextLinks[p];
    }
    if (changed) await persist(nextLinks);
    const nextAuto: Record<string, string> = {};
    let autoChanged = false;
    for (const [id, acc] of Object.entries(autoCreatedRef.current)) {
      if (map(id) !== id) autoChanged = true;
      nextAuto[map(id)] = acc;
    }
    if (autoChanged) await persistAutoCreated(nextAuto);
  }, [gate, persist, persistAutoCreated]);

  useEffect(
    () =>
      subscribeTxIdChanges((change: TxIdChange) => {
        (async () => {
          if (change.remap) await remapIds(change.remap);
          if (change.removed) {
            // Reimbursements of a deleted expense become plain incomes again
            // (they were set to Ignore when linked). Auto-created "pay from
            // account" children keep Ignore — that money did leave the pot
            // (DECISIONS.md §3.2).
            const freed: Record<string, null> = {};
            for (const id of change.removed) {
              for (const child of linksRef.current[id] ?? []) {
                if (!autoCreatedRef.current[child]) freed[child] = null;
              }
            }
            await removeLinksFor(change.removed);
            if (Object.keys(freed).length > 0) await bulkAssignCategories(freed);
          }
        })().catch((e) => console.warn("Failed to update transaction links:", e));
      }),
    [subscribeTxIdChanges, remapIds, removeLinksFor, bulkAssignCategories],
  );

  const getAutoCreatedInfo = useCallback((childTxId: string): { accountId: string } | null => {
    const accountId = autoCreated[childTxId];
    return accountId ? { accountId } : null;
  }, [autoCreated]);

  return (
    <TransactionLinksContext.Provider
      value={{
        links,
        linkTransaction,
        unlinkTransaction,
        getLinkedChildren,
        getParentForChild,
        getLinkedTotal,
        getNetExpense,
        linkIndex,
        getLinkSummary,
        getDisplayAmount,
        getStatAmount,
        isLinked,
        markAutoCreated,
        unmarkAutoCreated,
        getAutoCreatedInfo,
        removeLinksFor,
      }}
    >
      {children}
    </TransactionLinksContext.Provider>
  );
}

export function useTransactionLinks() {
  const context = useContext(TransactionLinksContext);
  if (context === undefined) {
    throw new Error("useTransactionLinks must be used within a TransactionLinksProvider");
  }
  return context;
}
