import type { Transaction } from "../../../services/enableBanking";
import { cleanImportDescription } from "./cleanDescription";

export type CsvFieldRole =
  | "ignore"
  | "date"
  | "description"
  | "amount"
  | "debit"
  | "credit"
  | "valueDate";

export type CsvDelimiter = ";" | "," | "\t";

export type CsvDateFormat =
  | "DD.MM.YYYY"
  | "YYYY-MM-DD"
  | "DD/MM/YYYY"
  | "MM/DD/YYYY";

export type CsvAmountFormat = "de" | "en"; // de = "1.234,56"; en = "1,234.56"

export interface CsvMapping {
  roles: CsvFieldRole[]; // one entry per column
  dateFormat: CsvDateFormat;
  amountFormat: CsvAmountFormat;
}

export interface CsvPreview {
  headers: string[];
  rows: string[][];
  delimiter: CsvDelimiter;
  totalRows: number;
}

const DELIMITERS: CsvDelimiter[] = [";", ",", "\t"];

export function detectDelimiter(text: string): CsvDelimiter {
  const sample = text.split(/\r?\n/).slice(0, 5).join("\n");
  let best: CsvDelimiter = ";";
  let bestCount = -1;
  for (const d of DELIMITERS) {
    const count = (sample.match(new RegExp(escapeRegex(d), "g")) || []).length;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// RFC-4180-ish splitter: handles quoted fields that contain the delimiter.
function splitCsvLine(line: string, delimiter: CsvDelimiter): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseCsv(
  text: string,
  delimiterOverride?: CsvDelimiter,
): CsvPreview {
  const delimiter = delimiterOverride ?? detectDelimiter(text);
  // Many German banks include metadata rows before the real header ("Umsätze",
  // IBAN, period, etc.) — scan the first ~15 lines for the row with the most
  // delimiter-separated fields and treat that as the header.
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let headerIdx = 0;
  let headerFieldCount = 0;
  const scanLimit = Math.min(rawLines.length, 15);
  for (let i = 0; i < scanLimit; i++) {
    const fields = splitCsvLine(rawLines[i], delimiter);
    if (fields.length > headerFieldCount && fields.length >= 3) {
      headerFieldCount = fields.length;
      headerIdx = i;
    }
  }

  const headerLine = rawLines[headerIdx] || "";
  const headers = splitCsvLine(headerLine, delimiter);
  const rows = rawLines.slice(headerIdx + 1).map((l) => {
    const cells = splitCsvLine(l, delimiter);
    // Pad/trim so each row has the same length as headers.
    if (cells.length < headers.length) {
      return [...cells, ...Array(headers.length - cells.length).fill("")];
    }
    return cells.slice(0, headers.length);
  });

  return { headers, rows, delimiter, totalRows: rows.length };
}

export function autoDetectRoles(headers: string[]): CsvFieldRole[] {
  const roles: CsvFieldRole[] = headers.map(() => "ignore");
  let dateAssigned = false;
  let descAssigned = false;
  let amountAssigned = false;
  let debitAssigned = false;
  let creditAssigned = false;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();

    if (!dateAssigned && /\b(buchung|booking|datum|date)\b/.test(h)) {
      roles[i] = "date";
      dateAssigned = true;
      continue;
    }
    if (!descAssigned && /(verwendung|purpose|description|beschreib|zweck|buchungstext|remittance|auftraggeber|beg[üu]nstigter|empf[äa]nger|name)/.test(h)) {
      roles[i] = "description";
      descAssigned = true;
      continue;
    }
    if (!amountAssigned && /\b(betrag|amount|umsatz)\b/.test(h) && !/(soll|haben|debit|credit)/.test(h)) {
      roles[i] = "amount";
      amountAssigned = true;
      continue;
    }
    if (!debitAssigned && /\b(soll|debit|ausgang|out)\b/.test(h)) {
      roles[i] = "debit";
      debitAssigned = true;
      continue;
    }
    if (!creditAssigned && /\b(haben|credit|eingang|in)\b/.test(h)) {
      roles[i] = "credit";
      creditAssigned = true;
      continue;
    }
    if (/(valuta|value\s?date|wert)/.test(h)) {
      roles[i] = "valueDate";
      continue;
    }
  }

  return roles;
}

export function detectDateFormat(rows: string[][], dateCol: number): CsvDateFormat {
  if (dateCol < 0) return "DD.MM.YYYY";
  const samples = rows.slice(0, 10).map((r) => r[dateCol] || "");
  for (const s of samples) {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return "YYYY-MM-DD";
    if (/^\d{2}\.\d{2}\.\d{4}/.test(s)) return "DD.MM.YYYY";
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return "DD/MM/YYYY";
  }
  return "DD.MM.YYYY";
}

export function detectAmountFormat(
  rows: string[][],
  amountCols: number[],
): CsvAmountFormat {
  for (const row of rows.slice(0, 10)) {
    for (const c of amountCols) {
      const v = row[c] || "";
      if (!v) continue;
      // "1.234,56" → de; "1,234.56" → en. Last separator wins.
      const lastComma = v.lastIndexOf(",");
      const lastDot = v.lastIndexOf(".");
      if (lastComma >= 0 && lastComma > lastDot) return "de";
      if (lastDot >= 0 && lastDot > lastComma) return "en";
    }
  }
  return "de";
}

function parseAmountValue(raw: string, fmt: CsvAmountFormat): number {
  if (!raw) return NaN;
  let s = raw.replace(/\s/g, "").replace(/[^\d.,\-+]/g, "");
  if (!s) return NaN;
  if (fmt === "de") {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  return Number.parseFloat(s);
}

function parseDateValue(raw: string, fmt: CsvDateFormat): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (fmt === "YYYY-MM-DD") {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  }
  if (fmt === "DD.MM.YYYY") {
    const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  }
  if (fmt === "DD/MM/YYYY") {
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  }
  if (fmt === "MM/DD/YYYY") {
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
  }
  return null;
}

export interface RowsToTxResult {
  transactions: Transaction[];
  skippedRows: number;
}

export function rowsToTransactions(
  rows: string[][],
  mapping: CsvMapping,
  currency: string,
  fileName: string,
): RowsToTxResult {
  const dateCol = mapping.roles.indexOf("date");
  const descCol = mapping.roles.indexOf("description");
  const amountCol = mapping.roles.indexOf("amount");
  const debitCol = mapping.roles.indexOf("debit");
  const creditCol = mapping.roles.indexOf("credit");

  const hasAmountSource =
    amountCol >= 0 || (debitCol >= 0 && creditCol >= 0) || debitCol >= 0 || creditCol >= 0;

  if (dateCol < 0 || !hasAmountSource) {
    return { transactions: [], skippedRows: rows.length };
  }

  const transactions: Transaction[] = [];
  let skipped = 0;

  rows.forEach((row, i) => {
    const date = parseDateValue(row[dateCol] || "", mapping.dateFormat);
    if (!date) {
      skipped++;
      return;
    }

    let amount = NaN;
    if (amountCol >= 0) {
      amount = parseAmountValue(row[amountCol] || "", mapping.amountFormat);
    } else {
      const debit =
        debitCol >= 0 ? parseAmountValue(row[debitCol] || "", mapping.amountFormat) : 0;
      const credit =
        creditCol >= 0
          ? parseAmountValue(row[creditCol] || "", mapping.amountFormat)
          : 0;
      const d = Number.isFinite(debit) ? debit : 0;
      const c = Number.isFinite(credit) ? credit : 0;
      if (d === 0 && c === 0) {
        amount = NaN;
      } else {
        amount = c - Math.abs(d);
      }
    }

    if (!Number.isFinite(amount)) {
      skipped++;
      return;
    }

    const rawDesc = descCol >= 0 ? cleanImportDescription(row[descCol] || "") : "";
    const desc = `[Imported] ${rawDesc || fileName}`;
    transactions.push({
      transaction_id: `import_csv_${Date.now()}_${i}`,
      booking_date: date,
      transaction_amount: {
        currency,
        amount: amount.toString(),
      },
      remittance_information: [desc],
      creditor: { name: amount < 0 ? desc : "Self" },
      debtor: { name: amount >= 0 ? desc : "Self" },
    } as Transaction);
  });

  return { transactions, skippedRows: skipped };
}
