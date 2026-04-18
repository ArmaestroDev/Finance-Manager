import { Platform } from "react-native";
import { ConnectionsScreen as MobileComponent } from "./mobile/ConnectionsScreen";
import { ConnectionsScreen as DesktopComponent } from "./desktop/ConnectionsScreen";

export const ConnectionsScreen = Platform.OS === "web" ? DesktopComponent : MobileComponent;
