import type { Strings } from "@/src/constants/Strings";
import { parseLocaleNumber } from "@/src/shared/utils/number";
import type { Profile } from "../hooks/useInvestCalculator";

// Whole-euro amount ("12.500 €") for the simulator, where cents are noise.
export function formatWholeEUR(value: number): string {
  return `${Math.round(value).toLocaleString("de-DE")} €`;
}

// Final value of a saved scenario (monthly compounding, contribution at the
// start of each month) — the same model useInvestCalculator charts.
export function simulateProfileValue(p: Profile): number {
  const initial = parseLocaleNumber(p.initial) || 0;
  const monthly = parseLocaleNumber(p.monthly) || 0;
  const yrs = parseLocaleNumber(p.years) || 1;
  const rate = parseLocaleNumber(p.returnVal) || 0;
  const r = rate / 100 / 12;
  const months = yrs * 12;
  let value = initial;
  for (let i = 0; i < months; i++) value = (value + monthly) * (1 + r);
  return value;
}

// One-line scenario summary: "5.000 € · +200 €/mo · 20y · 7%".
export function profileSummary(p: Profile, i18n: typeof Strings.de): string {
  const initial = formatWholeEUR(parseLocaleNumber(p.initial) || 0);
  const monthly = formatWholeEUR(parseLocaleNumber(p.monthly) || 0);
  return `${initial} · +${monthly}${i18n.invest_per_month_short} · ${p.years}${i18n.invest_years_short} · ${(parseLocaleNumber(p.returnVal) || 0).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`;
}
