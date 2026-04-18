import { Platform } from "react-native";
import { StatsOverview as MobileComponent } from "./mobile/StatsOverview";
import { StatsOverview as DesktopComponent } from "./desktop/StatsOverview";

export const StatsOverview = Platform.OS === "web" ? DesktopComponent : MobileComponent;
