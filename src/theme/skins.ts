/* Skin & overhaul registries — the two axes of the theme system.
   Skins own IDENTITY (colors + fonts). Overhauls own STRUCTURE
   (radius, blur, borders, shadows, density). Any combination works. */

export type SkinId = "material" | "nothing" | "windows" | "oneui" | "liquid";
export type OverhaulId = "minimal" | "glass" | "liquid" | "brutal" | "maximal";

export interface SkinMeta {
  id: SkinId;
  name: string;
  tagline: string;
  /** Miniature palette used by the settings thumbnail */
  swatch: [string, string, string];
}

export interface OverhaulMeta {
  id: OverhaulId;
  name: string;
  tagline: string;
}

export const SKINS: SkinMeta[] = [
  { id: "material", name: "Material You", tagline: "Dynamic tonal · Roboto Flex", swatch: ["#131318", "#a8c8ff", "#e4e2ec"] },
  { id: "nothing", name: "NothingOS", tagline: "Dot-matrix · monochrome", swatch: ["#0a0a0a", "#ffffff", "#9b9b9b"] },
  { id: "windows", name: "Windows 11", tagline: "Mica neutrals · Fluent", swatch: ["#1c1e26", "#6cb8f6", "#eef0f6"] },
  { id: "oneui", name: "One UI", tagline: "Deep black · electric blue", swatch: ["#0c0e12", "#4d9fff", "#eff1f6"] },
  { id: "liquid", name: "Liquid Glass", tagline: "Chromatic · translucent", swatch: ["#0b0d16", "#9db8ff", "#f0f2fb"] },
];

export const OVERHAULS: OverhaulMeta[] = [
  { id: "minimal", name: "Minimalist", tagline: "Hairlines · quiet" },
  { id: "glass", name: "Glassmorphism", tagline: "Frosted · glowing" },
  { id: "liquid", name: "Liquid Glass", tagline: "Specular · Apple-style" },
  { id: "brutal", name: "Brutalism", tagline: "Raw · hard shadows" },
  { id: "maximal", name: "Maximalism", tagline: "Oversized · expressive" },
];

export const ACCENTS: { name: string; value: string }[] = [
  { name: "Skin default", value: "" },
  { name: "Nothing White", value: "#f5f5f5" },
  { name: "Ice Blue", value: "#7cc4ff" },
  { name: "One UI Blue", value: "#4d9fff" },
  { name: "Mint", value: "#7dffd4" },
  { name: "Lime", value: "#c8ff5e" },
  { name: "Amber", value: "#ffb454" },
  { name: "Coral", value: "#ff7a6e" },
  { name: "Magenta", value: "#ff6ad5" },
  { name: "Violet", value: "#a78bff" },
];
