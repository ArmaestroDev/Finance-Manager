import { Platform } from "react-native";
import { BalanceCard as MobileComponent } from "./mobile/BalanceCard";
import { BalanceCard as DesktopComponent } from "./desktop/BalanceCard";

export const BalanceCard = Platform.OS === "web" ? DesktopComponent : MobileComponent;
