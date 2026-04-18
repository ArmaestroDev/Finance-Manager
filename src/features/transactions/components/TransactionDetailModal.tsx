import { Platform } from "react-native";
import { TransactionDetailModal as MobileComponent } from "./mobile/TransactionDetailModal";
import { TransactionDetailModal as DesktopComponent } from "./desktop/TransactionDetailModal";

export const TransactionDetailModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
