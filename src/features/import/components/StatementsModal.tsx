import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { StatementsModal as MobileComponent } from "./mobile/StatementsModal";
import { StatementsModal as DesktopComponent } from "./desktop/StatementsModal";

export const StatementsModal = ((props: any) =>
  useIsMobileLayout() ? (
    <MobileComponent {...props} />
  ) : (
    <DesktopComponent {...props} />
  )) as typeof DesktopComponent;
