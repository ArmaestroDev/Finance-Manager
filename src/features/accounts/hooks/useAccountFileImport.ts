import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useState } from "react";
import { Platform } from "react-native";

import { useImportQueue } from "@/src/features/import/context/ImportQueueContext";
import type { ImportResult } from "@/src/features/transactions/context/TransactionsContext";
import type { Transaction } from "@/src/services/enableBanking";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { showAlert } from "@/src/shared/utils/alert";

interface CsvFile {
  fileName: string;
  content: string;
}

interface UseAccountFileImportArgs {
  accountId: string;
  accountType: "connected" | "manual";
  currency: string;
  /** Persists the transactions mapped from a CSV file (null = failed, already reported). */
  importTransactions: (txns: Transaction[]) => Promise<ImportResult | null>;
}

async function readCsvAsset(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS !== "web") return FileSystem.readAsStringAsync(asset.uri);
  const file = asset.file;
  if (!file) throw new Error("File object not found on web");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

const isPdf = (a: DocumentPicker.DocumentPickerAsset) =>
  a.uri.toLowerCase().endsWith(".pdf") || a.mimeType === "application/pdf";

// Statement import for the account detail screens (desktop + mobile):
// PDFs go to the background import queue, CSVs are read and queued for the
// column-mapping dialog (one file at a time).
export function useAccountFileImport({
  accountId,
  accountType,
  currency,
  importTransactions,
}: UseAccountFileImportArgs) {
  const { i18n } = useSettings();
  const { addFiles } = useImportQueue();
  const [csvQueue, setCsvQueue] = useState<CsvFile[]>([]);

  const pickAndImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "application/pdf"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || result.assets.length === 0) return;

      const pdfAssets = result.assets.filter(isPdf);
      const csvAssets = result.assets.filter((a) => !isPdf(a));

      if (pdfAssets.length > 0) {
        addFiles(
          pdfAssets.map((asset) => ({
            uri: asset.uri,
            name: asset.name,
            mimeType: asset.mimeType || "application/pdf",
            file: asset.file,
            accountId,
            accountType,
            currency,
          })),
        );
      }

      const csvItems: CsvFile[] = [];
      for (const csvAsset of csvAssets) {
        try {
          const content = await readCsvAsset(csvAsset);
          if (content.trim()) {
            csvItems.push({ fileName: csvAsset.name, content });
          } else {
            showAlert(
              i18n.import_empty_file_title,
              i18n.import_empty_file_msg.replace("{name}", csvAsset.name),
            );
          }
        } catch (csvErr) {
          console.error(csvErr);
          showAlert(i18n.error_title, i18n.import_csv_read_failed.replace("{name}", csvAsset.name));
        }
      }
      if (csvItems.length > 0) setCsvQueue((prev) => [...prev, ...csvItems]);
    } catch (err) {
      console.error(err);
      showAlert(i18n.error_title, i18n.import_picker_failed);
    }
  };

  const currentCsv = csvQueue[0] ?? null;

  const cancelCsv = () => setCsvQueue((q) => q.slice(1));

  const confirmCsv = async (txns: Transaction[]) => {
    const fileName = csvQueue[0]?.fileName ?? "";
    setCsvQueue((q) => q.slice(1));
    if (txns.length === 0) return;
    const result = await importTransactions(txns);
    if (!result) return;
    // Dedupe can skip rows, so report what was actually added.
    showAlert(
      i18n.import_done_title,
      i18n.import_done_msg
        .replace("{count}", String(result.importedTxIds.length))
        .replace("{file}", fileName),
    );
  };

  return { pickAndImport, currentCsv, cancelCsv, confirmCsv };
}
