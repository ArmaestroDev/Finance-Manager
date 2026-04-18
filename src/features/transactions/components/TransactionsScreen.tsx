import { Platform } from "react-native";
import { TransactionsScreen as MobileComponent } from "./mobile/TransactionsScreen";
import { TransactionsScreen as DesktopComponent } from "./desktop/TransactionsScreen";

export const TransactionsScreen = Platform.OS === "web" ? DesktopComponent : MobileComponent;
