import { useMemo } from "react";

import { useCategories } from "../../transactions/context/CategoriesContext";
import { toApiDate } from "../../../shared/utils/date";

// Inclusive count of calendar months a UI date range (DD-MM-YYYY) spans.
// "01-03-2026"→"15-05-2026" = 3. Empty range (all-time) falls back to 1 so a
// monthly estimate is never multiplied by 0.
export function monthsInRange(fromUi?: string, toUi?: string): number {
  if (!fromUi || !toUi) return 1;
  const from = toApiDate(fromUi);
  const to = toApiDate(toUi);
  if (!from || !to) return 1;
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  if (!fy || !fm || !ty || !tm) return 1;
  const months = (ty - fy) * 12 + (tm - fm) + 1;
  return months > 0 ? months : 1;
}

// Reads per-category monthly estimates from CategoriesContext and exposes the
// total + whether any budget exists. Period scaling (e.g. ×N months for a
// total-over-range view) is left to the caller via `monthsInRange`, since the
// active view mode lives in the screen.
export function useCategoryBudgets() {
  const { categories, categoryBudgets, getCategoryEstimate } = useCategories();

  const budgetableCategories = useMemo(
    () => categories.filter((c) => c.system !== "ignore"),
    [categories],
  );

  const totalEstimate = useMemo(
    () =>
      budgetableCategories.reduce(
        (s, c) => s + getCategoryEstimate(c.id),
        0,
      ),
    // getCategoryEstimate is recreated when categoryBudgets changes.
    [budgetableCategories, getCategoryEstimate],
  );

  const hasAnyBudget = useMemo(
    () => Object.values(categoryBudgets).some((items) => items.length > 0),
    [categoryBudgets],
  );

  return {
    getEstimate: getCategoryEstimate,
    totalEstimate,
    hasAnyBudget,
    budgetableCategories,
  };
}
