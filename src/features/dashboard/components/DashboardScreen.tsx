import { Platform } from "react-native";
import { DashboardScreen as MobileComponent } from "./mobile/DashboardScreen";
import { DashboardScreen as DesktopComponent } from "./desktop/DashboardScreen";

export const DashboardScreen = Platform.OS === "web" ? DesktopComponent : MobileComponent;
