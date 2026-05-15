import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { TransactionItem as MobileComponent } from "./mobile/TransactionItem";
import { TransactionItem as DesktopComponent } from "./desktop/TransactionItem";

export const TransactionItem = ((props: any) =>
  useIsMobileLayout() ? (
    <MobileComponent {...props} />
  ) : (
    <DesktopComponent {...props} />
  )) as typeof MobileComponent;
