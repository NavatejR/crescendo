import type { ComponentType, CSSProperties } from "react";
import {
  House, LayoutDashboard, CircleDot, Sparkle,
  Disc, Disc3, Orbit, Aperture, CircleDashed,
  Users, Shapes, UsersRound, Layers, Gem,
  Music, Music2, Music4, AudioWaveform, AudioLines,
  Folder, Square, Compass, Radio,
  ListMusic, List, ListEnd, ListStart, Spline,
  SlidersHorizontal, SlidersVertical, Gauge, Command, Activity,
  Search, TextSearch, Sparkles,
  Settings, Settings2,
  Maximize2, Expand, Scaling,
  Play, CirclePlay, Pause, CirclePause,
  SkipBack, SkipForward, StepBack, StepForward, Rewind, FastForward,
  Shuffle, ArrowLeftRight, Dices, RotateCw,
  Repeat, Repeat1,
  Volume1, Volume2, VolumeX,
  Heart, Star, Flame, Droplet,
  X, Power, Plus,
  Clock, Clock3, FolderOpen, RefreshCw, RefreshCcw,
  Palette, Info, Check,
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
  | "palette" | "sparkles" | "info" | "check" | "disc";

/**
 * Each skin ships its own icon character:
 *  - material  → rounded, familiar (classic lucide shapes)
 *  - nothing   → geometric/technical mono (circles, dots, squares)
 *  - windows   → fluent-style straight arrows and gauges
 *  - oneui     → minimal thin glyphs
 *  - liquid    → expressive, ornamental forms
 */
const ICON_SETS: Record<SkinId, Record<IconName, IconCmp>> = {
  material: {
    home: House, albums: Disc3, artists: Users, tracks: Music2, folders: Folder, playlists: ListMusic,
    eq: SlidersHorizontal, search: Search, settings: Settings, expand: Maximize2,
    play: Play, pause: Pause, prev: SkipBack, next: SkipForward,
    shuffle: Shuffle, repeat: Repeat, repeat1: Repeat1,
    volume: Volume2, mute: VolumeX, favorite: Heart, queue: ListMusic,
    close: X, power: Power, plus: Plus, clock: Clock3, folderOpen: FolderOpen,
    rescan: RefreshCw, palette: Palette, sparkles: Sparkles, info: Info, check: Check, disc: Disc3,
  },
  nothing: {
    home: Square, albums: Orbit, artists: Shapes, tracks: AudioWaveform, folders: Square, playlists: List,
    eq: Gauge, search: TextSearch, settings: Settings2, expand: Expand,
    play: CirclePlay, pause: CirclePause, prev: StepBack, next: StepForward,
    shuffle: ArrowLeftRight, repeat: RotateCw, repeat1: Repeat1,
    volume: Volume1, mute: VolumeX, favorite: Star, queue: ListEnd,
    close: X, power: Power, plus: Plus, clock: Clock, folderOpen: FolderOpen,
    rescan: RefreshCcw, palette: Palette, sparkles: Sparkles, info: Info, check: Check, disc: Orbit,
  },
  windows: {
    home: LayoutDashboard, albums: Disc, artists: UsersRound, tracks: Music, folders: Folder, playlists: ListMusic,
    eq: SlidersVertical, search: Search, settings: SlidersHorizontal, expand: Scaling,
    play: Play, pause: Pause, prev: Rewind, next: FastForward,
    shuffle: Shuffle, repeat: Repeat, repeat1: Repeat1,
    volume: Volume2, mute: VolumeX, favorite: Heart, queue: ListMusic,
    close: X, power: Power, plus: Plus, clock: Clock3, folderOpen: FolderOpen,
    rescan: RefreshCcw, palette: Palette, sparkles: Sparkles, info: Info, check: Check, disc: Disc,
  },
  oneui: {
    home: CircleDot, albums: Aperture, artists: Layers, tracks: Music4, folders: Compass, playlists: List,
    eq: Command, search: Search, settings: Gauge, expand: Expand,
    play: Play, pause: Pause, prev: SkipBack, next: SkipForward,
    shuffle: Dices, repeat: Repeat, repeat1: Repeat1,
    volume: Volume1, mute: VolumeX, favorite: Flame, queue: ListStart,
    close: X, power: Power, plus: Plus, clock: Clock3, folderOpen: FolderOpen,
    rescan: RefreshCw, palette: Palette, sparkles: Sparkles, info: Info, check: Check, disc: Aperture,
  },
  liquid: {
    home: Sparkle, albums: CircleDashed, artists: Gem, tracks: AudioLines, folders: Radio, playlists: Spline,
    eq: Activity, search: Sparkles, settings: Command, expand: Aperture,
    play: CirclePlay, pause: CirclePause, prev: Rewind, next: FastForward,
    shuffle: ArrowLeftRight, repeat: RotateCw, repeat1: Repeat1,
    volume: Volume2, mute: VolumeX, favorite: Droplet, queue: Layers,
    close: X, power: Power, plus: Plus, clock: Clock, folderOpen: FolderOpen,
    rescan: RefreshCw, palette: Palette, sparkles: Sparkles, info: Info, check: Check, disc: CircleDashed,
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
