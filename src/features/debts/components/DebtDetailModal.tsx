import { Platform } from "react-native";
import { DebtDetailModal as MobileComponent } from "./mobile/DebtDetailModal";
import { DebtDetailModal as DesktopComponent } from "./desktop/DebtDetailModal";

export const DebtDetailModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
