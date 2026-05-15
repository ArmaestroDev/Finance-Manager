import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { AccountDetailScreen as MobileComponent } from "./mobile/AccountDetailScreen";
import { AccountDetailScreen as DesktopComponent } from "./desktop/AccountDetailScreen";

export const AccountDetailScreen = ((props: any) =>
  useIsMobileLayout() ? (
    <MobileComponent {...props} />
  ) : (
    <DesktopComponent {...props} />
  )) as typeof DesktopComponent;
