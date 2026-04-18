import { Platform } from "react-native";
import { CategoryManageModal as MobileComponent } from "./mobile/CategoryManageModal";
import { CategoryManageModal as DesktopComponent } from "./desktop/CategoryManageModal";

export const CategoryManageModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
