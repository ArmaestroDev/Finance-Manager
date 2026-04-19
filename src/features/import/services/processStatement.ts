import { Platform } from "react-native";
import type { Transaction } from "../../../services/enableBanking";
import type { QueueItem } from "../context/ImportQueueContext";

const API_BASE =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "/api"
    : "http://localhost:3001/api";

export interface StatementParseResult {
  transactions: Transaction[];
  bank: string;
  iban: string | null;
  period: string | null;
  oldBalance: number | null;
  newBalance: number | null;
  parseWarning: string | null;
  pdfBase64: string;
}

async function readFileAsBase64(item: QueueItem): Promise<string> {
  if (Platform.OS === "web") {
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
  }
  const FileSystem = await import("expo-file-system/legacy");
  return FileSystem.readAsStringAsync(item.fileUri, { encoding: "base64" });
}

/**
 * Parses a PDF bank statement on the backend and returns normalized
 * Transaction[] plus statement metadata. No AI, no rate limits.
 *
 * Each extracted transaction is assigned a stable ID of the form
 * `import_pdf_${statementId}_${index}` so downstream cascade deletion can
 * find them reliably.
 */
export async function parseStatementWithBackend(
  item: QueueItem,
  statementId: string,
  currentCurrency: string,
): Promise<StatementParseResult> {
  const base64 = await readFileAsBase64(item);

  const response = await fetch(`${API_BASE}/parse-statement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, fileName: item.fileName }),
  });

  if (!response.ok) {
    let message = `Parse failed (${response.status})`;
    try {
      const errBody = await response.json();
      if (errBody?.error) message = errBody.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = (await response.json()) as {
    bank: string;
    iban: string | null;
    accountNumber: string | null;
    period: string | null;
    oldBalance: number | null;
    newBalance: number | null;
    parseWarning: string | null;
    transactions: Array<{
      date: string;
      description: string;
      amount: number;
    }>;
  };

  if (!Array.isArray(data.transactions)) {
    throw new Error("Backend returned no transactions array");
  }

  const transactions: Transaction[] = data.transactions.map((entry, index) => {
    const firstLine = entry.description.split("\n")[0] || entry.description;
    const remittance = `[Imported] ${entry.description}`;
    return {
      transaction_id: `import_pdf_${statementId}_${index}`,
      booking_date: entry.date,
      transaction_amount: {
        currency: currentCurrency,
        amount: entry.amount.toString(),
      },
      remittance_information: [remittance],
      creditor: { name: entry.amount < 0 ? firstLine : "Self" },
      debtor: { name: entry.amount >= 0 ? firstLine : "Self" },
    } as Transaction;
  });

  return {
    transactions,
    bank: data.bank,
    iban: data.iban,
    period: data.period,
    oldBalance: data.oldBalance,
    newBalance: data.newBalance,
    parseWarning: data.parseWarning,
    pdfBase64: base64,
  };
}
