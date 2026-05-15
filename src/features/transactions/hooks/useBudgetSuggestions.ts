import { useState } from "react";

import type { Transaction } from "../../../services/enableBanking";
import { callAiProvider, type AiProvider } from "../utils/aiProviders";
import {
  getStableTxId,
  getTransactionAmount,
  pickTransactionTitle,
} from "../utils/transactions";
import type {
  BudgetLineItem,
  TransactionCategory,
} from "../context/CategoriesContext";

type CategoryBudgetMap = Record<string, BudgetLineItem[]>;

export type DetectionReason =
  | "no-key"
  | "no-data"
  | "none-found"
  | "parse"
  | "api";

export interface DetectionResult {
  ok: boolean;
  addedCount: number;
  categoriesTouched: number;
  reason?: DetectionReason;
  error?: string;
}

interface UseBudgetSuggestionsParams {
  categories: TransactionCategory[];
  transactionCategoryMap: Record<string, string>;
  categoryBudgets: CategoryBudgetMap;
  setCategoryBudget: (
    categoryId: string,
    items: BudgetLineItem[],
  ) => Promise<void>;
  getAllCachedTransactions: () => Promise<Transaction[]>;
  aiProvider: AiProvider;
  geminiApiKey: string | null;
  claudeApiKey: string | null;
  language: string;
}

// Collapse a payee/reference into a stable grouping key: lowercase, drop
// digits and punctuation (invoice numbers, dates, SEPA refs vary per charge),
// keep letters/spaces only. "Shell 1234 Berlin" & "SHELL 9988" → "shell".
const normalizeLabel = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[0-9]+/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);

const round2 = (n: number) => Math.round(n * 100) / 100;

const newItemId = () =>
  `bli_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

interface Group {
  categoryId: string;
  labelCounts: Map<string, number>;
  months: Set<string>;
  amounts: number[];
}

// Scans the full transaction cache, asks the AI which categorized expenses
// recur roughly monthly, and appends those as `source: "ai"` budget line
// items (deduped against what's already there) for the user to review.
export function useBudgetSuggestions({
  categories,
  transactionCategoryMap,
  categoryBudgets,
  setCategoryBudget,
  getAllCachedTransactions,
  aiProvider,
  geminiApiKey,
  claudeApiKey,
  language,
}: UseBudgetSuggestionsParams) {
  const [isDetecting, setIsDetecting] = useState(false);

  const detectRecurring = async (): Promise<DetectionResult> => {
    const activeApiKey =
      aiProvider === "claude" ? claudeApiKey : geminiApiKey;
    if (!activeApiKey) {
      return { ok: false, addedCount: 0, categoriesTouched: 0, reason: "no-key" };
    }

    setIsDetecting(true);
    try {
      const txs = await getAllCachedTransactions();
      if (txs.length === 0) {
        return {
          ok: false,
          addedCount: 0,
          categoriesTouched: 0,
          reason: "no-data",
        };
      }

      const catById = new Map(categories.map((c) => [c.id, c]));

      // Group categorized expenses by category + normalized payee.
      const groups = new Map<string, Group>();
      for (const tx of txs) {
        const amount = getTransactionAmount(tx);
        if (!Number.isFinite(amount) || amount >= 0) continue; // expenses only

        const catId = transactionCategoryMap[getStableTxId(tx)];
        if (!catId) continue;
        const cat = catById.get(catId);
        if (!cat || cat.system === "ignore") continue;

        const date = tx.booking_date || tx.value_date || "";
        const monthKey = date.slice(0, 7);
        if (monthKey.length !== 7) continue;

        const title = pickTransactionTitle(tx);
        const norm = normalizeLabel(title);
        if (!norm) continue;

        const key = `${catId}||${norm}`;
        let g = groups.get(key);
        if (!g) {
          g = {
            categoryId: catId,
            labelCounts: new Map(),
            months: new Set(),
            amounts: [],
          };
          groups.set(key, g);
        }
        g.months.add(monthKey);
        g.amounts.push(Math.abs(amount));
        const display = title.trim().slice(0, 40) || norm;
        g.labelCounts.set(display, (g.labelCounts.get(display) ?? 0) + 1);
      }

      // Keep only things that actually repeat across months.
      const candidates = [...groups.values()]
        .map((g) => {
          const occurrences = g.amounts.length;
          const distinctMonths = g.months.size;
          const sum = g.amounts.reduce((s, x) => s + x, 0);
          const avg = sum / occurrences;
          const min = Math.min(...g.amounts);
          const max = Math.max(...g.amounts);
          // Most frequently seen original title becomes the display label.
          let label = "";
          let best = -1;
          for (const [name, count] of g.labelCounts) {
            if (count > best) {
              best = count;
              label = name;
            }
          }
          return {
            categoryId: g.categoryId,
            label,
            occurrences,
            distinctMonths,
            avgAmount: round2(avg),
            minAmount: round2(min),
            maxAmount: round2(max),
          };
        })
        .filter((c) => c.distinctMonths >= 2 && c.occurrences >= 2)
        .sort(
          (a, b) =>
            b.distinctMonths - a.distinctMonths ||
            b.occurrences - a.occurrences,
        )
        .slice(0, 50);

      if (candidates.length === 0) {
        return {
          ok: true,
          addedCount: 0,
          categoriesTouched: 0,
          reason: "none-found",
        };
      }

      const categoryList = categories
        .filter((c) => c.system !== "ignore")
        .map((c) => ({ id: c.id, name: c.name }));

      const langName =
        language === "de" ? "German (Deutsch)" : "English";

      const prompt = `
You are a personal-finance assistant building a MONTHLY budget.

Available expense categories (use these category IDs exactly):
${JSON.stringify(categoryList)}

Below are groups of past expenses, each already assigned to a category.
For every group you get: the category it belongs to, a payee label, how many
times it occurred ("occurrences"), in how many distinct calendar months it
appeared ("distinctMonths"), and the average / min / max charge amount (EUR,
positive numbers):
${JSON.stringify(candidates)}

TASK: Decide which groups represent a RECURRING monthly expense and produce a
budget line item for each.

RULES:
1. Only include expenses that recur on a roughly monthly cadence (appear in
   several distinct months). Ignore one-offs and irregular purchases.
2. For stable charges (min ≈ max, e.g. rent, subscriptions, insurance) use
   that fixed amount.
3. For variable-but-recurring spend (e.g. fuel, groceries) use the AVERAGE
   amount as the monthly estimate.
4. Keep the "label" short and human ("Fuel", "Netflix", "Rent", "Groceries").
   Labels MUST be written in ${langName}.
5. NEVER invent categories. "categoryId" MUST be one of the IDs listed above
   and SHOULD match the group's own category.
6. "amount" is the expected monthly spend in EUR, a positive number.
7. Be selective — prefer confidence over coverage. Return at most 25 items.

Return STRICT valid JSON, an array only, no prose, no markdown fences:
[
  { "categoryId": "cat_123", "label": "Fuel", "amount": 60 },
  { "categoryId": "cat_456", "label": "Netflix", "amount": 12.99 }
]
`;

      let resultText: string | null;
      try {
        resultText = await callAiProvider({
          provider: aiProvider,
          apiKey: activeApiKey,
          prompt,
        });
      } catch (err: any) {
        return {
          ok: false,
          addedCount: 0,
          categoriesTouched: 0,
          reason: "api",
          error: err?.message || "Request failed",
        };
      }
      if (!resultText) {
        return { ok: false, addedCount: 0, categoriesTouched: 0, reason: "api" };
      }

      let parsed: unknown;
      try {
        const cleaned = resultText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
        parsed = JSON.parse(cleaned);
      } catch {
        return {
          ok: false,
          addedCount: 0,
          categoriesTouched: 0,
          reason: "parse",
        };
      }

      const list: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as any)?.suggestions)
          ? (parsed as any).suggestions
          : [];

      // Validate + bucket suggestions by category.
      const byCategory = new Map<string, BudgetLineItem[]>();
      for (const s of list) {
        if (!s || typeof s !== "object") continue;
        const categoryId = String(s.categoryId ?? "");
        const cat = catById.get(categoryId);
        if (!cat || cat.system === "ignore") continue;

        const label = String(s.label ?? "").trim().slice(0, 60);
        if (!label) continue;

        const amount = round2(Number(s.amount));
        if (!Number.isFinite(amount) || amount <= 0) continue;

        const bucket = byCategory.get(categoryId) ?? [];
        bucket.push({ id: newItemId(), label, amount, source: "ai" });
        byCategory.set(categoryId, bucket);
      }

      let addedCount = 0;
      let categoriesTouched = 0;

      for (const [categoryId, suggestions] of byCategory) {
        const existing = categoryBudgets[categoryId] ?? [];
        const seen = new Set(
          existing.map((it) => normalizeLabel(it.label)),
        );
        const toAdd: BudgetLineItem[] = [];
        for (const sug of suggestions) {
          const norm = normalizeLabel(sug.label);
          if (!norm || seen.has(norm)) continue; // dedupe vs existing + batch
          seen.add(norm);
          toAdd.push(sug);
        }
        if (toAdd.length === 0) continue;
        await setCategoryBudget(categoryId, [...existing, ...toAdd]);
        addedCount += toAdd.length;
        categoriesTouched += 1;
      }

      return {
        ok: true,
        addedCount,
        categoriesTouched,
        reason: addedCount === 0 ? "none-found" : undefined,
      };
    } finally {
      setIsDetecting(false);
    }
  };

  return { detectRecurring, isDetecting };
}
