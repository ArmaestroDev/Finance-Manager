import { Platform } from "react-native";
import { ImportQueueOverlay as MobileComponent } from "./mobile/ImportQueueOverlay";
import { ImportQueueOverlay as DesktopComponent } from "./desktop/ImportQueueOverlay";

export const ImportQueueOverlay = Platform.OS === "web" ? DesktopComponent : MobileComponent;
