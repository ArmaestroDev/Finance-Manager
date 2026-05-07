// Money + date formatters used across the design system. EUR + de-DE.
// Mirrors fmEUR / fmDate / fmDateShort from the design source.

const MASK = "••••••";
const MASK_SHORT = "••••";
const MASK_TINY = "••";

export interface FormatMoneyOptions {
  showSign?: boolean;
  masked?: boolean;
}

export function formatEUR(value: number, opts: FormatMoneyOptions = {}): string {
  const { showSign = false, masked = false } = opts;
  if (masked) return MASK;
  const abs = Math.abs(value);
  const s = abs.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Use the unicode minus (U+2212) for cleaner typography in tabular numerals.
  const sign = value < 0 ? "−" : showSign && value > 0 ? "+" : "";
  return `${sign}${s} €`;
}

export function formatEURCompact(value: number, opts: FormatMoneyOptions = {}): string {
  const { masked = false } = opts;
  if (masked) return MASK_SHORT;
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M €`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1000)}k €`;
  return formatEUR(value, opts);
}

export function formatPercent(value: number, masked = false): string {
  if (masked) return MASK_TINY;
  return `${Math.round(value * 100)}%`;
}

// Split a number into integer / fraction parts for hero display so the
// fraction can render in a muted tone.
export function splitForHero(
  value: number,
  masked = false,
): { integer: string; fraction: string; sign: string } {
  if (masked) return { integer: MASK, fraction: "", sign: "" };
  const abs = Math.abs(value);
  const s = abs.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const [integer, fraction = ""] = s.split(",");
  const sign = value < 0 ? "−" : "";
  return { integer, fraction: fraction ? `,${fraction}` : "", sign };
}
