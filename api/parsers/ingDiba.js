"use strict";

/**
 * Line-oriented parser for ING-DiBa "Kontoauszug" (Girokonto) PDFs.
 *
 * pdf-parse extracts text in reading order but collapses inter-column
 * whitespace. So "02.02.2026  Gutschrift  Gaetano Monte  250,00" comes out as
 * "02.02.2026GutschriftGaetano Monte250,00" — spaces between columns are gone,
 * but spaces inside a column (e.g. "Gaetano Monte") are preserved.
 *
 * Each PDF page has: a transaction table, then a page-footer block (barcode
 * "34GKKA...", recipient address, the per-page summary box with Alter/Neuer
 * Saldo, IBAN, Seite X von Y, and bank disclaimer). Only the table contains
 * transactions. We use a small state machine to stay inside the table.
 *
 * Transaction head = DD.MM.YYYY + capitalized type word + description + amount.
 * Continuation lines = everything between two heads (Valuta date stripped).
 */

const {
  parseGermanAmount,
  normalizeLines,
  checkBalanceDelta,
} = require("./shared");

// Transaction head: DD.MM.YYYY + [CAPITAL start of type] + ... + GermanAmount
// No \s+ between date/desc/amount - pdf-parse may have collapsed them.
const HEAD_RE =
  /^(\d{2})\.(\d{2})\.(\d{4})\s*([A-ZÄÖÜ].*?)\s*(-?[\d.]+,\d{2})\s*$/;

// Any line starting with DD.MM.YYYY — used to strip Valuta date on continuations
const DATED_RE = /^\d{2}\.\d{2}\.\d{4}\s*(.*)$/;

// Markers that transition between table and non-table regions of a page
const TABLE_START_RE = /^Buchung(?:\s*\/\s*Verwendungszweck|Buchung)/i;
const TABLE_END_RE = /^34GKKA/;

// Summary rows that can appear inside the table on the last page — not txns
const SUMMARY_IN_TABLE_RES = [
  /^Neuer\s+Saldo/,
  /^Kunden-Information$/,
  /^Vorliegender/,
  /^Verbrauchter/,
  /^Bitte\s+beachten/,
  /^Valuta$/,
  /^Betrag\s*\(EUR\)/,
];

function detect(rawText) {
  // "Girokonto Nummer" combined with the ING-specific "Buchung" table header
  // catches older ING-DiBa statements that don't spell out "ING-DiBa" in body.
  if (/ING-DiBa/i.test(rawText)) return true;
  return (
    /Girokonto\s+Nummer/.test(rawText) &&
    /^Buchung(?:\s*\/\s*Verwendungszweck|Buchung)/im.test(rawText)
  );
}

function parse(rawText) {
  const lines = normalizeLines(rawText);

  const transactions = [];
  let current = null;
  let inTable = false;

  let iban = null;
  let oldBalance = null;
  let newBalance = null;
  let period = null;
  let accountNumber = null;

  const pushCurrent = () => {
    if (current) {
      current.description = current.description.trim();
      transactions.push(current);
      current = null;
    }
  };

  for (const line of lines) {
    if (TABLE_START_RE.test(line)) {
      inTable = true;
      continue;
    }
    if (TABLE_END_RE.test(line)) {
      pushCurrent();
      inTable = false;
      continue;
    }

    const ibanMatch = line.match(/^IBAN\s*(DE[\d\s]+)$/);
    if (ibanMatch) iban = ibanMatch[1].replace(/\s+/g, "");

    const oldSaldoMatch = line.match(/^Alter\s+Saldo\s*(-?[\d.]+,\d{2})/);
    if (oldSaldoMatch && oldBalance == null) {
      oldBalance = parseGermanAmount(oldSaldoMatch[1]);
    }

    const newSaldoMatch = line.match(/^Neuer\s+Saldo\s*(-?[\d.]+,\d{2})/);
    if (newSaldoMatch && newBalance == null) {
      newBalance = parseGermanAmount(newSaldoMatch[1]);
    }

    const periodMatch = line.match(/^Kontoauszug\s+(.+?)\s*$/);
    if (periodMatch && !period) period = periodMatch[1];

    const girokontoMatch = line.match(/^Girokonto\s+Nummer\s+(\d+)/);
    if (girokontoMatch && !accountNumber) accountNumber = girokontoMatch[1];

    if (!inTable) continue;

    if (SUMMARY_IN_TABLE_RES.some((re) => re.test(line))) {
      if (/^Neuer\s+Saldo/.test(line) || /^Kunden-Information/.test(line)) {
        pushCurrent();
        inTable = false;
      }
      continue;
    }

    const head = line.match(HEAD_RE);
    if (head) {
      pushCurrent();
      const [, dd, mm, yyyy, desc, amountStr] = head;
      current = {
        date: `${yyyy}-${mm}-${dd}`,
        description: desc.trim(),
        amount: parseGermanAmount(amountStr),
      };
      continue;
    }

    if (!current) continue;

    const dated = line.match(DATED_RE);
    if (dated) {
      const rest = dated[1].trim();
      if (rest) current.description += "\n" + rest;
      continue;
    }

    current.description += "\n" + line;
  }

  pushCurrent();

  const parseWarning = checkBalanceDelta(oldBalance, newBalance, transactions);

  return {
    bank: "ING-DiBa",
    iban,
    accountNumber,
    period,
    oldBalance,
    newBalance,
    transactions,
    parseWarning,
  };
}

module.exports = { name: "ING-DiBa", detect, parse };
