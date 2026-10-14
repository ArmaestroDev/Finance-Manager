import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { ConnectionsScreen as MobileComponent } from "./mobile/ConnectionsScreen";
import { ConnectionsScreen as DesktopComponent } from "./desktop/ConnectionsScreen";

// Width-driven variant switch: narrow layouts (native, small browser windows)
// get the mobile screen, wide web windows the desktop one.
export function ConnectionsScreen() {
  return useIsMobileLayout() ? <MobileComponent /> : <DesktopComponent />;
}
