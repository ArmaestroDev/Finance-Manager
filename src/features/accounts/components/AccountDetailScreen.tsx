import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { AccountDetailScreen as MobileComponent } from "./mobile/AccountDetailScreen";
import { AccountDetailScreen as DesktopComponent } from "./desktop/AccountDetailScreen";

// Width-driven variant switch: narrow layouts (native, small browser windows)
// get the mobile screen, wide web windows the desktop one.
export function AccountDetailScreen() {
  return useIsMobileLayout() ? <MobileComponent /> : <DesktopComponent />;
}
