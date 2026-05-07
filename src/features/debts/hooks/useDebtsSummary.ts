import { useMemo } from "react";

import { DebtEntity, useDebts } from "../context/DebtsContext";

export interface DebtsEntityWithBalance extends DebtEntity {
  netBalance: number;
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

  const entitiesWithBalance = useMemo<DebtsEntityWithBalance[]>(
    () => entities.map((e) => ({ ...e, netBalance: getNetBalance(e.id) })),
    [entities, debts, getNetBalance],
  );

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
    () => entitiesWithBalance.filter((e) => e.netBalance === 0).length,
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
