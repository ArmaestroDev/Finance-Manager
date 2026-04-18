import { Platform } from "react-native";
import { InvestScreen as MobileComponent } from "./mobile/InvestScreen";
import { InvestScreen as DesktopComponent } from "./desktop/InvestScreen";

export const InvestScreen = Platform.OS === "web" ? DesktopComponent : MobileComponent;
