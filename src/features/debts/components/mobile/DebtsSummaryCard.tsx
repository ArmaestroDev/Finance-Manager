import React from "react";

import { DebtsSummaryCard as BaseCard } from "../desktop/DebtsSummaryCard";

// Mobile metrics of the shared dashboard debts card.
export function DebtsSummaryCard(props: Omit<React.ComponentProps<typeof BaseCard>, "compact">) {
  return <BaseCard {...props} compact />;
}
