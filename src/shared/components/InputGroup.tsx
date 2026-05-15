import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { InputGroup as MobileComponent } from "./mobile/InputGroup";
import { InputGroup as DesktopComponent } from "./desktop/InputGroup";

export const InputGroup = ((props: any) =>
  useIsMobileLayout() ? (
    <MobileComponent {...props} />
  ) : (
    <DesktopComponent {...props} />
  )) as typeof DesktopComponent;
