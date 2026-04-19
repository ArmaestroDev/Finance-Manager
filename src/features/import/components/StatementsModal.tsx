import { Platform } from "react-native";
import { StatementsModal as MobileComponent } from "./mobile/StatementsModal";
import { StatementsModal as DesktopComponent } from "./desktop/StatementsModal";

export const StatementsModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
