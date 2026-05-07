import React from "react";
import Svg, { Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";

import { useFMTheme } from "./theme";

export interface GrowthPoint {
  m?: number;
  value: number;
  contributed: number;
}

interface GrowthChartProps {
  data: GrowthPoint[];
  width?: number;
  height?: number;
  masked?: boolean;
}

// Dual-line growth chart (filled area for value, dashed line for contributions).
// Mirrors FMGrowthChart from the design source.
export function GrowthChart({ data, width = 320, height = 140, masked = false }: GrowthChartProps) {
  const t = useFMTheme();
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value));
  const min = 0;
  const range = max - min || 1;
  const w = width;
  const h = height;
  const px = (i: number) => (i / (data.length - 1)) * w;
  const py = (v: number) => h - ((v - min) / range) * (h - 8) - 4;

  const valueLine = data.map((d, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(d.value)}`).join(" ");
  const contribLine = data.map((d, i) => `${i === 0 ? "M" : "L"} ${px(i)} ${py(d.contributed)}`).join(" ");
  const valueArea = `${valueLine} L ${w} ${h} L 0 ${h} Z`;

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <LinearGradient id="fmgrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.accent} stopOpacity={0.18} />
          <Stop offset="1" stopColor={t.accent} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <Line
          key={f}
          x1={0}
          x2={w}
          y1={h * f}
          y2={h * f}
          stroke={t.line}
          strokeDasharray="2 3"
        />
      ))}
      <Path d={valueArea} fill="url(#fmgrad)" opacity={masked ? 0.3 : 1} />
      <Path
        d={contribLine}
        stroke={t.inkMuted}
        strokeWidth={1.25}
        fill="none"
        strokeDasharray="3 3"
        opacity={masked ? 0.3 : 0.85}
      />
      <Path d={valueLine} stroke={t.accent} strokeWidth={1.75} fill="none" opacity={masked ? 0.35 : 1} />
    </Svg>
  );
}
