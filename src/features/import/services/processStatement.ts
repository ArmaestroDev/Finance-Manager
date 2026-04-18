import { Platform } from "react-native";
import type { Transaction } from "../../../services/enableBanking";
import type { QueueItem } from "../context/ImportQueueContext";

/**
 * Reads a PDF file and converts it to base64.
 * Handles both web (FileReader) and native (expo-file-system) platforms.
 */
async function readFileAsBase64(item: QueueItem): Promise<string> {
  if (Platform.OS === "web") {
    // On web, use the File object stored during picking
    const file = item.fileObject;
    if (!file) {
      throw new Error(
        "File object not available. Please re-select the file.",
      );
    }
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        if (!base64) {
          reject(new Error("Failed to read file as base64"));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(file);
    });
  } else {
    // On native, use expo-file-system
    const FileSystem = await import("expo-file-system/legacy");
    const base64Data = await FileSystem.readAsStringAsync(item.fileUri, {
      encoding: "base64",
    });
    return base64Data;
  }
}

/**
 * Sends a PDF bank statement to the Gemini API for transaction extraction.
 *
 * @param item - The queue item containing the file to process
 * @param geminiApiKey - The user's Gemini API key
 * @param currentCurrency - The account's currency code (e.g. "EUR")
 * @returns Parsed Transaction[] extracted from the PDF
 * @throws Error if the API call or parsing fails
 */
export async function processStatementWithGemini(
  item: QueueItem,
  geminiApiKey: string,
  currentCurrency: string,
): Promise<Transaction[]> {
  // Step 1: Read the file as base64
  const base64Data = await readFileAsBase64(item);

  // Step 2: Build the prompt
  const prompt = `
You are a financial data extraction assistant.
Extract all transactions from this bank statement PDF.
Return a STRICT JSON array of objects representing the transactions.
Each object MUST have the following keys:
- date: The booking date in YYYY-MM-DD format.
- description: The transaction description or reference.
- amount: The transaction amount as a number (negative for expenses, positive for income).

Do not include any other text, markdown formatting, or explanation. ONLY return the JSON array.
`;

  // Step 3: Call Gemini API
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    if (response.status === 429) {
      throw new Error(
        "Rate limit exceeded. The queue will retry automatically.",
      );
    }
    throw new Error(
      `Gemini API error (${response.status}): ${errorBody.slice(0, 200)}`,
    );
  }

  const data = await response.json();

  // Step 4: Parse the response
  const aiText: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!aiText) {
    throw new Error("No response text from Gemini API");
  }

  // Extract JSON from potential markdown code fences
  let jsonString = aiText.trim();
  const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
  }

  let parsed: Array<{ date: string; description: string; amount: number }>;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("Failed to parse Gemini response as JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response is not an array");
  }

  // Step 5: Map to Transaction format
  const transactions: Transaction[] = parsed
    .filter(
      (entry) =>
        entry.date &&
        entry.description &&
        typeof entry.amount === "number" &&
        !isNaN(entry.amount),
    )
    .map((entry, index) => {
      // Normalize date to YYYY-MM-DD
      let formattedDate = entry.date;
      try {
        const dateObj = new Date(entry.date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split("T")[0];
        }
      } catch {
        // Keep original date string
      }

      const desc = `[Imported] ${entry.description}`;
      return {
        transaction_id: `import_pdf_${Date.now()}_${index}`,
        booking_date: formattedDate,
        transaction_amount: {
          currency: currentCurrency,
          amount: entry.amount.toString(),
        },
        remittance_information: [desc],
        creditor: {
          name: entry.amount < 0 ? entry.description : "Self",
        },
        debtor: {
          name: entry.amount > 0 ? entry.description : "Self",
        },
      } as unknown as Transaction;
    });

  return transactions;
}
