import { create } from "zustand";
import { SKINS, OVERHAULS, type SkinId, type OverhaulId } from "./skins";

const LS_KEY = "crescendo.theme.v1";

interface ThemeState {
  skin: SkinId;
  overhaul: OverhaulId;
  /** "" = use the skin's native accent */
  accent: string;
  setSkin: (s: SkinId) => void;
  setOverhaul: (o: OverhaulId) => void;
  setAccent: (a: string) => void;
}

function load(): Pick<ThemeState, "skin" | "overhaul" | "accent"> {
  const skinIds = SKINS.map((s) => s.id);
  const overhaulIds = OVERHAULS.map((o) => o.id);
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<ThemeState>;
      // "liquid" was merged into "glass" (same idea, one overhaul).
      const storedOverhaul = (p.overhaul as string) === "liquid" ? "glass" : p.overhaul;
      return {
        skin: skinIds.includes(p.skin as SkinId) ? (p.skin as SkinId) : "material",
        overhaul: overhaulIds.includes(storedOverhaul as OverhaulId)
          ? (storedOverhaul as OverhaulId)
          : "glass",
        accent: p.accent ?? "",
      };
    }
  } catch {
    /* ignore corrupted state */
  }
  return { skin: "material", overhaul: "glass", accent: "" };
}

/** Write theme state onto the document root so all CSS tokens re-resolve. */
export function applyTheme(skin: SkinId, overhaul: OverhaulId, accent: string) {
  const root = document.documentElement;
  root.dataset.skin = skin;
  root.dataset.overhaul = overhaul;
  if (accent) {
    root.style.setProperty("--accent", accent);
    const n = hexToRgb(accent);
    if (n) root.style.setProperty("--accent-rgb", `${n[0]} ${n[1]} ${n[2]}`);
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-rgb");
  }
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

function persist(s: ThemeState) {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({ skin: s.skin, overhaul: s.overhaul, accent: s.accent }),
  );
}

export const useTheme = create<ThemeState>((set, get) => ({
  ...load(),
  setSkin: (skin) => {
    set({ skin });
    applyTheme(skin, get().overhaul, get().accent);
    persist(get());
  },
  setOverhaul: (overhaul) => {
    set({ overhaul });
    applyTheme(get().skin, overhaul, get().accent);
    persist(get());
  },
  setAccent: (accent) => {
    set({ accent });
    applyTheme(get().skin, get().overhaul, accent);
    persist(get());
  },
}));
