import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { DebtsScreen as MobileComponent } from "./mobile/DebtsScreen";
import { DebtsScreen as DesktopComponent } from "./desktop/DebtsScreen";

export const DebtsScreen = ((props: any) =>
  useIsMobileLayout() ? (
    <MobileComponent {...props} />
  ) : (
    <DesktopComponent {...props} />
  )) as typeof DesktopComponent;
