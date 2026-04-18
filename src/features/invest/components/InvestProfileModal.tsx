import { Platform } from "react-native";
import { InvestProfileModal as MobileComponent } from "./mobile/InvestProfileModal";
import { InvestProfileModal as DesktopComponent } from "./desktop/InvestProfileModal";

export const InvestProfileModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
