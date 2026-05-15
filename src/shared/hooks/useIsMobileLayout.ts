import { Platform, useWindowDimensions } from "react-native";

// The web build renders the mobile component tree when the viewport is at or
// below this width (covers phones and narrow/portrait tablets, and makes the
// browser devtools "mobile" mode show the real mobile UI). Above it, the
// polished desktop tree renders unchanged. Native is always mobile.
export const MOBILE_LAYOUT_MAX_WIDTH = 820;

// Single source of truth for the desktop⇄mobile layout decision. Re-evaluates
// on viewport resize, so resizing the browser (or toggling devtools device
// mode) live-swaps the component tree.
export function useIsMobileLayout(): boolean {
  const { width } = useWindowDimensions();
  if (Platform.OS !== "web") return true;
  return width <= MOBILE_LAYOUT_MAX_WIDTH;
}
