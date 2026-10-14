// Locale-tolerant number parsing for user input ("1.234,56", "1,234.56",
// "12,5", "12.50", "-3,20", "3,20-", "€ 12,00").
//
// Rules:
//   - both "." and "," present → the LAST one is the decimal separator, the
//     other is a thousands separator;
//   - the same separator repeated ("1.234.567") → thousands separators;
//   - a single "," → decimal (German);
//   - a single "." → decimal (keeps "12.50" working).
// Returns NaN for empty / unparseable input.
export function parseLocaleNumber(raw: string | number | null | undefined): number {
  if (typeof raw === "number") return raw;
  if (raw == null) return NaN;
  let s = String(raw).trim().replace(/[\s ']/g, "");
  if (!s) return NaN;

  // Trailing sign ("12,34-") as used by some German banks.
  let negative = false;
  if (/^[^-]*\d-$/.test(s)) {
    negative = true;
    s = s.slice(0, -1);
  }
  s = s.replace(/[^\d.,+-]/g, "");
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  if (!s || /[+-]/.test(s)) return NaN;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandSep = decimalSep === "." ? "," : ".";
    s = s.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (lastComma >= 0) {
    const count = s.split(",").length - 1;
    s = count > 1 ? s.split(",").join("") : s.replace(",", ".");
  } else if (lastDot >= 0) {
    const count = s.split(".").length - 1;
    if (count > 1) s = s.split(".").join("");
  }
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return NaN;
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return NaN;
  return negative ? -n : n;
}

// Round to whole cents, avoiding float drift (0.1 + 0.2) and "-0".
export function roundCents(n: number): number {
  const r = Math.round((n + Number.EPSILON * Math.sign(n)) * 100) / 100;
  return r === 0 ? 0 : r;
}
