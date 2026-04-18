import { Platform } from "react-native";
import { AccountsScreen as MobileComponent } from "./mobile/AccountsScreen";
import { AccountsScreen as DesktopComponent } from "./desktop/AccountsScreen";

export const AccountsScreen = Platform.OS === "web" ? DesktopComponent : MobileComponent;
