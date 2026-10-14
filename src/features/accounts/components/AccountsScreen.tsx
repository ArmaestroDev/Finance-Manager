import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { AccountsScreen as MobileComponent } from "./mobile/AccountsScreen";
import { AccountsScreen as DesktopComponent } from "./desktop/AccountsScreen";

// Width-driven variant switch: narrow layouts (native, small browser windows)
// get the mobile screen, wide web windows the desktop one.
export function AccountsScreen() {
  return useIsMobileLayout() ? <MobileComponent /> : <DesktopComponent />;
}
