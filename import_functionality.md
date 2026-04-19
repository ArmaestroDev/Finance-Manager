# Bank Statement Import Functionality

This document outlines the architecture and implementation details of the multi-statement bank import system.

## Overview
The system allows users to import bank statements (PDF or CSV) into manual or connected accounts. It features a background processing queue for PDFs, a column-mapping UI for CSVs, composite-key duplicate detection, and statement management.

## Technical Architecture

### 1. Backend PDF Parser (`api/parseStatement.js` + `api/parsers/*`)
- **Engine**: Uses `pdf-parse` for text extraction.
- **Architecture**: Registry dispatcher in `parseStatement.js` iterates an ordered list of per-bank parsers. Each parser exposes `{ name, detect(text), parse(text) }`. Adding a new bank = one file in `api/parsers/` + one line in the registry.
- **Parsers today**:
  - `parsers/ingDiba.js` — line-oriented state machine specific to ING-DiBa "Kontoauszug" PDFs (strictest, most accurate).
  - `parsers/genericGerman.js` — best-effort fallback for Sparkasse, DKB, Commerzbank, Volksbank, etc. Extracts `DD.MM.YYYY + description + GermanAmount` rows. Always emits a `parseWarning` asking the user to verify results.
- **Shared helpers** live in `parsers/shared.js` (`parseGermanAmount`, `normalizeLines`, `checkBalanceDelta`).
- **Metadata Extraction**: Captures IBAN, account period, and statement balances (old/new Saldo).
- **Validation**: Performs a balance-delta sanity check (Old Balance + Sum of Transactions = New Balance) when both balances are present; flags warnings if they don't match.
- **Endpoint**: `/api/parse-statement` handles base64 file uploads and returns structured transaction data. Returns HTTP 422 with `code: "UNSUPPORTED_BANK"` when nothing matches.

### 2. State Management (Contexts)
- **`BankStatementsContext`**: Persists metadata for each imported statement (filename, date, associated transaction IDs). This enables statement-level operations.
- **`ImportQueueContext`**: Manages a sequential background worker. When multiple files are selected, it enqueues them and processes them one-by-one to maintain stability and provide progress tracking. No artificial cooldown — local-CPU parsing is fast.
- **`TransactionsContext`**: Includes `importBankStatement`, which handles merging of new transactions into local storage with composite-key duplicate detection (see below).

### 3. UI Components
- **`ImportQueueOverlay`**: Global floating component (mounted in `_layout.tsx`) that shows status of background PDF imports (Pending, Processing, Completed, Failed) with per-item retry/dismiss.
- **`StatementsModal`**: Accessible from the Account Detail screen. Lists all imported statements for a specific account and provides **Cascade Delete** (deleting a statement removes all its imported transactions via `statement_id` tag).
- **`CsvMappingModal`**: Full-featured column-mapping dialog for CSV imports. Users assign roles (Date / Description / Amount / Debit / Credit / Value Date / Skip) to each column, override the delimiter (`;`, `,`, tab), pick the date format (DD.MM.YYYY / YYYY-MM-DD / DD/MM/YYYY / MM/DD/YYYY), and pick the amount format (European `1.234,56` vs US `1,234.56`). Shows a live preview with color-highlighted role assignments and a running transaction count. Supports either a single signed Amount column OR split Debit/Credit columns.
- **`DocumentPicker` Integration**: The "Import" button in `AccountDetailScreen` supports multi-file selection. PDFs go to the ImportQueue. CSVs are enqueued and shown one-at-a-time in the CsvMappingModal for user review before import.

## Import Logic & Rules
- **Duplicate Detection**: Uses a composite key of `booking_date | amount(2dp) | normalized description/counterparty`. This catches true duplicates (re-uploading the same statement, overlap between connected-bank fetch and manual import) while preserving legitimate same-day transactions that differ in amount or description. The `[Imported]` prefix is stripped before comparison so CSV/PDF imports line up against each other.
- **Tagging**: Every transaction imported from a PDF is tagged with a `statement_id` for tracking and cascade deletion.
- **CSV parsing**: Handles quoted fields with escaped quotes per RFC-4180, auto-detects the header row within the first 15 lines (banks often prepend metadata), auto-suggests column roles by matching common German and English header keywords, and auto-detects date and amount formats from the first 10 rows.

## Current Limitations & Future Work
- **Bank Support**: Explicit parsers only exist for ING-DiBa today. Generic fallback handles most German bank layouts but is best-effort — users should spot-check results. To add a bank: create `api/parsers/<bank>.js` exporting `{ name, detect, parse }` and register it in `api/parseStatement.js` above `genericGerman`.
- **Locale**: Amount currency hardcoded to EUR/de-DE at the UI layer (`formatAmount`). CSV mapping supports EU and US number formats, but output still renders as EUR.
- **Statement-file storage**: We store metadata only — the original PDF is discarded after parsing. If users ever need to re-parse (e.g. after a parser improvement), they need the original file again.
