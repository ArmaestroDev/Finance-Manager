import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import type { Transaction } from "../../../services/enableBanking";
import { useSettings } from "../../../shared/context/SettingsContext";
import { showAlert } from "../../../shared/utils/alert";
import { getStableTxId } from "../utils/transactions";
import { SYSTEM_IGNORE_ID, useCategories, type TransactionCategory } from "../context/CategoriesContext";
import { useAccounts } from "../../accounts/context/AccountsContext";
import { useTransactionLinks } from "../context/TransactionLinksContext";
import {
  aiApiKeyFor,
  aiBatchSize,
  callAiProvider,
  OllamaModelMissingError,
  OllamaUnreachableError,
} from "../utils/aiProviders";
import { BrowserAiNotReadyError } from "../utils/browserAi";
import {
  buildCategorizePrompt,
  buildCategorizeSchema,
  extractJson,
  resolveAiAssignments,
  toPromptTx,
} from "../utils/aiCategorize";
import { buildOwnIdentity, selfTransferReason } from "../utils/selfTransfer";

export interface CategorizeProgress {
  /** Transactions sent to the AI so far (finished batches). */
  done: number;
  total: number;
}

interface UseAutoCategorizeParams {
  transactions: Transaction[];
  /** Palette new AI-created categories are coloured from. */
  categoryColors: string[];
  setLoading: (loading: boolean) => void;
  onFinish?: () => void;
}

export function useAutoCategorize({
  transactions,
  categoryColors,
  setLoading,
  onFinish,
}: UseAutoCategorizeParams) {
  const router = useRouter();
  const { aiConfig, language, i18n } = useSettings();
  const { categories, getCategoryForTransaction, bulkAssignCategories, bulkAddCategories } =
    useCategories();
  const { accounts } = useAccounts();
  const { linkIndex } = useTransactionLinks();
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [progress, setProgress] = useState<CategorizeProgress | null>(null);
  // The user's own IBANs / holder names / account names, for the self-transfer
  // pre-pass and the prompt.
  const own = useMemo(() => buildOwnIdentity(accounts), [accounts]);

  const autoCategorizeTransactions = async (reCategorizeAll: boolean = false) => {
    const providerLabel = aiConfig.provider === "claude" ? "Claude" : "Gemini";
    if (aiApiKeyFor(aiConfig) === null) {
      showAlert(
        i18n.ai_api_key_missing_title,
        i18n.ai_api_key_missing_msg.replace("{provider}", providerLabel),
        [
          { text: i18n.cancel, style: "cancel" },
          { text: i18n.settings_title, onPress: () => router.push("/settings") },
        ],
      );
      onFinish?.();
      return;
    }

    // Identify uncategorized transactions. Linked children (reimbursements,
    // "pay from account" payments) keep their Ignore category even on a full
    // re-categorization — see DECISIONS.md §1.8.
    const uncategorized = transactions.filter((tx) => {
      const txId = getStableTxId(tx);
      if (linkIndex.childToParent.has(txId)) return false;
      if (!reCategorizeAll && getCategoryForTransaction(txId)) return false;
      return true;
    });

    if (uncategorized.length === 0) {
      showAlert(i18n.ai_all_done_title, i18n.ai_all_categorized);
      onFinish?.();
      return;
    }

    setLoading(true);
    setIsCategorizing(true);

    // Deterministic pre-pass: obvious self-transfers (own IBAN, same name on
    // both sides, the account holder as counterparty, "Umbuchung"/"Übertrag")
    // go to system Ignore before invoking the AI.
    const selfTransferAssignments: Record<string, string> = {};
    const remaining: Transaction[] = [];
    for (const tx of uncategorized) {
      if (selfTransferReason(tx, own)) {
        selfTransferAssignments[getStableTxId(tx)] = SYSTEM_IGNORE_ID;
      } else {
        remaining.push(tx);
      }
    }

    const selfTransferCount = Object.keys(selfTransferAssignments).length;
    if (selfTransferCount > 0) {
      await bulkAssignCategories(selfTransferAssignments);
    }

    if (remaining.length === 0) {
      showAlert(
        i18n.success_title,
        i18n.ai_done_all_self.replace("{count}", String(selfTransferCount)),
      );
      setLoading(false);
      setIsCategorizing(false);
      onFinish?.();
      return;
    }

    try {
      const txList = remaining.map(toPromptTx);

      // Smaller batches for local models (context window, visible progress).
      const batchSize = aiBatchSize(aiConfig.provider);
      const batches: (typeof txList)[] = [];
      for (let i = 0; i < txList.length; i += batchSize) {
        batches.push(txList.slice(i, i + batchSize));
      }
      let sent = 0;
      setProgress({ done: 0, total: txList.length });

      let categorizedCount = selfTransferCount;
      let parseFailures = 0;
      // Grows as categories are created so every batch sees them.
      let knownCategories: TransactionCategory[] = [...categories];

      for (const batch of batches) {
        const categoryList = knownCategories.map((c) => ({ id: c.id, name: c.name }));
        const prompt = buildCategorizePrompt({
          categories: categoryList,
          transactions: batch,
          language,
          own: { holderNames: own.holderNamesRaw, accountNames: own.accountNames },
        });

        const resultText = await callAiProvider({
          config: aiConfig,
          prompt,
          schema: buildCategorizeSchema(batch.map((b) => b.id)),
        });
        sent += batch.length;
        setProgress({ done: sent, total: txList.length });
        if (!resultText) continue;

        try {
          const parsed = extractJson(resultText);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new SyntaxError("Expected a JSON object");
          }

          const amountsById = new Map(
            batch.map((b) => [b.id, b.amount] as [string, number]),
          );
          const { assignments, pendingByName, newCategoryNames } =
            resolveAiAssignments(
              parsed as Record<string, unknown>,
              amountsById,
              knownCategories,
              language,
            );

          if (newCategoryNames.length > 0) {
            const existingColors = new Set(knownCategories.map((c) => c.color));
            let availableColors = categoryColors.filter((c) => !existingColors.has(c));
            if (availableColors.length === 0) availableColors = [...categoryColors];

            const createdCats = await bulkAddCategories(
              newCategoryNames.map((name, index) => ({
                name,
                color: availableColors[index % availableColors.length],
              })),
            );
            // Later batches must see these, otherwise the AI (and the name
            // matching) creates the same category again per batch.
            knownCategories = [...knownCategories, ...createdCats];

            for (const [txId, name] of Object.entries(pendingByName)) {
              const createdCat = createdCats.find(
                (c) => c.name.toLowerCase() === name.toLowerCase(),
              );
              if (createdCat && !assignments[txId]) {
                assignments[txId] = createdCat.id;
              }
            }
          }

          categorizedCount += Object.keys(assignments).length;

          if (Object.keys(assignments).length > 0) {
            await bulkAssignCategories(assignments);
          }
        } catch (parseError) {
          console.error("Failed to parse AI response:", parseError, resultText);
          parseFailures++;
        }
      }

      let successMsg = (selfTransferCount > 0 ? i18n.ai_done_with_self : i18n.ai_done)
        .replace("{count}", String(categorizedCount))
        .replace("{self}", String(selfTransferCount));
      if (parseFailures > 0) {
        successMsg +=
          " " +
          i18n.ai_batches_skipped
            .replace("{failed}", String(parseFailures))
            .replace("{total}", String(batches.length));
      }
      showAlert(i18n.success_title, successMsg);
    } catch (err) {
      console.error("Auto-categorization failed", err);
      const raw =
        err instanceof OllamaUnreachableError
          ? i18n.ai_ollama_unreachable
          : err instanceof OllamaModelMissingError
            ? i18n.ai_ollama_model_missing.replace(/\{model\}/g, err.model)
            : err instanceof BrowserAiNotReadyError
              ? i18n.ai_browser_not_ready
              : err instanceof Error && err.message
              ? err.message
              : i18n.error_unknown;
      const isOverloaded = /503|overloaded|high demand|temporary/.test(raw);
      if (isOverloaded) {
        showAlert(i18n.ai_overload_title, i18n.ai_overload_msg);
      } else {
        showAlert(i18n.ai_categorize_error_title, raw);
      }
    } finally {
      setLoading(false);
      setIsCategorizing(false);
      setProgress(null);
      onFinish?.();
    }
  };

  return { autoCategorizeTransactions, isCategorizing, progress };
}
