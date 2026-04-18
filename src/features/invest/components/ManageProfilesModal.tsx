import { Platform } from "react-native";
import { ManageProfilesModal as MobileComponent } from "./mobile/ManageProfilesModal";
import { ManageProfilesModal as DesktopComponent } from "./desktop/ManageProfilesModal";

export const ManageProfilesModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
