import { Platform } from "react-native";
import { AddTransactionModal as MobileComponent } from "./mobile/AddTransactionModal";
import { AddTransactionModal as DesktopComponent } from "./desktop/AddTransactionModal";

export const AddTransactionModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
