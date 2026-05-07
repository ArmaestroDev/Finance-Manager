import React from "react";
import Svg, {
  Circle,
  Ellipse,
  Line,
  Path,
  Polyline,
  Rect,
  G,
} from "react-native-svg";

import { useFMTheme } from "./theme";

// Single-stroke 16px-grid icons. Pair color-by-default with the current theme's ink.
// Names match FMIcons from the design source, plus a few extras the existing app
// needs (eye/eyeOff, ai). All icons are 16x16 viewBox; pass `size` to scale.

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function useIconColor(color?: string): string {
  const t = useFMTheme();
  return color ?? t.ink;
}

const SW = 1.4;
const SW_BOLD = 1.6;

export function IconSearch({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx="7" cy="7" r="4.5" stroke={c} strokeWidth={strokeWidth} />
      <Path d="M10.5 10.5L14 14" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconPlus({ size = 14, color, strokeWidth = SW_BOLD }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M8 3v10M3 8h10" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconClose({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M4 4l8 8M12 4l-8 8" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconChevR({ size = 12, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path d="M4.5 2.5L8 6 4.5 9.5" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconChevD({ size = 12, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path d="M2.5 4.5L6 8l3.5-3.5" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconBack({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M9.5 3.5L5 8l4.5 4.5" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconFilter({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M2 4h12M4 8h8M6 12h4" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconRefresh({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M13 4v3h-3M3 12V9h3" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12.5 9a5 5 0 0 1-9-2M3.5 7a5 5 0 0 1 9 2" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconMore({ size = 14, color }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Circle cx="3" cy="8" r="1.3" fill={c} />
      <Circle cx="8" cy="8" r="1.3" fill={c} />
      <Circle cx="13" cy="8" r="1.3" fill={c} />
    </Svg>
  );
}

export function IconBank({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M2 6L8 3l6 3M3 6v6M13 6v6M6 7v4M10 7v4M2 13h12"
        stroke={c}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconCard({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Rect x="2" y="4" width="12" height="9" rx="1.5" stroke={c} strokeWidth={strokeWidth} />
      <Path d="M2 7h12" stroke={c} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconCoins({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Ellipse cx="8" cy="5" rx="5" ry="2" stroke={c} strokeWidth={strokeWidth} />
      <Path
        d="M3 5v3c0 1.1 2.2 2 5 2s5-.9 5-2V5M3 8v3c0 1.1 2.2 2 5 2s5-.9 5-2V8"
        stroke={c}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

export function IconTrend({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M2 11l4-4 3 2 5-5M10 4h3v3"
        stroke={c}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconLink({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M7 9a2.5 2.5 0 0 0 3.5 0l2-2a2.5 2.5 0 0 0-3.5-3.5L8 4.5"
        stroke={c}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M9 7a2.5 2.5 0 0 0-3.5 0l-2 2a2.5 2.5 0 0 0 3.5 3.5L8 11.5"
        stroke={c}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconPeople({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx="6" cy="6" r="2.4" stroke={c} strokeWidth={strokeWidth} />
      <Path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="11" cy="5.5" r="1.8" stroke={c} strokeWidth={strokeWidth} />
      <Path d="M10 9c2 0 4 1.5 4 4" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconCog({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx="8" cy="8" r="2" stroke={c} strokeWidth={strokeWidth} />
      <Path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3"
        stroke={c}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconEye({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M2 8c1.8-3.2 8.2-3.2 12 0-3.8 3.2-10.2 3.2-12 0z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Circle cx="8" cy="8" r="2" stroke={c} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconEyeOff({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M2 8c1.8-3.2 8.2-3.2 12 0-3.8 3.2-10.2 3.2-12 0z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Circle cx="8" cy="8" r="2" stroke={c} strokeWidth={strokeWidth} />
      <Path d="M2 14L14 2" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconAI({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 2l1.2 3.2L12.5 6.5l-3.3 1.3L8 11l-1.2-3.2L3.5 6.5l3.3-1.3L8 2z"
        stroke={c}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path
        d="M13 11l.5 1.5L15 13l-1.5.5L13 15l-.5-1.5L11 13l1.5-.5z"
        stroke={c}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconUpload({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M8 11V3M5 6l3-3 3 3M3 13h10" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconDoc({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M3 2h6l4 4v8H3V2z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M9 2v4h4M5 9h6M5 11h6" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconTrash({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M3 4h10M6 4V2.5h4V4M5 4l.5 9h5L11 4M7 7v4M9 7v4"
        stroke={c}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconEdit({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M11 2l3 3-8 8H3v-3l8-8z" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

export function IconCheck({ size = 14, color, strokeWidth = SW_BOLD }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M3 8.5L6.5 12 13 4" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconWarn({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 2L1 14h14L8 2zM8 7v3M8 12v.5"
        stroke={c}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconSliders({ size = 14, color, strokeWidth = SW }: IconProps) {
  const c = useIconColor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M3 4h6M11 4h2M3 12h2M7 12h6" stroke={c} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="10" cy="4" r="1.4" fill={c} />
      <Circle cx="6" cy="12" r="1.4" fill={c} />
    </Svg>
  );
}

// A flat object that mirrors `FMIcons` from the design source for parity with
// the JSX reference. Use the named components above when you want explicit imports.
export const FMIcons = {
  search: (props?: IconProps) => <IconSearch {...props} />,
  plus: (props?: IconProps) => <IconPlus {...props} />,
  close: (props?: IconProps) => <IconClose {...props} />,
  chevR: (props?: IconProps) => <IconChevR {...props} />,
  chevD: (props?: IconProps) => <IconChevD {...props} />,
  back: (props?: IconProps) => <IconBack {...props} />,
  filter: (props?: IconProps) => <IconFilter {...props} />,
  refresh: (props?: IconProps) => <IconRefresh {...props} />,
  more: (props?: IconProps) => <IconMore {...props} />,
  sliders: (props?: IconProps) => <IconSliders {...props} />,
  bank: (props?: IconProps) => <IconBank {...props} />,
  card: (props?: IconProps) => <IconCard {...props} />,
  coins: (props?: IconProps) => <IconCoins {...props} />,
  trend: (props?: IconProps) => <IconTrend {...props} />,
  link: (props?: IconProps) => <IconLink {...props} />,
  people: (props?: IconProps) => <IconPeople {...props} />,
  cog: (props?: IconProps) => <IconCog {...props} />,
  eye: (props?: IconProps) => <IconEye {...props} />,
  eyeOff: (props?: IconProps) => <IconEyeOff {...props} />,
  ai: (props?: IconProps) => <IconAI {...props} />,
  upload: (props?: IconProps) => <IconUpload {...props} />,
  doc: (props?: IconProps) => <IconDoc {...props} />,
  trash: (props?: IconProps) => <IconTrash {...props} />,
  edit: (props?: IconProps) => <IconEdit {...props} />,
  check: (props?: IconProps) => <IconCheck {...props} />,
  warn: (props?: IconProps) => <IconWarn {...props} />,
};
