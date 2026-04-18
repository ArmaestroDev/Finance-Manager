import { Platform } from "react-native";
import { BankSelectionModal as MobileComponent } from "./mobile/BankSelectionModal";
import { BankSelectionModal as DesktopComponent } from "./desktop/BankSelectionModal";

export const BankSelectionModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
