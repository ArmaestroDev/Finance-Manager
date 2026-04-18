import { Platform } from "react-native";
import { AccountDetailScreen as MobileComponent } from "./mobile/AccountDetailScreen";
import { AccountDetailScreen as DesktopComponent } from "./desktop/AccountDetailScreen";

export const AccountDetailScreen = Platform.OS === "web" ? DesktopComponent : MobileComponent;
