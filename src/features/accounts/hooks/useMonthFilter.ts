import { useEffect, useMemo, useState } from "react";

import type { Transaction } from "@/src/services/enableBanking";
import { useDateFilter } from "@/src/shared/context/DateFilterContext";
import { useSettings } from "@/src/shared/context/SettingsContext";
import { localeFor, monthKeysInRange } from "@/src/shared/utils/date";

/**
 * Month chips for the account detail screen, like the dashboard's
 * "Where it went" selector: "total" shows the whole date range, a
 * "YYYY-MM" key narrows stats, category overview and list to that month.
 */
export function useMonthFilter(transactions: Transaction[]) {
  const { language } = useSettings();
  const { filterDateFrom, filterDateTo } = useDateFilter();
  const [month, setMonth] = useState("total");
  const locale = localeFor(language);

  const monthChips = useMemo(() => {
    const keys = monthKeysInRange(filterDateFrom, filterDateTo);
    const sameYear = keys.every((k) => k.slice(0, 4) === keys[0]?.slice(0, 4));
    return keys.map((key) => {
      const [y, m] = key.split("-").map(Number);
      return {
        key,
        label: new Date(y, m - 1, 1).toLocaleDateString(locale, {
          month: "short",
          ...(sameYear ? {} : { year: "2-digit" }),
        }),
      };
    });
  }, [filterDateFrom, filterDateTo, locale]);

  const showSelector = monthChips.length > 1;

  // A new date range may not contain the picked month anymore.
  useEffect(() => {
    if (month !== "total" && !monthChips.some((c) => c.key === month)) setMonth("total");
  }, [monthChips, month]);

  const monthTransactions = useMemo(() => {
    if (!showSelector || month === "total") return transactions;
    return transactions.filter(
      (tx) => (tx.booking_date || tx.value_date || "").slice(0, 7) === month,
    );
  }, [transactions, month, showSelector]);

  return { month, setMonth, monthChips, showSelector, monthTransactions };
}
