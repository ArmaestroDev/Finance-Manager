import React, { useState } from "react";
import { Platform, View } from "react-native";
import Svg, {
  Circle,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import { FMFonts } from "@/src/constants/theme";
import { formatDate, formatDateShort } from "@/src/shared/utils/date";
import { formatEUR } from "./format";
import { useFMTheme } from "./theme";

interface SparkProps {
  data: number[];
  /** Date strings aligned 1:1 with `data` (enables the date in the tooltip). */
  labels?: string[];
  width?: number;
  height?: number;
  neg?: boolean;
  color?: string;
  /** Enable hover (web) / touch-scrub (native) with a value+date tooltip. */
  interactive?: boolean;
  /**
   * Keep 0 inside the value domain, draw a zero baseline, and colour the line
   * green above / red below (with zero-crossing splits). For signed series
   * like net cash-flow so the sign is visible, not auto-scaled away.
   */
  zeroBaseline?: boolean;
  /** Format the tooltip value. Defaults to EUR. */
  formatValue?: (v: number) => string;
}

// Sparkline. Plain polyline by default (unchanged). When `interactive`, a
// hover (web) / drag (native) reveals a crosshair + a tooltip with the value
// and date at that point — drawn inside the SVG so it is never clipped by a
// parent card's `overflow: hidden`.
export function Spark({
  data,
  labels,
  width = 64,
  height = 20,
  neg = false,
  color,
  interactive = false,
  zeroBaseline = false,
  formatValue,
}: SparkProps) {
  const t = useFMTheme();
  const [hi, setHi] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const stroke = color ?? (neg ? t.neg : t.accent);

  // ── Plain (non-interactive) — byte-for-byte the original behavior ──
  if (!interactive || data.length < 2) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data
      .map((v, i) => {
        const x = (i / (data.length - 1 || 1)) * width;
        const y = height - ((v - min) / range) * (height - 2) - 1;
        return `${x},${y}`;
      })
      .join(" ");
    return (
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
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

  // ── Interactive ──
  const n = data.length;
  const TT = 20; // reserved tooltip band at the top
  const GAP = 4;
  const plotTop = TT + GAP;
  const totalH = plotTop + height;
  const fmt = formatValue ?? ((v: number) => formatEUR(v));

  const xAt = (i: number) => (i / (n - 1)) * width;

  let yAt: (v: number) => number;
  if (zeroBaseline) {
    // Diverging scale: 0 pinned to the vertical centre, positives mapped into
    // the upper half and negatives into the lower half independently. This
    // keeps the sign always readable — a small negative next to a large
    // positive still clearly sits below the zero baseline.
    const yTop = plotTop + 1;
    const yBot = plotTop + height - 1;
    const mid = (yTop + yBot) / 2;
    const half = (yBot - yTop) / 2 || 1;
    const maxPos = Math.max(0, ...data);
    const minNeg = Math.min(0, ...data);
    yAt = (v: number) =>
      v >= 0
        ? mid - (maxPos > 0 ? v / maxPos : 0) * half
        : mid + (minNeg < 0 ? v / minNeg : 0) * half;
  } else {
    const lo = Math.min(...data);
    const hiV = Math.max(...data);
    const span = hiV - lo || 1;
    yAt = (v: number) =>
      plotTop + (height - 2) - ((v - lo) / span) * (height - 2) + 1;
  }

  // Line geometry: a single polyline, or — for zeroBaseline — runs split at
  // zero crossings so each run can be coloured by sign.
  let lineEls: React.ReactNode;
  if (zeroBaseline) {
    const segs: { pos: boolean; pts: string[] }[] = [];
    let cur: { pos: boolean; pts: string[] } | null = null;
    for (let i = 0; i < n; i++) {
      const v = data[i];
      const pos = v >= 0;
      const x = xAt(i);
      const y = yAt(v);
      if (!cur) {
        cur = { pos, pts: [`${x},${y}`] };
        segs.push(cur);
        continue;
      }
      const prev = data[i - 1];
      if (prev >= 0 === pos) {
        cur.pts.push(`${x},${y}`);
      } else {
        // Interpolate the exact zero crossing between i-1 and i.
        const px = xAt(i - 1);
        const tt = prev / (prev - v || 1);
        const cx = px + (x - px) * tt;
        const cy = yAt(0);
        cur.pts.push(`${cx},${cy}`);
        cur = { pos, pts: [`${cx},${cy}`, `${x},${y}`] };
        segs.push(cur);
      }
    }
    lineEls = (
      <>
        <Line
          x1={0}
          y1={yAt(0)}
          x2={width}
          y2={yAt(0)}
          stroke={t.lineStrong}
          strokeWidth={1}
          strokeDasharray="2 3"
          opacity={0.7}
        />
        {segs.map((s, i) => (
          <Polyline
            key={i}
            points={s.pts.join(" ")}
            fill="none"
            stroke={s.pos ? t.pos : t.neg}
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
        ))}
      </>
    );
  } else {
    const points = data.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
    lineEls = (
      <Polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    );
  }

  const onMove = (clientX: number) => {
    const idx = Math.max(
      0,
      Math.min(n - 1, Math.round((clientX / width) * (n - 1))),
    );
    setHi(idx);
  };

  // Web hover handlers (react-native-web forwards these to the DOM node).
  const webHandlers: any =
    Platform.OS === "web"
      ? {
          onMouseMove: (e: any) =>
            onMove(e.nativeEvent?.offsetX ?? e.nativeEvent?.locationX ?? 0),
          onMouseLeave: () => setHi(null),
        }
      : {};

  // Native touch-scrub via the gesture responder system.
  const touchHandlers =
    Platform.OS === "web"
      ? {}
      : {
          onStartShouldSetResponder: () => true,
          onMoveShouldSetResponder: () => true,
          onResponderGrant: (e: any) => onMove(e.nativeEvent.locationX),
          onResponderMove: (e: any) => onMove(e.nativeEvent.locationX),
          onResponderRelease: () => setHi(null),
          onResponderTerminate: () => setHi(null),
        };

  let tip: React.ReactNode = null;
  if (hi != null) {
    const v = data[hi];
    const hx = xAt(hi);
    const dotColor = zeroBaseline ? (v >= 0 ? t.pos : t.neg) : stroke;
    const compact = width < 120;
    const dateStr = labels?.[hi]
      ? compact
        ? formatDateShort(labels[hi])
        : formatDate(labels[hi])
      : "";
    const label = dateStr ? `${dateStr} · ${fmt(v)}` : fmt(v);
    const fontSize = 9;
    const boxW = Math.min(
      width,
      Math.max(40, label.length * fontSize * 0.58 + 12),
    );
    const boxX = Math.max(0, Math.min(width - boxW, hx - boxW / 2));
    tip = (
      <>
        <Line
          x1={hx}
          y1={plotTop}
          x2={hx}
          y2={totalH}
          stroke={t.lineStrong}
          strokeWidth={1}
        />
        <Rect
          x={boxX}
          y={0}
          width={boxW}
          height={TT - 2}
          rx={4}
          fill={t.surface}
          stroke={t.lineStrong}
          strokeWidth={1}
        />
        <SvgText
          x={boxX + boxW / 2}
          y={TT / 2 + 2}
          fill={t.ink}
          fontSize={fontSize}
          fontFamily={FMFonts.sansMedium}
          textAnchor="middle"
        >
          {label}
        </SvgText>
        <Circle
          cx={hx}
          cy={yAt(v)}
          r={2.6}
          fill={dotColor}
          stroke={t.surface}
          strokeWidth={1.2}
        />
      </>
    );
  }

  return (
    <View
      style={{ width, height: totalH }}
      {...webHandlers}
      {...touchHandlers}
    >
      <Svg width={width} height={totalH} viewBox={`0 0 ${width} ${totalH}`}>
        {lineEls}
        {tip}
      </Svg>
    </View>
  );
}
