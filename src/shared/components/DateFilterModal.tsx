import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { DateFilterModal as MobileComponent } from "./mobile/DateFilterModal";
import { DateFilterModal as DesktopComponent } from "./desktop/DateFilterModal";

export const DateFilterModal = ((props: any) =>
  useIsMobileLayout() ? (
    <MobileComponent {...props} />
  ) : (
    <DesktopComponent {...props} />
  )) as typeof DesktopComponent;
