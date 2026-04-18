import { Platform } from "react-native";
import { CashModal as MobileComponent } from "./mobile/CashModal";
import { CashModal as DesktopComponent } from "./desktop/CashModal";

export const CashModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
