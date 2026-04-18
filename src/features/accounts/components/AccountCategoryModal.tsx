import { Platform } from "react-native";
import { AccountCategoryModal as MobileComponent } from "./mobile/AccountCategoryModal";
import { AccountCategoryModal as DesktopComponent } from "./desktop/AccountCategoryModal";

export const AccountCategoryModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
