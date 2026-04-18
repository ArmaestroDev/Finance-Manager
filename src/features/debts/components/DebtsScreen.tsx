import { Platform } from "react-native";
import { DebtsScreen as MobileComponent } from "./mobile/DebtsScreen";
import { DebtsScreen as DesktopComponent } from "./desktop/DebtsScreen";

export const DebtsScreen = Platform.OS === "web" ? DesktopComponent : MobileComponent;
