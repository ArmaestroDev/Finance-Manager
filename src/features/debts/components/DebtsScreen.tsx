import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { DebtsScreen as MobileComponent } from "./mobile/DebtsScreen";
import { DebtsScreen as DesktopComponent } from "./desktop/DebtsScreen";

// Responsive selector: mobile tree on native / narrow web, desktop otherwise.
export function DebtsScreen() {
  return useIsMobileLayout() ? <MobileComponent /> : <DesktopComponent />;
}
