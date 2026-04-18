import { useState } from "react";
import { Alert, Platform } from "react-native";
import type { Transaction } from "../../../services/enableBanking";
import { getStableTxId, getTransactionAmount } from "../utils/transactions";
import { cleanRemittanceInfo } from "../../../shared/utils/financeHelpers";

interface TransactionCategory {
  id: string;
  name: string;
  color: string;
}

interface UseAutoCategorizeParams {
  transactions: Transaction[];
  categories: TransactionCategory[];
  geminiApiKey: string | null;
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
  geminiApiKey,
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
    if (!geminiApiKey) {
      if (Platform.OS === "web") {
        alert("Please set your Gemini API Key in Settings first.");
      } else {
        Alert.alert(
          "API Key Missing",
          "Please set your Gemini API Key in Settings first.",
          [
            { text: i18n.cancel, style: "cancel" },
            { text: "Settings", onPress: () => router.push("/settings") },
          ],
        );
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

    try {
      // Prepare data for prompt
      const categoryList = categories.map((c) => ({ id: c.id, name: c.name }));

      const txList = uncategorized.map((tx) => {
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

      let categorizedCount = 0;

      for (const batch of batches) {
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
5. If NO existing category fits, BUT you are confident it belongs to a common category, you may suggest a NEW category name.
IMPORTANT: Aim for a COMPACT list of categories. Do not create granular categories like "Coffee" or "Gym"; instead consolidate into "Lifestyle" or "Leisure". Ideally, keep the TOTAL number of categories around 6-7 if possible. Prefer broader categories like "Shopping", "Mobility", "Living", "Lifestyle".
6. If a transaction is ambiguous or absolutely does not fit any category (existing or new), assign null.
7. Return a STRICT valid JSON object where keys are transaction IDs and values are either:
   - An existing category ID (string starting with "cat_")
   - A NEW category name (string, human readable, e.g. "Gym"). IMPORTANT: The new category name MUST be in the language "${
     language === "de" ? "German (Deutsch)" : "English"
   }".
   - null

Example output format:
{
  "tx_123": "cat_456",
  "tx_789": "New Category Name",
  "tx_000": null
}
`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          },
        );

        if (!response.ok) {
          let errorMsg = `Request failed with status ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error?.message || errorMsg;
          } catch (e) {
            // Body is not JSON
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();

        let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) continue;

        // Clean markdown code blocks if present
        resultText = resultText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        console.log("Generative AI Response Text:", resultText);

        try {
          const assignments = JSON.parse(resultText);
          console.log("Generative AI Assignments:", assignments);

          const validAssignments: Record<string, string> = {};
          const newCategoriesToCreate = new Set<string>();

          for (const [txId, value] of Object.entries(assignments)) {
            if (typeof value === "string") {
              const tx = transactions.find(t => getStableTxId(t) === txId);
              if (!tx) continue;

              const amount = getTransactionAmount(tx);
              const isNeg = amount < 0;

              // Helper to check if a category name implies Income
              const isIncomeName = (name: string) => 
                name.toLowerCase() === "einkommen" || name.toLowerCase() === "income";

              // Check if it's an existing category ID
              const existingCat = categories.find((c) => c.id === value);
              let finalAssignedCatId: string | null = null;
              let finalNewCatName: string | null = null;

              if (existingCat) {
                const isCatIncome = isIncomeName(existingCat.name);
                if (!isNeg && !isCatIncome) {
                  const incCat = categories.find(c => isIncomeName(c.name));
                  if (incCat) finalAssignedCatId = incCat.id;
                } else if (isNeg && isCatIncome) {
                  finalAssignedCatId = null; 
                } else {
                  finalAssignedCatId = existingCat.id;
                }
              } else {
                // It's a new category name
                const normalizedName = value.trim();
                const isCatIncome = isIncomeName(normalizedName);
                
                if (!isNeg && !isCatIncome) {
                   const incCat = categories.find(c => isIncomeName(c.name));
                   if (incCat) {
                      finalAssignedCatId = incCat.id;
                   } else {
                      finalNewCatName = "Einkommen"; // force create Income
                   }
                } else if (isNeg && isCatIncome) {
                   finalNewCatName = null;
                } else {
                  // Check if it already exists (case-insensitive)
                  const existingByName = categories.find(
                    (c) => c.name.toLowerCase() === normalizedName.toLowerCase(),
                  );

                  if (existingByName) {
                    finalAssignedCatId = existingByName.id;
                  } else {
                    finalNewCatName = normalizedName;
                  }
                }
              }

              if (finalAssignedCatId) {
                 validAssignments[txId] = finalAssignedCatId;
                 categorizedCount++;
              } else if (finalNewCatName) {
                 if (!newCategoriesToCreate.has(finalNewCatName)) {
                    newCategoriesToCreate.add(finalNewCatName);
                 }
              }
            }
          }

          // Bulk create new categories if any
          if (newCategoriesToCreate.size > 0) {
            const existingColors = new Set(categories.map(c => c.color));
            let availableColors = categoryColors.filter(c => !existingColors.has(c));
            if (availableColors.length === 0) availableColors = [...categoryColors];

            const newCatsInput = Array.from(newCategoriesToCreate).map(
              (name, index) => ({
                name,
                color: availableColors[index % availableColors.length],
              }),
            );

            const createdCats = await bulkAddCategories(newCatsInput);

            // Now map the transactions that were waiting for these new categories
            for (const [txId, value] of Object.entries(assignments)) {
              if (typeof value === "string") {
                const normalizedName = value.trim();
                const createdCat = createdCats.find(
                  (c) => c.name.toLowerCase() === normalizedName.toLowerCase(),
                );
                if (createdCat && !validAssignments[txId]) {
                  validAssignments[txId] = createdCat.id;
                  categorizedCount++;
                }
              }
            }
          }

          if (Object.keys(validAssignments).length > 0) {
            await bulkAssignCategories(validAssignments);
          }
        } catch (parseError) {
          console.error("Failed to parse AI response:", resultText);
        }
      }

      const successMsg = `Categorized ${categorizedCount} transactions.`;
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
        title = i18n.ai_overload_title || "AI Service Busy";
        msg = i18n.ai_overload_msg || "The AI model is currently experiencing high demand. Please try again in a moment.";
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
