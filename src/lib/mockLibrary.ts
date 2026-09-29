import type { Album, Track } from "./types";

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Deterministic generated cover gradients per album id. */
function grad(hue: number, style: number): string {
  const a = `hsl(${hue} 80% 62%)`;
  const b = `hsl(${(hue + 40) % 360} 70% 45%)`;
  const c = `hsl(${(hue + 200) % 360} 60% 30%)`;
  if (style === 0) return `radial-gradient(120% 120% at 20% 15%, ${a}, ${b} 60%, ${c})`;
  if (style === 1) return `linear-gradient(135deg, ${a}, ${b} 55%, ${c})`;
  if (style === 2) return `radial-gradient(100% 100% at 80% 80%, ${a}, ${b} 45%, ${c})`;
  return `conic-gradient(from 210deg at 50% 50%, ${a}, ${b}, ${c}, ${a})`;
}

const ALBUM_DEFS: [string, string, number, number][] = [
  // title, artist, year, hue
  ["Analog Dreams", "Nova Vale", 2024, 210],
  ["Static Bloom", "Glass Meridian", 2023, 280],
  ["Night Signal", "Vektor Youth", 2025, 160],
  ["Paper Cathedrals", "Ilse Marlowe", 2022, 30],
  ["Ultraviolet Gardens", "Halcyon Drift", 2025, 320],
  ["Concrete Sunrise", "Brutal Pigeon", 2021, 15],
  ["Liquid Architecture", "Solveig", 2024, 190],
  ["Dot Matrix Serenade", "NULLWAVE", 2023, 0],
  ["Slow Magma", "The Kiln", 2020, 45],
  ["Phantom Frequencies", "Aria Kolb", 2025, 250],
];

const TRACK_TITLE_POOL = [
  "First Light", "Undertow", "Parallax", "Neon Rue", "Slow Orbit",
  "Glasshouse", "Meridian", "Afterglow", "Signal Fade", "Cirrus",
  "Low Tide", "Half Awake", "Vector Fields", "Paper Moon", "Static Bloom",
  "Night Drive", "Echo Chamber", "Silver Thread", "Northbound", "Resonance",
  "Cobalt", "Driftwood", "Aurora Loop", "Phase Shift", "Ember",
  "Quiet Machines", "Tidal", "Overpass", "Blackout Poem", "Wildflower Static",
  "Analog Heart", "Chrome Veil", "Starling", "Interlude No. 3", "Fever Dream",
  "Cold Fern", "Hologram", "Slow Melt", "Lantern", "Waveform Hymn",
];

function seeded(n: number): () => number {
  let s = n;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const ALBUMS: Album[] = ALBUM_DEFS.map(([title, artist, year, hue], i) => ({
  id: `al${i}`,
  title,
  artist,
  year,
  art: grad(hue, i % 4),
}));

export const TRACKS: Track[] = (() => {
  const rand = seeded(42);
  const out: Track[] = [];
  ALBUMS.forEach((al, ai) => {
    const count = 7 + Math.floor(rand() * 5); // 7–11 tracks
    for (let t = 0; t < count; t++) {
      const lossless = rand() > 0.35;
      const id = `t${ai}-${t}`;
      out.push({
        id,
        title: TRACK_TITLE_POOL[(ai * 7 + t * 3) % TRACK_TITLE_POOL.length],
        artist: al.artist,
        albumId: al.id,
        trackNo: t + 1,
        duration: 150 + Math.floor(rand() * 210),
        path: `~/Music/${al.artist}/${al.title}/${t + 1}.flac`,
        format: lossless ? (rand() > 0.5 ? "FLAC" : "ALAC") : rand() > 0.5 ? "MP3" : "AAC",
        lossless,
        sampleRate: lossless ? [44100, 48000, 96000, 192000][Math.floor(rand() * 4)] : 44100,
        bitDepth: lossless ? [16, 24][Math.floor(rand() * 2)] : undefined,
        bitrate: lossless ? undefined : 256 + Math.floor(rand() * 100),
      });
    }
  });
  return out;
})();

export const albumById = (id: string): Album => ALBUMS.find((a) => a.id === id)!;
export const trackById = (id: string): Track | undefined => TRACKS.find((t) => t.id === id);
export const tracksOfAlbum = (id: string): Track[] => TRACKS.filter((t) => t.albumId === id);

export const PLAYLISTS_SEED = [
  { id: "pl0", name: "Late Night Coding", trackIds: TRACKS.slice(0, 14).map((t) => t.id) },
  { id: "pl1", name: "Morning Ritual", trackIds: TRACKS.slice(20, 30).map((t) => t.id) },
  { id: "pl2", name: "Lossless Showcase", trackIds: TRACKS.filter((t) => t.lossless).slice(0, 12).map((t) => t.id) },
];
