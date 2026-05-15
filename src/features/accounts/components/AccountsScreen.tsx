import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { AccountsScreen as MobileComponent } from "./mobile/AccountsScreen";
import { AccountsScreen as DesktopComponent } from "./desktop/AccountsScreen";

export const AccountsScreen = ((props: any) =>
  useIsMobileLayout() ? (
    <MobileComponent {...props} />
  ) : (
    <DesktopComponent {...props} />
  )) as typeof DesktopComponent;
