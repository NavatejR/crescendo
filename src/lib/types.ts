export interface Track {
  id: string;
  title: string;
  artist: string;
  albumId: string;
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
  /** CSS gradient used as generated cover art until native artwork lands */
  art: string;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
}

export type RepeatMode = "off" | "all" | "one";
