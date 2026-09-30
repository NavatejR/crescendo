import { useEffect, useState } from "react";
import type { OrbColorValues, OrbParamValues } from "../components/orbkit/orbkit-core";
import Shdr01 from "../components/orbkit/shdr-01";
import Shdr11 from "../components/orbkit/shdr-11";
import Shdr24 from "../components/orbkit/shdr-24";
import Shdr25 from "../components/orbkit/shdr-25";
import Shdr14 from "../components/orbkit/shdr-14";
import { useTheme } from "../theme/store";
import { SKINS, type VizStyle } from "../theme/skins";
import { usePlayer } from "../player/store";
import { subscribeAudioLevels } from "../lib/audioLevel";

/**
 * The visualizer orb per structural theme. Every overhaul gets its own
 * orbkit shader, tinted with the active skin's accent; the playbar mini orb
 * and fallback visuals use the default "orbs" shader (shdr-01).
 */
export const ORBS: Record<VizStyle, typeof Shdr01> = {
  orbs: Shdr01, // default — also the mini-orb / fallback
  minimal: Shdr11, // Minimalism → shdr-11
  glass: Shdr25, // Glassmorphism → shdr-25
  brutal: Shdr14, // Brutalism → shdr-14
  maximal: Shdr24, // Maximalism → shdr-24
};

/* ---------------- skin accent → orb colors ---------------- */

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shift(hex: string, mul: number, add = 0): string {
  const [r, g, b] = parseHex(hex);
  const f = (x: number) => Math.max(0, Math.min(255, Math.round(x * mul + add)));
  return `#${[f(r), f(g), f(b)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** The accent hex for the active theme: custom accent, else skin default. */
export function resolvedAccent(skin: string, accent: string): string {
  if (accent) return accent;
  return SKINS.find((s) => s.id === skin)?.swatch[1] ?? "#7cc4ff";
}

/** Skin-tinted per-orb color maps, cached by style+accent. */
const colorCache = new Map<string, OrbColorValues>();
function orbColors(style: VizStyle, accent: string): OrbColorValues {
  const key = `${style}|${accent}`;
  const hit = colorCache.get(key);
  if (hit) return hit;

  let m: OrbColorValues = {};
  switch (style) {
    case "minimal": // shdr-11 has no color uniforms — motion is param-driven
      break;
    case "glass": // shdr-25: tint / body / sheen
      m = { tint: shift(accent, 1.1), body: shift(accent, 0.12, 8), sheen: shift(accent, 1.25, 20) };
      break;
    case "brutal": // shdr-14: ink / paper
      m = { ink: shift(accent, 0.16, 4), paper: shift(accent, 1.35, 26) };
      break;
    case "maximal": {
      // shdr-24 terrain palette — pull the natural world toward the accent
      const [r, g, b] = parseHex(accent);
      const mix = (hex: string, amt: number, mul: number) => {
        const [r2, g2, b2] = parseHex(hex);
        const f = (a: number, c: number) => Math.max(0, Math.min(255, Math.round(a * mul + c * amt)));
        return `#${[f(r, r2), f(g, g2), f(b, b2)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
      };
      m = {
        grass: mix("#3e8f27", 0.55, 1.1),
        dirt: mix("#6f4a2f", 0.5, 0.9),
        stone: mix("#8a8a90", 0.45, 1.05),
        sand: mix("#dbcf9c", 0.5, 1.15),
        water: mix("#2f66d0", 0.7, 1.2),
        leaf: mix("#3e8f27", 0.6, 1.3),
        ore: shift(accent, 1.5, 30),
        lava: mix("#ff7b26", 0.4, 1.2),
      };
      break;
    }
    default: // shdr-01: single tint
      m = { tint: shift(accent, 1.08, 14) };
  }
  colorCache.set(key, m);
  return m;
}

/* ---------------- per-orb audio tuning ---------------- */

const PARAMS: Partial<Record<VizStyle, OrbParamValues>> = {
  orbs: { speed: 1.1, turb: 1.25, fill: 0.9, exposure: 1.05, alphaGain: 1.15 }, // shdr-01 nebula sheets
  minimal: { speed: 0.85, glow: 1.5, baseVis: 0.9, swell: 1.1 }, // shdr-11 star-field, calm
  glass: { speed: 1.2, swirl: 1.15, ripple: 1.3 }, // shdr-25 liquid refraction
  brutal: { speed: 1.35, gain: 1.3, contrast: 1.2, rim: 1.2 }, // shdr-14 punchy plasma
  maximal: { spin: 0.9, glow: 1.25, light: 1.2 }, // shdr-24 living terrain
};

export default function OrbViz({
  variant,
  size,
  intensity = 1,
  className,
  alwaysOn = false,
}: {
  /** Explicit orb; omit to follow the active overhaul. */
  variant?: VizStyle;
  size?: number;
  intensity?: number;
  className?: string;
  /** Keep visibly animating even when playback is stopped (previews). */
  alwaysOn?: boolean;
}) {
  const { skin, overhaul, accent } = useTheme();
  const playing = usePlayer((s) => s.status === "playing");
  const [levels, setLevels] = useState({ input: 0, output: 0 });

  useEffect(() => subscribeAudioLevels((l) => setLevels({ input: l.input, output: l.output })), []);

  const style = variant ?? overhaul;
  const Orb = ORBS[style] ?? Shdr01;
  const colors = orbColors(style, resolvedAccent(skin, accent));
  const params = PARAMS[style];

  // Idle base keeps the orb breathing gently when nothing is playing
  // (suppressed in passive settings previews so the grid stays calm).
  const base = playing ? 0 : alwaysOn ? 0.2 : 0.12;
  const volumes = {
    input: Math.min(1, base + levels.input * intensity),
    output: Math.min(1, base * 0.75 + levels.output * intensity),
  };

  return (
    <Orb
      className={className}
      size={size}
      state={playing ? "speaking" : "idle"}
      volumes={volumes}
      params={params}
      colors={colors}
      ariaLabel="Audio visualizer"
    />
  );
}
