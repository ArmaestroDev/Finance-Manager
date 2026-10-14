import { useMemo } from "react";

import { roundCents } from "../../../shared/utils/number";
import { DebtEntity, useDebts } from "../context/DebtsContext";

export interface DebtsEntityWithBalance extends DebtEntity {
  /** Positive: they owe me. Negative: I owe them. */
  netBalance: number;
  /** Gross sum of this entity's "owes me" entries. */
  owesMe: number;
  /** Gross sum of this entity's "I owe" entries. */
  iOwe: number;
}

export interface DebtsSummary {
  entitiesWithBalance: DebtsEntityWithBalance[];
  topActiveEntities: DebtsEntityWithBalance[];
  totalNet: number;
  owedToYou: number;
  youOwe: number;
  activeCount: number;
  settledCount: number;
}

export function useDebtsSummary(): DebtsSummary {
  const { entities, debts, getNetBalance } = useDebts();

  const entitiesWithBalance = useMemo<DebtsEntityWithBalance[]>(() => {
    const gross = new Map<string, { owesMe: number; iOwe: number }>();
    for (const d of debts) {
      const g = gross.get(d.entityId) ?? { owesMe: 0, iOwe: 0 };
      if (d.type === "OWES_ME") g.owesMe += Number(d.amount) || 0;
      else g.iOwe += Number(d.amount) || 0;
      gross.set(d.entityId, g);
    }
    return entities.map((e) => {
      const g = gross.get(e.id);
      return {
        ...e,
        netBalance: getNetBalance(e.id),
        owesMe: roundCents(g?.owesMe ?? 0),
        iOwe: roundCents(g?.iOwe ?? 0),
      };
    });
  }, [entities, debts, getNetBalance]);

  const topActiveEntities = useMemo(
    () =>
      entitiesWithBalance
        .filter((e) => e.netBalance !== 0)
        .slice()
        .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance))
        .slice(0, 3),
    [entitiesWithBalance],
  );

  const totalNet = useMemo(
    () => entitiesWithBalance.reduce((acc, e) => acc + e.netBalance, 0),
    [entitiesWithBalance],
  );

  const owedToYou = useMemo(
    () =>
      entitiesWithBalance.reduce(
        (acc, e) => (e.netBalance > 0 ? acc + e.netBalance : acc),
        0,
      ),
    [entitiesWithBalance],
  );

  const youOwe = useMemo(
    () =>
      entitiesWithBalance.reduce(
        (acc, e) => (e.netBalance < 0 ? acc + e.netBalance : acc),
        0,
      ),
    [entitiesWithBalance],
  );

  const activeCount = useMemo(
    () => entitiesWithBalance.filter((e) => e.netBalance !== 0).length,
    [entitiesWithBalance],
  );

  const settledCount = useMemo(
    () => entitiesWithBalance.filter((e) => e.netBalance === 0 && (e.owesMe > 0 || e.iOwe > 0)).length,
    [entitiesWithBalance],
  );

  return {
    entitiesWithBalance,
    topActiveEntities,
    totalNet,
    owedToYou,
    youOwe,
    activeCount,
    settledCount,
  };
}
