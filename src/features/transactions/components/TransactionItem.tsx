import { Platform } from "react-native";
import { TransactionItem as MobileComponent } from "./mobile/TransactionItem";
import { TransactionItem as DesktopComponent } from "./desktop/TransactionItem";

export const TransactionItem = Platform.OS === "web" ? DesktopComponent : MobileComponent;
