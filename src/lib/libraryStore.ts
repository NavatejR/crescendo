import { create } from "zustand";
import type { Album, Track } from "./types";
import { ALBUMS as MOCK_ALBUMS, TRACKS as MOCK_TRACKS } from "./mockLibrary";
import { native, isNative, type NativeAlbum, type NativeTrack } from "./native";

export interface LibraryState {
  ready: boolean;
  native: boolean;
  tracks: Track[];
  albums: Album[];
  /** Convert DB paths into playable queue arrays */
  playTracks: (tracks: Track[], startIdx: number) => void;
  refresh: () => Promise<void>;
}

/** Convert a DB track into the UI Track view-model. */
export function toTrack(t: NativeTrack): Track {
  return {
    id: String(t.id),
    title: t.title,
    artist: t.artist,
    albumId: `${t.albumArtist}::${t.album}`,
    albumTitle: t.album,
    art: t.artPath ? `asset://localhost${encodeURI(t.artPath)}` : undefined,
    year: t.year,
    trackNo: t.trackNo,
    duration: t.duration,
    path: t.path,
    format: t.format,
    lossless: t.lossless,
    sampleRate: t.sampleRate || undefined,
    bitDepth: t.bitDepth || undefined,
    bitrate: t.bitrate || undefined,
  };
}

export function toAlbum(a: NativeAlbum): Album {
  return {
    id: a.key,
    title: a.title,
    artist: a.artist,
    year: a.year,
    art: a.artPath ? `asset://localhost${encodeURI(a.artPath)}` : fallbackArt(a.key),
  };
}

/** Deterministic generated gradient per album key (no artwork case). */
export function fallbackArt(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const hue = ((h % 360) + 360) % 360;
  const a = `hsl(${hue} 75% 60%)`;
  const b = `hsl(${(hue + 40) % 360} 65% 42%)`;
  const c = `hsl(${(hue + 200) % 360} 55% 26%)`;
  const style = Math.abs(h) % 4;
  if (style === 0) return `radial-gradient(120% 120% at 20% 15%, ${a}, ${b} 60%, ${c})`;
  if (style === 1) return `linear-gradient(135deg, ${a}, ${b} 55%, ${c})`;
  if (style === 2) return `radial-gradient(100% 100% at 80% 80%, ${a}, ${b} 45%, ${c})`;
  return `conic-gradient(from 210deg at 50% 50%, ${a}, ${b}, ${c}, ${a})`;
}

export const useLibrary = create<LibraryState>((set) => ({
  ready: false,
  native: isNative(),
  tracks: [],
  albums: [],
  playTracks: () => {},
  async refresh() {
    if (!isNative()) {
      set({ ready: true, tracks: MOCK_TRACKS, albums: MOCK_ALBUMS });
      return;
    }
    const [nts, nas] = await Promise.all([native.listTracks(), native.listAlbums()]);
    set({
      ready: true,
      tracks: (nts ?? []).map(toTrack),
      albums: (nas ?? []).map(toAlbum),
    });
  },
}));

/** Queue paths for the native engine from UI tracks. */
export function pathsOf(tracks: Track[]): string[] {
  return tracks.map((t) => t.path);
}

/** Resolve a track id (works for both mock and native ids). */
export function useTrackById(id: string | undefined): Track | undefined {
  return useLibrary((s) => (id ? s.tracks.find((t) => t.id === id) : undefined));
}

/** Album lookup by album key. */
export function useAlbumById(id: string | undefined): Album | undefined {
  return useLibrary((s) => (id ? s.albums.find((a) => a.id === id) : undefined));
}
