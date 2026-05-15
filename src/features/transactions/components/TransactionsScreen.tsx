import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { TransactionsScreen as MobileComponent } from "./mobile/TransactionsScreen";
import { TransactionsScreen as DesktopComponent } from "./desktop/TransactionsScreen";

export const TransactionsScreen = ((props: any) =>
  useIsMobileLayout() ? (
    <MobileComponent {...props} />
  ) : (
    <DesktopComponent {...props} />
  )) as typeof DesktopComponent;
