import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { InvestScreen as MobileComponent } from "./mobile/InvestScreen";
import { InvestScreen as DesktopComponent } from "./desktop/InvestScreen";

// Responsive selector: mobile tree on native / narrow web, desktop otherwise.
export function InvestScreen() {
  return useIsMobileLayout() ? <MobileComponent /> : <DesktopComponent />;
}
