import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { DashboardScreen as MobileComponent } from "./mobile/DashboardScreen";
import { DashboardScreen as DesktopComponent } from "./desktop/DashboardScreen";

// Responsive selector: mobile tree on native / narrow web, desktop otherwise.
export function DashboardScreen() {
  return useIsMobileLayout() ? <MobileComponent /> : <DesktopComponent />;
}
