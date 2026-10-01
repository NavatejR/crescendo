/**
 * Native bridge — every call is safe to make in a plain browser:
 * functions no-op / return fallbacks when not running inside Tauri.
 */
import type { RepeatMode } from "./types";
import { isNative } from "./env";

export { isNative };

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isNative()) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return (await invoke(cmd, args ?? {})) as T;
  } catch (e) {
    console.error(`[crescendo] ${cmd} failed:`, e);
    return null;
  }
}

/** Raw DB track shape (camelCase via serde). */
export interface NativeTrack {
  id: number;
  path: string;
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  trackNo: number;
  year: number;
  duration: number;
  format: string;
  lossless: boolean;
  sampleRate: number;
  bitDepth: number;
  bitrate: number;
  artPath: string | null;
  artPalette: string | null;
}

export const native = {
  // ---- playback ----
  play(paths: string[], start: number) {
    return invoke("engine_play", { paths, start });
  },
  toggle() {
    return invoke("engine_toggle");
  },
  next() {
    return invoke("engine_next");
  },
  prev() {
    return invoke("engine_prev");
  },
  stop() {
    return invoke("engine_stop");
  },
  seek(sec: number) {
    return invoke("engine_seek", { sec });
  },
  setVolume(volume: number) {
    return invoke("engine_set_volume", { volume });
  },
  setRepeat(mode: number) {
    return invoke("engine_set_repeat", { mode });
  },
  setEq(enabled: boolean, preampDb: number, gains: number[]) {
    return invoke("engine_set_eq", { enabled, preampDb, gains });
  },
  status(): Promise<EngineStatus | null> {
    return invoke("engine_status");
  },

  // ---- library ----
  listTracks(): Promise<NativeTrack[] | null> {
    return invoke("library_list_tracks");
  },
  listAlbums(): Promise<NativeAlbum[] | null> {
    return invoke("library_list_albums");
  },
  listFolders(): Promise<string[] | null> {
    return invoke("library_list_folders");
  },
  addFolder(path: string) {
    return invoke("library_add_folder", { path });
  },
  importFiles(paths: string[]): Promise<number[] | null> {
    return invoke("library_import_files", { paths });
  },
  repairArtwork(): Promise<number | null> {
    return invoke("library_repair_artwork");
  },
  removeFolder(path: string) {
    return invoke("library_remove_folder", { path });
  },
  rescanAll() {
    return invoke("library_rescan_all");
  },

  // ---- playlists ----
  listPlaylists(): Promise<NativePlaylist[] | null> {
    return invoke("playlist_list");
  },
  createPlaylist(name: string) {
    return invoke("playlist_create", { name });
  },
  deletePlaylist(id: number) {
    return invoke("playlist_delete", { id });
  },
  renamePlaylist(id: number, name: string) {
    return invoke("playlist_rename", { id, name });
  },
  addToPlaylist(playlistId: number, trackId: number) {
    return invoke("playlist_add_track", { playlistId, trackId });
  },
  removeFromPlaylist(playlistId: number, trackId: number) {
    return invoke("playlist_remove_track", { playlistId, trackId });
  },
  /** Watch a folder and add all its tracks to a playlist; resolves to the count. */
  addFolderToPlaylist(playlistId: number, folder: string): Promise<number | null> {
    return invoke("playlist_add_folder", { playlistId, folder });
  },

  // ---- dialog ----
  async pickFolder(): Promise<string | null> {
    if (!isNative()) return null;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const sel = await open({ directory: true, title: "Choose a music folder" });
      return typeof sel === "string" ? sel : null;
    } catch (e) {
      console.error("pickFolder failed:", e);
      return null;
    }
  },

  /** Pick one or more audio files (used by playlist import). */
  async pickFiles(): Promise<string[]> {
    if (!isNative()) return [];
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const sel = await open({
        multiple: true,
        title: "Add music files",
        filters: [
          {
            name: "Audio",
            extensions: ["mp3", "flac", "m4a", "aac", "wav", "aiff", "aif", "ogg", "opus", "alac"],
          },
        ],
      });
      if (!sel) return [];
      return Array.isArray(sel) ? sel : [sel];
    } catch (e) {
      console.error("pickFiles failed:", e);
      return [];
    }
  },
};

export interface EngineStatus {
  status: "stopped" | "playing" | "paused";
  position: number;
  index: number;
  queueLen: number;
}

export interface NativeAlbum {
  key: string;
  title: string;
  artist: string;
  year: number;
  trackCount: number;
  duration: number;
  artPath: string | null;
  artPalette: string | null;
}

export interface NativePlaylist {
  id: number;
  name: string;
  trackIds: number[];
}

export function repeatModeToInt(mode: RepeatMode): number {
  return mode === "off" ? 0 : mode === "all" ? 1 : 2;
}
