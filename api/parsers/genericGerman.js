"use strict";

/**
 * Best-effort parser for German bank statement PDFs that follow the common
 * "DD.MM.YYYY  <description columns>  <GermanAmount>" row layout
 * (Sparkasse, Commerzbank, DKB, Volksbank, …).
 *
 * This is intentionally less strict than the ING-DiBa parser: it has no
 * table-start/table-end anchors, so it may over- or under-capture on exotic
 * layouts. We always emit parseWarning so the user knows to spot-check the
 * result. If balance markers are present we run the delta check too.
 */

const {
  parseGermanAmount,
  normalizeLines,
  checkBalanceDelta,
} = require("./shared");

// Line head: DD.MM.YYYY (booking date, possibly followed by Valuta DD.MM.YYYY)
const ROW_HEAD_RE = /^(\d{2})\.(\d{2})\.(\d{4})(?:\s*\d{2}\.\d{2}\.\d{4})?\s*(.*)$/;
// German amount anywhere at end of a line, optional sign. Allow trailing "H"/"S"
// (Haben/Soll) or EUR suffix that some banks append.
const AMOUNT_TAIL_RE = /(-?[\d.]+,\d{2})\s*(?:H|S|EUR)?\s*$/;
const IBAN_RE = /\b(DE[\d ]{20,})\b/;
// Matches "Kontoauszug Nr. 3 vom 01.02.2026 bis 28.02.2026" and similar forms
const PERIOD_RE =
  /(?:Kontoauszug|Zeitraum|Auszug)[^\n]*?(\d{2}\.\d{2}\.\d{4}(?:[^\n]*?\d{2}\.\d{2}\.\d{4})?)/i;
const OLD_SALDO_RE = /(?:Alter|Vorheriger|Anfangs)\s+Saldo[^\d-]*(-?[\d.]+,\d{2})/i;
const NEW_SALDO_RE = /(?:Neuer|Endg[üu]ltiger|End)\s+Saldo[^\d-]*(-?[\d.]+,\d{2})/i;

function detect() {
  // Generic parser is the fallback — registry logic decides when to call it.
  return true;
}

function parse(rawText) {
  const lines = normalizeLines(rawText);

  const transactions = [];
  let current = null;

  let iban = null;
  let oldBalance = null;
  let newBalance = null;
  let period = null;

  const pushCurrent = () => {
    if (current) {
      current.description = current.description.trim();
      if (current.description && Number.isFinite(current.amount)) {
        transactions.push(current);
      }
      current = null;
    }
  };

  for (const line of lines) {
    if (!iban) {
      const m = line.match(IBAN_RE);
      if (m) iban = m[1].replace(/\s+/g, "");
    }
    if (oldBalance == null) {
      const m = line.match(OLD_SALDO_RE);
      if (m) oldBalance = parseGermanAmount(m[1]);
    }
    if (newBalance == null) {
      const m = line.match(NEW_SALDO_RE);
      if (m) newBalance = parseGermanAmount(m[1]);
    }
    if (!period) {
      const m = line.match(PERIOD_RE);
      if (m && m[1]) period = m[1].trim();
    }

    // Skip summary rows so they don't leak into descriptions
    if (/^(Alter|Neuer|Endg[üu]ltiger|Vorheriger|Anfangs)\s+Saldo/i.test(line)) {
      pushCurrent();
      continue;
    }

    const head = line.match(ROW_HEAD_RE);
    if (head) {
      const [, dd, mm, yyyy, rest] = head;
      const tail = rest.match(AMOUNT_TAIL_RE);
      if (tail) {
        pushCurrent();
        const amountStr = tail[1];
        const desc = rest
          .slice(0, rest.length - tail[0].length)
          .replace(/\s{2,}/g, " ")
          .trim();
        current = {
          date: `${yyyy}-${mm}-${dd}`,
          description: desc,
          amount: parseGermanAmount(amountStr),
        };
        continue;
      }
      // Dated row with no amount: might be a continuation-line with a Valuta
      // date prefix. Fall through to continuation handling.
    }

    if (!current) continue;

    // Continuation: drop leading Valuta date if present
    const deDated = line.match(/^\d{2}\.\d{2}\.\d{4}\s*(.*)$/);
    const continuation = deDated ? deDated[1].trim() : line;
    if (continuation) current.description += "\n" + continuation;
  }

  pushCurrent();

  let parseWarning = checkBalanceDelta(oldBalance, newBalance, transactions);
  if (!parseWarning && transactions.length === 0) {
    parseWarning =
      "No transactions could be detected. The bank's layout may not match the generic parser — please verify the statement manually.";
  } else if (!parseWarning) {
    parseWarning =
      "Parsed with the generic German-statement parser. Please verify amounts and counterparties — layout-specific quirks may cause small errors.";
  }

  return {
    bank: "Generic (German)",
    iban,
    accountNumber: null,
    period,
    oldBalance,
    newBalance,
    transactions,
    parseWarning,
  };
}

module.exports = { name: "Generic (German)", detect, parse };
