import { create } from "zustand";

export type VizStyle = "orbs" | "aurora" | "rings";

const LS = "crescendo.ui.v1";

interface UIState {
  search: string;
  vizStyle: VizStyle;
  vizIntensity: number; // 0..1
  setSearch: (s: string) => void;
  setVizStyle: (s: VizStyle) => void;
  setVizIntensity: (v: number) => void;
}

function load(): Pick<UIState, "vizStyle" | "vizIntensity"> {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        vizStyle: p.vizStyle ?? "orbs",
        vizIntensity: typeof p.vizIntensity === "number" ? p.vizIntensity : 0.8,
      };
    }
  } catch {
    /* ignore */
  }
  return { vizStyle: "orbs", vizIntensity: 0.8 };
}

function persist(s: UIState) {
  localStorage.setItem(
    LS,
    JSON.stringify({ vizStyle: s.vizStyle, vizIntensity: s.vizIntensity }),
  );
}

export const useUI = create<UIState>((set, get) => ({
  search: "",
  ...load(),
  setSearch: (search) => set({ search }),
  setVizStyle: (vizStyle) => {
    set({ vizStyle });
    persist(get());
  },
  setVizIntensity: (vizIntensity) => {
    set({ vizIntensity });
    persist(get());
  },
}));
