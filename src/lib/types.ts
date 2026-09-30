export interface Track {
  id: string;
  title: string;
  artist: string;
  albumId: string;
  /** Display album title (native mode; mock uses albumId lookup) */
  albumTitle?: string;
  /** Ready-to-use artwork URL (native asset) — fallback is generated art */
  art?: string;
  /** Cover palette "r,g,b|r,g,b|…" extracted from the artwork (up to 5 colors) */
  artPalette?: string;
  year?: number;
  trackNo: number;
  duration: number; // seconds
  path: string;
  format: string; // "FLAC" | "MP3" | …
  lossless: boolean;
  sampleRate?: number; // Hz
  bitDepth?: number; // bits (lossless)
  bitrate?: number; // kbps (lossy)
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  /** CSS gradient or artwork URL used as cover */
  art: string;
  /** Cover palette "r,g,b|r,g,b|…" extracted from the artwork */
  artPalette?: string;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
}

export type RepeatMode = "off" | "all" | "one";
