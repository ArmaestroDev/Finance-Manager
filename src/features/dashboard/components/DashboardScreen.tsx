import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { DashboardScreen as MobileComponent } from "./mobile/DashboardScreen";
import { DashboardScreen as DesktopComponent } from "./desktop/DashboardScreen";

// Responsive selector: mobile tree on native / narrow web, desktop otherwise.
// Internal forwarding is untyped; the cast preserves the public prop contract
// so consumers keep full type-checking.
export const DashboardScreen = ((props: any) =>
  useIsMobileLayout() ? (
    <MobileComponent {...props} />
  ) : (
    <DesktopComponent {...props} />
  )) as typeof DesktopComponent;
