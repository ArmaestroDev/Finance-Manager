import { Platform } from "react-native";
import { AddDebtModal as MobileComponent } from "./mobile/AddDebtModal";
import { AddDebtModal as DesktopComponent } from "./desktop/AddDebtModal";

export const AddDebtModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
