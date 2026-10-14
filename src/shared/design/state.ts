import { FMState } from "@/src/constants/theme";

// M3 state layers. React Native has no CSS overlay, so the layer is baked
// into the container colour: container ⊕ (content colour at state opacity).

/** Pressable interaction state; `hovered`/`focused` are supplied by react-native-web. */
export type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

function parse(c: string): [number, number, number, number] | null {
  if (c.startsWith("#")) {
    const h = c.slice(1);
    const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    const n = parseInt(full.slice(0, 6), 16);
    const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b, a = "1"] = m[1].split(",").map((s) => s.trim());
    return [Number(r), Number(g), Number(b), Number(a)];
  }
  return null;
}

/** Overlay `over` at `alpha` on top of `base` ("transparent" allowed). */
export function mix(base: string, over: string, alpha: number): string {
  const o = parse(over);
  if (!o) return base;
  const b = base === "transparent" ? null : parse(base);
  if (!b || b[3] === 0) {
    return `rgba(${o[0]}, ${o[1]}, ${o[2]}, ${alpha})`;
  }
  const ch = (i: number) => Math.round(b[i] * (1 - alpha) + o[i] * alpha);
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
}

/** `color` at the given opacity, as rgba(). */
export function alpha(color: string, a: number): string {
  const p = parse(color);
  return p ? `rgba(${p[0]}, ${p[1]}, ${p[2]}, ${a})` : color;
}

/** Container colour for the current interaction state. */
export function stateColor(base: string, content: string, s: PressState): string {
  const a = s.pressed ? FMState.pressed : s.hovered ? FMState.hover : s.focused ? FMState.focus : 0;
  return a ? mix(base, content, a) : base;
}
