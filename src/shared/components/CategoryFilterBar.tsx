import { Platform } from "react-native";
import { CategoryFilterBar as MobileComponent } from "./mobile/CategoryFilterBar";
import { CategoryFilterBar as DesktopComponent } from "./desktop/CategoryFilterBar";

export const CategoryFilterBar = Platform.OS === "web" ? DesktopComponent : MobileComponent;
