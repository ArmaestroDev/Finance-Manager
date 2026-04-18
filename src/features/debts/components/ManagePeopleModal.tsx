import { Platform } from "react-native";
import { ManagePeopleModal as MobileComponent } from "./mobile/ManagePeopleModal";
import { ManagePeopleModal as DesktopComponent } from "./desktop/ManagePeopleModal";

export const ManagePeopleModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
