import React from "react";
import Svg, { Polyline } from "react-native-svg";

import { useFMTheme } from "./theme";

interface SparkProps {
  data: number[];
  width?: number;
  height?: number;
  neg?: boolean;
  color?: string;
}

// Sparkline — used in account rows. Plain polyline, no fill, no axes.
export function Spark({ data, width = 64, height = 20, neg = false, color }: SparkProps) {
  const t = useFMTheme();
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = width;
  const h = height;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");
  const stroke = color ?? (neg ? t.neg : t.accent);
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </Svg>
  );
}
