import { Platform } from "react-native";
import { DateFilterModal as MobileComponent } from "./mobile/DateFilterModal";
import { DateFilterModal as DesktopComponent } from "./desktop/DateFilterModal";

export const DateFilterModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
