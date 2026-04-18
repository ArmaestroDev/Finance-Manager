import { Platform } from "react-native";
import { EditTransactionModal as MobileComponent } from "./mobile/EditTransactionModal";
import { EditTransactionModal as DesktopComponent } from "./desktop/EditTransactionModal";

export const EditTransactionModal = Platform.OS === "web" ? DesktopComponent : MobileComponent;
