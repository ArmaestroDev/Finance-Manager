import React from "react";
import { useIsMobileLayout } from "@/src/shared/hooks/useIsMobileLayout";
import { ConnectionsScreen as MobileComponent } from "./mobile/ConnectionsScreen";
import { ConnectionsScreen as DesktopComponent } from "./desktop/ConnectionsScreen";

export const ConnectionsScreen = ((props: any) =>
  useIsMobileLayout() ? (
    <MobileComponent {...props} />
  ) : (
    <DesktopComponent {...props} />
  )) as typeof DesktopComponent;
