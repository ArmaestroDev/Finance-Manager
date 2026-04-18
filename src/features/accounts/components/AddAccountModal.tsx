import { Platform } from "react-native";
import { AddAccountModal as MobileComponent } from "./mobile/AddAccountModal";
import { AddAccountModal as DesktopComponent } from "./desktop/AddAccountModal";

export const AddAccountModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
