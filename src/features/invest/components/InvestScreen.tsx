import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { InvestScreen as MobileComponent } from "./mobile/InvestScreen";
import { InvestScreen as DesktopComponent } from "./desktop/InvestScreen";

export const InvestScreen = ((props: any) =>
  useIsMobileLayout() ? (
    <MobileComponent {...props} />
  ) : (
    <DesktopComponent {...props} />
  )) as typeof DesktopComponent;
