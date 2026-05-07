import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

import { useFMTheme } from "./theme";

export interface DonutSlice {
  amount: number;
  color: string;
  id?: string;
}

interface DonutProps {
  slices: DonutSlice[];
  size?: number;
  thick?: number;
  masked?: boolean;
}

// Donut for category breakdown. Pure SVG arcs, no animation.
// Mirrors FMDonut from the design source.
export function Donut({ slices, size = 180, thick = 22, masked = false }: DonutProps) {
  const t = useFMTheme();
  if (!slices || slices.length === 0) return null;

  const total = slices.reduce((s, x) => s + Math.max(0, x.amount), 0);
  if (total <= 0) {
    // Empty — render the inner ring only so we still occupy space.
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={(size - thick) / 2} fill="none" stroke={t.surfaceAlt} strokeWidth={thick} />
      </Svg>
    );
  }

  const r = (size - thick) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const polar = (deg: number): [number, number] => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  let acc = 0;
  const arcs: { d: string; fill: string }[] = [];

  slices.forEach((s, i) => {
    if (s.amount <= 0) return;
    const frac = s.amount / total;
    const start = acc * 360;
    const end = (acc + frac) * 360;
    acc += frac;
    // Special-case a full circle (single slice == 100%).
    if (slices.length === 1 || frac >= 0.999) {
      // Two semicircle arcs to draw a closed donut wedge.
      const [x1, y1] = polar(0);
      const [x2, y2] = polar(180);
      arcs.push({
        d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2} A ${r} ${r} 0 1 1 ${x1} ${y1} Z`,
        fill: s.color,
      });
      return;
    }
    const [x1, y1] = polar(start);
    const [x2, y2] = polar(end);
    const large = end - start > 180 ? 1 : 0;
    arcs.push({
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
      fill: s.color,
    });
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((a, i) => (
        <Path key={i} d={a.d} fill={a.fill} opacity={masked ? 0.35 : 1} />
      ))}
      <Circle cx={cx} cy={cy} r={r - thick / 2} fill={t.surface} />
    </Svg>
  );
}
