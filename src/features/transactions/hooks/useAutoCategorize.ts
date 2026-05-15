import { useState } from "react";
import { Alert, Platform } from "react-native";
import type { Transaction } from "../../../services/enableBanking";
import { getStableTxId, getTransactionAmount } from "../utils/transactions";
import { cleanRemittanceInfo } from "../../../shared/utils/financeHelpers";
import { SYSTEM_IGNORE_ID } from "../context/CategoriesContext";
import { callAiProvider, type AiProvider } from "../utils/aiProviders";

interface TransactionCategory {
  id: string;
  name: string;
  color: string;
  system?: "ignore";
}

interface UseAutoCategorizeParams {
  transactions: Transaction[];
  categories: TransactionCategory[];
  aiProvider: AiProvider;
  geminiApiKey: string | null;
  claudeApiKey: string | null;
  language: string;
  getCategoryForTransaction: (txId: string) => TransactionCategory | null;
  assignCategory: (txId: string, categoryId: string | null) => void;
  bulkAssignCategories: (assignments: Record<string, string>) => Promise<void>;
  bulkAddCategories: (cats: { name: string; color: string }[]) => Promise<TransactionCategory[]>;
  categoryColors: string[];
  setLoading: (loading: boolean) => void;
  router: any;
  i18n: Record<string, string>;
  onFinish?: () => void;
}

export function useAutoCategorize({
  transactions,
  categories,
  aiProvider,
  geminiApiKey,
  claudeApiKey,
  language,
  getCategoryForTransaction,
  assignCategory,
  bulkAssignCategories,
  bulkAddCategories,
  categoryColors,
  setLoading,
  router,
  i18n,
  onFinish,
}: UseAutoCategorizeParams) {
  const [isCategorizing, setIsCategorizing] = useState(false);

  const autoCategorizeTransactions = async (reCategorizeAll: boolean = false) => {
    const activeApiKey = aiProvider === "claude" ? claudeApiKey : geminiApiKey;
    const providerLabel = aiProvider === "claude" ? "Claude" : "Gemini";
    if (!activeApiKey) {
      const title = i18n.ai_api_key_missing_title || "API Key Missing";
      const template =
        i18n.ai_api_key_missing_msg ||
        "Please set your {provider} API Key in Settings first.";
      const msg = template.replace("{provider}", providerLabel);
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert(title, msg, [
          { text: i18n.cancel, style: "cancel" },
          { text: "Settings", onPress: () => router.push("/settings") },
        ]);
      }
      onFinish?.();
      return;
    }

    // Identify uncategorized transactions
    const uncategorized = transactions.filter((tx) => {
      const txId = getStableTxId(tx);
      if (!reCategorizeAll && getCategoryForTransaction(txId)) return false;
      return true;
    });

    if (uncategorized.length === 0) {
      Alert.alert("All Done", "All transactions are already categorized!");
      onFinish?.();
      return;
    }

    setLoading(true);
    setIsCategorizing(true);

    // Deterministic same-name short-circuit: classify obvious self-transfers
    // (creditor name === debtor name) as system Ignore before invoking the AI.
    const selfTransferAssignments: Record<string, string> = {};
    const remaining: Transaction[] = [];
    for (const tx of uncategorized) {
      const cN = tx.creditor?.name?.trim().toLowerCase() ?? "";
      const dN = tx.debtor?.name?.trim().toLowerCase() ?? "";
      if (cN && dN && cN === dN) {
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
      const msg = `Categorized ${selfTransferCount} transactions (all self-transfers).`;
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("Success", msg);
      setLoading(false);
      setIsCategorizing(false);
      onFinish?.();
      return;
    }

    try {
      const txList = remaining.map((tx) => {
        const remittanceFull = tx.remittance_information?.join(" ") || "";
        const cleanRef = cleanRemittanceInfo(tx.remittance_information) || "";

        return {
          id: getStableTxId(tx),
          creditor: tx.creditor?.name || "Unknown",
          debtor: tx.debtor?.name || "Unknown",
          amount: getTransactionAmount(tx),
          reference: cleanRef,
          raw_reference:
            remittanceFull !== cleanRef ? remittanceFull : undefined,
          date: tx.booking_date,
        };
      });

      // Limit batch size to avoid token limits (e.g. 50 txs)
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < txList.length; i += batchSize) {
        batches.push(txList.slice(i, i + batchSize));
      }

      let categorizedCount = selfTransferCount;

      for (const batch of batches) {
        const categoryList = categories.map((c) => ({ id: c.id, name: c.name }));
        const prompt = `
You are an intelligent financial assistant.
Your goal is to categorize bank transactions into one of the provided categories.

Here are the available transaction categories:
${JSON.stringify(categoryList)}

Here is a list of uncategorized transactions:
${JSON.stringify(batch)}

INSTRUCTIONS:
1. Analyze each transaction (creditor, debtor, amount, reference).
2. Assign the MOST APPROPRIATE category ID from the available list.
3. If a transaction clearly fits a category (e.g., "Rewe" -> Groceries, "Shell" -> Gas), ASSIGN IT.
4. CRITICAL RULE FOR INCOME VS EXPENSE:
   - Note the "amount" field we provided. If the amount has a MINUS sign (-) before it (e.g. -45.00), it is an EXPENSE. You MUST assign it to an expense category. You MUST NOT assign it to the Income category.
   - If the amount is POSITIVE (no minus sign, e.g. 100.00), it is INCOME. You MUST assign it to the category representing Income (e.g., "Einkommen", "Income"). Do NOT assign it to anything else.
4a. SELF-TRANSFERS AND INVESTMENT BUYS MUST BE IGNORED.
   - If a transaction is BETWEEN ACCOUNTS OWNED BY THE USER (creditor name and debtor name match the user, or are both empty with a clear "self-transfer" reference), assign the category id "${SYSTEM_IGNORE_ID}".
   - If a transaction is a PURCHASE OF INVESTMENTS / ETFs / STOCKS (creditor is a broker like "Trade Republic", "Scalable", "Comdirect Depot", "DEGIRO", "IBKR", or the remittance includes an ISIN reference like "DE000..." or "US..."), assign "${SYSTEM_IGNORE_ID}".
   - These transactions net out and double-count net worth — do NOT split them between Income and Expense.
5. If NO existing category fits, BUT you are confident it belongs to a common category, you may suggest a NEW category name.
IMPORTANT: Aim for a COMPACT list of categories. Do not create granular categories like "Coffee" or "Gym"; instead consolidate into "Lifestyle" or "Leisure". Ideally, keep the TOTAL number of categories around 6-7 if possible. Prefer broader categories like "Shopping", "Mobility", "Living", "Lifestyle".
6. If a transaction is ambiguous or absolutely does not fit any category (existing or new), assign null.
7. Return a STRICT valid JSON object where keys are transaction IDs and values are either:
   - An existing category ID (string starting with "cat_")
   - A NEW category name (string, human readable, e.g. "Gym"). IMPORTANT: The new category name MUST be in the language "${language === "de" ? "German (Deutsch)" : "English"}".
   - null

Example output format:
{
  "tx_123": "cat_456",
  "tx_789": "New Category Name",
  "tx_000": null
}
`;

        const resultText = await callAiProvider({
          provider: aiProvider,
          apiKey: activeApiKey,
          prompt,
        });
        if (!resultText) continue;

        try {
          const cleaned = resultText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

          const assignments = JSON.parse(cleaned) as Record<string, unknown>;

          const validAssignments: Record<string, string> = {};
          const newCategoriesSet = new Set<string>();

          const isIncomeName = (name: string) =>
            name.toLowerCase() === "einkommen" || name.toLowerCase() === "income";

          for (const [txId, value] of Object.entries(assignments)) {
            if (typeof value !== "string") continue;
            const tx = transactions.find((t) => getStableTxId(t) === txId);
            if (!tx) continue;

            const amount = getTransactionAmount(tx);
            const isNeg = amount < 0;
            const existingCat = categories.find((c) => c.id === value);

            if (existingCat) {
              if (existingCat.system === "ignore") {
                validAssignments[txId] = existingCat.id;
                continue;
              }
              const isCatIncome = isIncomeName(existingCat.name);
              if (!isNeg && !isCatIncome) {
                const incCat = categories.find((c) => isIncomeName(c.name));
                if (incCat) validAssignments[txId] = incCat.id;
              } else if (isNeg && isCatIncome) {
                // skip
              } else {
                validAssignments[txId] = existingCat.id;
              }
            } else {
              const normalizedName = value.trim();
              const isCatIncome = isIncomeName(normalizedName);

              if (!isNeg && !isCatIncome) {
                const incCat = categories.find((c) => isIncomeName(c.name));
                if (incCat) {
                  validAssignments[txId] = incCat.id;
                } else {
                  newCategoriesSet.add("Einkommen");
                }
              } else if (isNeg && isCatIncome) {
                // skip
              } else {
                const existingByName = categories.find(
                  (c) => c.name.toLowerCase() === normalizedName.toLowerCase(),
                );
                if (existingByName) {
                  validAssignments[txId] = existingByName.id;
                } else {
                  newCategoriesSet.add(normalizedName);
                }
              }
            }
          }

          const newCategoriesToCreate = Array.from(newCategoriesSet);

          if (newCategoriesToCreate.length > 0) {
            const existingColors = new Set(categories.map((c) => c.color));
            let availableColors = categoryColors.filter((c) => !existingColors.has(c));
            if (availableColors.length === 0) availableColors = [...categoryColors];

            const newCatsInput = newCategoriesToCreate.map((name, index) => ({
              name,
              color: availableColors[index % availableColors.length],
            }));

            const createdCats = await bulkAddCategories(newCatsInput);

            for (const [txId, value] of Object.entries(assignments)) {
              if (typeof value !== "string") continue;
              const normalizedName = value.trim();
              const createdCat = createdCats.find(
                (c) => c.name.toLowerCase() === normalizedName.toLowerCase(),
              );
              if (createdCat && !validAssignments[txId]) {
                validAssignments[txId] = createdCat.id;
              }
            }
          }

          categorizedCount += Object.keys(validAssignments).length;

          if (Object.keys(validAssignments).length > 0) {
            await bulkAssignCategories(validAssignments);
          }
        } catch (parseError) {
          console.error("Failed to parse AI response:", resultText);
        }
      }

      const successMsg =
        selfTransferCount > 0
          ? `Categorized ${categorizedCount} transactions (${selfTransferCount} self-transfers).`
          : `Categorized ${categorizedCount} transactions.`;
      if (Platform.OS === "web") {
        alert(successMsg);
      } else {
        Alert.alert("Success", successMsg);
      }
    } catch (err: any) {
      console.error("Auto-categorization failed", err);
      let msg = err.message || "Unknown error";
      let title = "Auto-categorization Issue";

      const isOverloaded =
        (typeof msg === "string" && (
          msg.includes("503") ||
          msg.includes("overloaded") ||
          msg.includes("high demand") ||
          msg.includes("temporary")
        ));

      if (isOverloaded) {
        title = i18n.ai_overload_title || "Service Busy";
        msg = i18n.ai_overload_msg || "The categorization service is currently experiencing high demand. Please try again in a moment.";
      }

      if (Platform.OS === "web") {
        alert(`${title}: ${msg}`);
      } else {
        Alert.alert(title, msg);
      }
    } finally {
      setLoading(false);
      setIsCategorizing(false);
      onFinish?.();
    }
  };

  return { autoCategorizeTransactions, isCategorizing };
}
