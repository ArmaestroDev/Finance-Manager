import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";

import { useFMTheme } from "./theme";

// Material-style icons (Material Design Icons font, outlined set; filled
// variants for selected states such as the active navigation destination).
// Names are kept stable from the old custom SVG set so call sites don't change.
// `size` is the box the icon used to occupy; the glyph is drawn slightly larger
// because Material glyphs keep a 2/24 safety margin.

export interface IconProps {
  size?: number;
  color?: string;
  /** Use the filled variant (active nav destinations, selected states). */
  filled?: boolean;
  /** Ignored — kept for call-site compatibility with the old stroke icons. */
  strokeWidth?: number;
}

type GlyphName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const SCALE = 1.15;

function make(outline: GlyphName, filled: GlyphName = outline, defaultSize = 14) {
  function Icon({ size = defaultSize, color, filled: isFilled }: IconProps) {
    const t = useFMTheme();
    const box = Math.round(size * SCALE);
    return (
      <MaterialCommunityIcons
        name={isFilled ? filled : outline}
        size={box}
        color={color ?? t.ink}
        style={{ width: box, height: box, lineHeight: box, textAlign: "center" }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    );
  }
  return Icon;
}

export const IconSearch = make("magnify");
export const IconPlus = make("plus");
export const IconClose = make("close");
export const IconChevR = make("chevron-right", "chevron-right", 12);
export const IconChevL = make("chevron-left", "chevron-left", 12);
export const IconChevD = make("chevron-down", "chevron-down", 12);
export const IconBack = make("arrow-left");
export const IconFilter = make("filter-variant");
export const IconRefresh = make("refresh");
export const IconMore = make("dots-vertical");
export const IconBank = make("bank-outline", "bank");
export const IconCard = make("credit-card-outline", "credit-card");
export const IconCoins = make("chart-areaspline", "chart-areaspline");
export const IconTrend = make("view-dashboard-outline", "view-dashboard");
export const IconHome = make("home-outline", "home");
export const IconLink = make("link-variant");
export const IconPeople = make("account-multiple-outline", "account-multiple");
export const IconCog = make("cog-outline", "cog");
export const IconEye = make("eye-outline", "eye");
export const IconEyeOff = make("eye-off-outline", "eye-off");
export const IconAI = make("creation-outline", "creation");
export const IconUpload = make("tray-arrow-up");
export const IconDoc = make("file-document-outline", "file-document");
export const IconTrash = make("delete-outline", "delete");
export const IconEdit = make("pencil-outline", "pencil");
export const IconCheck = make("check");
export const IconWarn = make("alert-circle-outline", "alert-circle");
export const IconSliders = make("tune-variant");
export const IconInfo = make("information-outline", "information");
export const IconCalendar = make("calendar-blank-outline", "calendar-blank");
export const IconWallet = make("wallet-outline", "wallet");
export const IconCash = make("cash-multiple");
export const IconSwap = make("swap-horizontal");
export const IconArrowUp = make("arrow-up");
export const IconArrowDown = make("arrow-down");
export const IconPerson = make("account-outline", "account");
export const IconOpen = make("open-in-new");
export const IconLinkOff = make("link-variant-off");
export const IconArrowR = make("arrow-right");
