import { useEffect, useRef, useMemo, type CSSProperties } from "react";
import { spectrum } from "../lib/spectrum";
import { parsePalette } from "../lib/libraryStore";

/* Deterministic blob layout presets — same album ⇒ same lava composition.
   dx/dy are the drift amplitude as a percentage of the *container*; they are
   converted to blob-relative percentages below so both the fullscreen player
   and the small Settings preview move by the same visible amount. */
const BLOB_PRESETS = [
  [
    { x: 22, y: 26, s: 46, d: 26, dx: 18, dy: -14 },
    { x: 74, y: 68, s: 38, d: 32, dx: -14, dy: 16 },
    { x: 58, y: 18, s: 30, d: 38, dx: -10, dy: 20 },
    { x: 30, y: 78, s: 34, d: 29, dx: 16, dy: -18 },
  ],
  [
    { x: 70, y: 24, s: 44, d: 30, dx: -16, dy: 12 },
    { x: 26, y: 62, s: 40, d: 35, dx: 12, dy: 18 },
    { x: 44, y: 84, s: 28, d: 27, dx: -18, dy: -12 },
    { x: 82, y: 74, s: 32, d: 36, dx: 10, dy: -16 },
  ],
  [
    { x: 18, y: 70, s: 42, d: 33, dx: 14, dy: -16 },
    { x: 78, y: 38, s: 36, d: 28, dx: -12, dy: 14 },
    { x: 52, y: 56, s: 46, d: 39, dx: 10, dy: -20 },
    { x: 36, y: 22, s: 26, d: 31, dx: -14, dy: 10 },
  ],
] as const;

/** How much faster the drift runs than the preset durations imply. */
const DRIFT_SCALE = 0.6;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Boost a palette color toward lamp-glow territory while keeping its hue. */
function glowColor(rgb: string, lift: number): string {
  const m = /rgb\((\d+) (\d+) (\d+)\)/.exec(rgb);
  if (!m) return rgb;
  const [r, g, b] = [+m[1], +m[2], +m[3]];
  const max = Math.max(r, g, b);
  if (max < 26) {
    // near-black entry — give it a faint deep tone instead of pure black
    return `rgb(${20 + lift * 10} ${16 + lift * 12} ${30 + lift * 18})`;
  }
  const f = (x: number) => Math.min(255, Math.round(x + (255 - x) * lift * 0.35 + lift * 14));
  return `rgb(${f(r)} ${f(g)} ${f(b)})`;
}

/**
 * A slow lava-lamp gradient built from an album's cover palette.
 *
 * Each blob is a drifting wrapper (pure CSS, cheap) around a core whose
 * scale/opacity are written directly by one rAF from the live spectrum, so
 * the lamp visibly breathes with the bass without relying on custom
 * properties inside @keyframes (unreliable in WKWebView).
 */
export default function LavaGradient({
  palette,
  seed = "",
  intensity = 1,
  active = false,
  shade = true,
  className = "",
}: {
  /** Cover palette "r,g,b|…" — falls back to an accent-tinted lamp. */
  palette?: string;
  /** Extra string to vary composition when no palette exists. */
  seed?: string;
  intensity?: number;
  /** When true, blobs breathe with the audio spectrum. */
  active?: boolean;
  /** Render the legibility vignette (recommended under text). */
  shade?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const coreRefs = useRef<(HTMLDivElement | null)[]>([]);

  const colors = useMemo(() => {
    const parsed = parsePalette(palette);
    if (parsed.length >= 3) return parsed;
    if (parsed.length > 0) {
      // stretch what we have with lifted variants
      return [parsed[0], glowColor(parsed[0], 0.6), glowColor(parsed[parsed.length - 1], 0.3)];
    }
    return [];
  }, [palette]);

  const base = colors.length ? undefined : "rgb(12 12 20)";

  const preset = BLOB_PRESETS[hash((palette ?? seed) || "crescendo") % BLOB_PRESETS.length];

  // Gentle audio coupling: one rAF, writes inline transform/opacity only.
  useEffect(() => {
    let raf = 0;
    let amp = 0;
    let last = 0;
    const loop = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
      last = now;
      const target =
        active && spectrum.playing ? Math.min(1, spectrum.bass * 1.1 + spectrum.energy * 0.35) : 0;
      amp += (target - amp) * (1 - Math.exp(-dt * (target > amp ? 14 : 3.5)));
      const cores = coreRefs.current;
      for (let i = 0; i < cores.length; i++) {
        const el = cores[i];
        if (!el) continue;
        el.style.transform = `scale(${(0.9 + amp * 0.34).toFixed(3)})`;
        el.style.opacity = (0.62 + amp * 0.34).toFixed(3);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const blobColors =
    colors.length >= 3
      ? [
          glowColor(colors[1], 0.25),
          glowColor(colors[0], 0.4),
          glowColor(colors[2] ?? colors[0], 0.2),
          glowColor(colors[colors.length - 1], 0.45),
        ]
      : [];

  const speed = Math.max(0.35, Math.min(1.5, intensity));
  const map = blobColors.map((c, i) => {
    const p = preset[i % preset.length];
    // Convert the container-relative amplitude into a blob-relative
    // percentage, since transform % resolves against the element's own size.
    const dx = ((p.dx * 100) / p.s).toFixed(1);
    const dy = ((p.dy * 100) / p.s).toFixed(1);
    return { c, p, dx, dy };
  });

  return (
    <div
      ref={rootRef}
      className={`lava ${className}`}
      style={
        {
          ...(base ? { background: base } : null),
          "--lava-speed": String(speed),
        } as CSSProperties
      }
      aria-hidden
    >
      {map.map(({ c, p, dx, dy }, i) => (
        <div
          key={i}
          className="lava-blob"
          style={
            {
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.s}%`,
              paddingBottom: `${p.s}%`,
              animationDuration: `${((p.d * DRIFT_SCALE) / speed).toFixed(1)}s`,
              animationDelay: `${(-(p.d * DRIFT_SCALE) / 3).toFixed(1)}s`,
              ["--dx" as string]: `${dx}%`,
              ["--dy" as string]: `${dy}%`,
            } as CSSProperties
          }
        >
          <div
            ref={(el) => {
              coreRefs.current[i] = el;
            }}
            className="lava-blob-core"
            style={{ background: `radial-gradient(closest-side, ${c}, transparent 72%)` }}
          />
        </div>
      ))}
      {colors.length === 0 && (
        <div className="lava-blob lava-blob-fallback">
          <div
            ref={(el) => {
              coreRefs.current[0] = el;
            }}
            className="lava-blob-core"
          />
        </div>
      )}
      {shade && <div className="lava-shade" />}
    </div>
  );
}
