import { Platform } from "react-native";
import { InputGroup as MobileComponent } from "./mobile/InputGroup";
import { InputGroup as DesktopComponent } from "./desktop/InputGroup";

export const InputGroup = Platform.OS === "web" ? DesktopComponent : MobileComponent;
