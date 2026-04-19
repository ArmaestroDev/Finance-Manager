"use strict";

/**
 * Dispatcher for bank-statement PDF parsers.
 *
 * Each entry in `PARSERS` exposes:
 *   - name: display string shown to the user ("ING-DiBa", …)
 *   - detect(rawText) → boolean: cheap check to claim a statement
 *   - parse(rawText) → StatementResult
 *
 * Order matters: bank-specific parsers run first, then the generic fallback.
 * Adding a new bank = one new file in ./parsers + one line below.
 */

const ingDiba = require("./parsers/ingDiba");
const genericGerman = require("./parsers/genericGerman");
const { parseGermanAmount } = require("./parsers/shared");

class UnsupportedBankError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsupportedBankError";
  }
}

const PARSERS = [ingDiba, genericGerman];

function detectBank(rawText) {
  for (const p of PARSERS) {
    if (p.detect(rawText)) return p.name;
  }
  return null;
}

function parseStatement(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new UnsupportedBankError("Empty or invalid PDF text.");
  }

  for (const p of PARSERS) {
    if (!p.detect(rawText)) continue;
    const result = p.parse(rawText);
    // If a specific parser detected the bank but found nothing, try the next
    // parser in the chain so the user still gets something actionable.
    if (result.transactions.length > 0) return result;
  }

  throw new UnsupportedBankError(
    "Unrecognized bank statement format. No transactions could be extracted.",
  );
}

module.exports = {
  parseStatement,
  parseIngDiba: ingDiba.parse,
  detectBank,
  parseGermanAmount,
  UnsupportedBankError,
};
