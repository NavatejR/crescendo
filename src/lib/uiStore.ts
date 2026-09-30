import { create } from "zustand";

const LS = "crescendo.ui.v1";

interface UIState {
  search: string;
  /** Visualizer intensity 0.2..1.5. The shader itself follows the overhaul. */
  vizIntensity: number;
  setSearch: (s: string) => void;
  setVizIntensity: (v: number) => void;
}

function load(): Pick<UIState, "vizIntensity"> {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) {
      const p = JSON.parse(raw);
      // `vizStyle` from older builds is intentionally dropped — the orb
      // shader now follows the active overhaul instead of a picker.
      return {
        vizIntensity: typeof p.vizIntensity === "number" ? p.vizIntensity : 0.8,
      };
    }
  } catch {
    /* ignore */
  }
  return { vizIntensity: 0.8 };
}

function persist(s: UIState) {
  localStorage.setItem(LS, JSON.stringify({ vizIntensity: s.vizIntensity }));
}

export const useUI = create<UIState>((set, get) => ({
  search: "",
  ...load(),
  setSearch: (search) => set({ search }),
  setVizIntensity: (vizIntensity) => {
    set({ vizIntensity });
    persist(get());
  },
}));
