import type { ComponentType, CSSProperties } from "react";
import {
  House,
  Disc, Disc3, Orbit, CircleDot,
  Users, UsersRound,
  Music, Music2, Music4, AudioWaveform, AudioLines,
  Folder, FolderOpen, RefreshCw, RefreshCcw,
  ListMusic, List,
  SlidersHorizontal, SlidersVertical,
  Search, Sparkles,
  Settings, Settings2,
  Maximize2, Expand,
  Play, Pause, CirclePlay, CirclePause,
  SkipBack, SkipForward, StepBack, StepForward,
  Shuffle, Repeat, Repeat1,
  Volume1, Volume2, VolumeX,
  Heart, X, Power, Plus,
  Clock, Clock3,
  Palette, Info, Check, ChevronDown,
} from "lucide-react";
import type { SkinId } from "./skins";
import { useTheme } from "./store";

export type IconCmp = ComponentType<{
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
  color?: string;
}>;

export type IconName =
  | "home"
  | "albums" | "artists" | "tracks" | "folders" | "playlists" | "eq"
  | "search" | "settings" | "expand"
  | "play" | "pause" | "prev" | "next"
  | "shuffle" | "repeat" | "repeat1"
  | "volume" | "mute" | "favorite"
  | "queue" | "close" | "power" | "plus"
  | "clock" | "folderOpen" | "rescan"
  | "palette" | "sparkles" | "info" | "check" | "disc" | "back";

/**
 * Per-skin icon sets. Every variant stays semantically true to its action —
 * skins differ in *character* (rounded vs geometric, frames vs bare glyphs),
 * never in meaning. Stroke weight per skin is applied in skins.css.
 */
const ICON_SETS: Record<SkinId, Record<IconName, IconCmp>> = {
  /* Material You: rounded, familiar shapes */
  material: {
    home: House,
    albums: Disc3, artists: Users, tracks: Music2, folders: Folder, playlists: ListMusic,
    eq: SlidersHorizontal, search: Search, settings: Settings, expand: Maximize2,
    play: Play, pause: Pause, prev: SkipBack, next: SkipForward,
    shuffle: Shuffle, repeat: Repeat, repeat1: Repeat1,
    volume: Volume2, mute: VolumeX, favorite: Heart, queue: ListMusic,
    close: X, power: Power, plus: Plus, clock: Clock3, folderOpen: FolderOpen,
    rescan: RefreshCw, palette: Palette, sparkles: Sparkles, info: Info, check: Check, disc: Disc3,
    back: ChevronDown,
  },

  /* NothingOS: geometric, framed, technical */
  nothing: {
    home: House,
    albums: Orbit, artists: Users, tracks: AudioWaveform, folders: Folder, playlists: List,
    eq: SlidersVertical, search: Search, settings: Settings2, expand: Expand,
    play: CirclePlay, pause: CirclePause, prev: StepBack, next: StepForward,
    shuffle: Shuffle, repeat: Repeat, repeat1: Repeat1,
    volume: Volume1, mute: VolumeX, favorite: Heart, queue: ListMusic,
    close: X, power: Power, plus: Plus, clock: Clock, folderOpen: FolderOpen,
    rescan: RefreshCcw, palette: Palette, sparkles: Sparkles, info: Info, check: Check, disc: Orbit,
    back: ChevronDown,
  },

  /* Windows 11: Fluent-style, slightly condensed */
  windows: {
    home: House,
    albums: Disc, artists: UsersRound, tracks: Music, folders: Folder, playlists: ListMusic,
    eq: SlidersVertical, search: Search, settings: Settings, expand: Maximize2,
    play: Play, pause: Pause, prev: SkipBack, next: SkipForward,
    shuffle: Shuffle, repeat: Repeat, repeat1: Repeat1,
    volume: Volume2, mute: VolumeX, favorite: Heart, queue: ListMusic,
    close: X, power: Power, plus: Plus, clock: Clock3, folderOpen: FolderOpen,
    rescan: RefreshCcw, palette: Palette, sparkles: Sparkles, info: Info, check: Check, disc: Disc,
    back: ChevronDown,
  },

  /* One UI: minimal, thin, Samsung-style */
  oneui: {
    home: House,
    albums: CircleDot, artists: UsersRound, tracks: Music4, folders: Folder, playlists: List,
    eq: SlidersHorizontal, search: Search, settings: Settings2, expand: Expand,
    play: Play, pause: Pause, prev: SkipBack, next: SkipForward,
    shuffle: Shuffle, repeat: Repeat, repeat1: Repeat1,
    volume: Volume1, mute: VolumeX, favorite: Heart, queue: ListMusic,
    close: X, power: Power, plus: Plus, clock: Clock3, folderOpen: FolderOpen,
    rescan: RefreshCw, palette: Palette, sparkles: Sparkles, info: Info, check: Check, disc: CircleDot,
    back: ChevronDown,
  },

  /* Liquid Glass: expressive but true to meaning */
  liquid: {
    home: House,
    albums: Orbit, artists: Users, tracks: AudioLines, folders: Folder, playlists: ListMusic,
    eq: SlidersHorizontal, search: Search, settings: Settings2, expand: Maximize2,
    play: CirclePlay, pause: CirclePause, prev: SkipBack, next: SkipForward,
    shuffle: Shuffle, repeat: Repeat, repeat1: Repeat1,
    volume: Volume2, mute: VolumeX, favorite: Heart, queue: ListMusic,
    close: X, power: Power, plus: Plus, clock: Clock, folderOpen: FolderOpen,
    rescan: RefreshCw, palette: Palette, sparkles: Sparkles, info: Info, check: Check, disc: Orbit,
    back: ChevronDown,
  },
};

/** Resolve an icon for a concrete skin (safe for map loops). */
export function iconFor(skin: SkinId, name: IconName): IconCmp {
  return ICON_SETS[skin][name] ?? ICON_SETS.material[name];
}

/** Resolve an icon for the active skin. */
export function useIcon(name: IconName): IconCmp {
  const skin = useTheme((s) => s.skin);
  return iconFor(skin, name);
}
