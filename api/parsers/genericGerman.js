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

// Line head: booking date DD.MM.YYYY or DD.MM. (many banks omit the year in
// the transaction table), optionally followed by a Valuta date in either form.
const ROW_HEAD_RE =
  /^(\d{2})\.(\d{2})\.(\d{4})?(?:\s*\d{2}\.\d{2}\.(?:\d{4})?)?\s*(.*)$/;
// A leading date (either form) on a continuation line.
const LEADING_DATE_RE = /^\d{2}\.\d{2}\.(?:\d{4})?\s*(.*)$/;
const FULL_DATE_RE = /(\d{2})\.(\d{2})\.(\d{4})/g;
// German amount at the end of a line. Sign may be a leading "+"/"-", a
// trailing "-"/"+" (Sparkasse/Volksbank style "12,34-"), or a trailing
// "S"/"H" (Soll = debit, Haben = credit). An optional "EUR"/"€" may follow.
const AMOUNT_TAIL_RE =
  /([+-]?)\s?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s?([+-]|S|H)?\s*(?:EUR|€)?\s*$/;
const IBAN_RE = /\b(DE\d{2}(?:\s?\d{4}){4}\s?\d{2})\b/;
// Matches "Kontoauszug Nr. 3 vom 01.02.2026 bis 28.02.2026" and similar forms
const PERIOD_RE =
  /(?:Kontoauszug|Zeitraum|Auszug)[^\n]*?(\d{2}\.\d{2}\.\d{4}(?:[^\n]*?\d{2}\.\d{2}\.\d{4})?)/i;
const OLD_SALDO_RE =
  /(?:Alter|Vorheriger|Anfangs)\s+Saldo[^\d-]*(-?[\d.]+,\d{2})\s?([+-]|S|H)?/i;
const NEW_SALDO_RE =
  /(?:Neuer|Endg[üu]ltiger|End)\s+Saldo[^\d-]*(-?[\d.]+,\d{2})\s?([+-]|S|H)?/i;

// Saldo value with optional trailing sign / Soll-Haben marker.
function saldoValue(m) {
  const n = parseGermanAmount(m[1]);
  return m[2] === "-" || m[2] === "S" ? -Math.abs(n) : n;
}

// Reference dates for year-less rows: the statement period if present, else
// the latest full date anywhere in the document (statement / print date).
function findReferenceDates(lines) {
  for (const line of lines) {
    const m = line.match(PERIOD_RE);
    if (m && m[1]) {
      const dates = [...m[1].matchAll(FULL_DATE_RE)].map(toDate).filter(Boolean);
      if (dates.length > 0) {
        return { start: dates[0], end: dates[dates.length - 1] };
      }
    }
  }
  let latest = null;
  for (const line of lines) {
    for (const m of line.matchAll(FULL_DATE_RE)) {
      const d = toDate(m);
      if (d && (!latest || d > latest)) latest = d;
    }
  }
  return latest ? { start: null, end: latest } : null;
}

function toDate(m) {
  const [dd, mm, yyyy] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Year for a "DD.MM." row. Picks the year (end year or the one before) that
 * puts the date inside the statement period, which handles statements that
 * span New Year (e.g. 15.12.2025 – 14.01.2026). Without a period start, a
 * date after the reference date (beyond a few days of Valuta slack) belongs
 * to the previous year.
 */
function inferYear(dd, mm, ref) {
  const fallback = new Date().getUTCFullYear();
  if (!ref) return fallback;
  const endYear = ref.end.getUTCFullYear();
  const slack = 7 * DAY_MS;
  const candidates = [endYear, endYear - 1];
  if (ref.start) {
    for (const y of candidates) {
      const d = Date.UTC(y, mm - 1, dd);
      if (d >= ref.start.getTime() - slack && d <= ref.end.getTime() + slack) return y;
    }
  }
  return Date.UTC(endYear, mm - 1, dd) > ref.end.getTime() + slack ? endYear - 1 : endYear;
}

function detect() {
  // Generic parser is the fallback — registry logic decides when to call it.
  return true;
}

function parse(rawText) {
  const lines = normalizeLines(rawText);
  const referenceDates = findReferenceDates(lines);
  let inferredYearCount = 0;

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
      if (m) oldBalance = saldoValue(m);
    }
    if (newBalance == null) {
      const m = line.match(NEW_SALDO_RE);
      if (m) newBalance = saldoValue(m);
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
        const [, leadSign, digits, trailSign] = tail;
        const negative =
          leadSign === "-" || trailSign === "-" || trailSign === "S";
        const desc = rest
          .slice(0, rest.length - tail[0].length)
          .replace(/\s{2,}/g, " ")
          .trim();
        let year = yyyy;
        if (!year) {
          year = String(inferYear(Number(dd), Number(mm), referenceDates));
          inferredYearCount++;
        }
        current = {
          date: `${year}-${mm}-${dd}`,
          description: desc,
          amount: (negative ? -1 : 1) * parseGermanAmount(digits),
        };
        continue;
      }
      // Dated row with no amount: might be a continuation-line with a Valuta
      // date prefix. Fall through to continuation handling.
    }

    if (!current) continue;

    // Continuation: drop leading Valuta date if present
    const deDated = line.match(LEADING_DATE_RE);
    const continuation = deDated ? deDated[1].trim() : line;
    if (continuation) current.description += "\n" + continuation;
  }

  pushCurrent();

  let parseWarning = checkBalanceDelta(oldBalance, newBalance, transactions);
  if (!parseWarning && inferredYearCount > 0 && !referenceDates) {
    parseWarning =
      "The statement lists dates without a year and no statement date was found — the current year was assumed. Please verify the dates.";
  } else if (!parseWarning && transactions.length === 0) {
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
