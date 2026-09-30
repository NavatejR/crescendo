import { create } from "zustand";
import { trackById } from "../lib/mockLibrary";
import { isNative } from "../lib/env";
import { native, repeatModeToInt, type EngineStatus } from "../lib/native";
import { startSimulation, spectrum } from "../lib/spectrum";
import type { RepeatMode, Track } from "../lib/types";

export type PlayerStatus = "stopped" | "playing" | "paused";

interface PlayerState {
  status: PlayerStatus;
  queue: string[];
  index: number;
  /** Track ids started this session, most recent first ("Jump back in"). */
  history: string[];
  position: number; // seconds
  duration: number;
  volume: number; // 0..1
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Simulated spectrum levels (browser mode only) */
  levels: number[];
  bass: number;
  mid: number;
  treble: number;
  // actions
  playTrackList: (tracks: Track[], startIdx?: number) => void;
  playQueueIndex: (i: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  playNextInQueue: (track: Track) => void;
  removeFromQueue: (i: number) => void;
  moveInQueue: (from: number, to: number) => void;
  setLevels: (levels: number[], bass: number, mid: number, treble: number) => void;
  tick: (dt: number) => void;
}

let lastSentVolume = -1;
let lastSentRepeat: RepeatMode | null = null;
/** Mirror of the track list last sent to the native engine (for duration lookup). */
let nativeQueueTracks: Track[] = [];

let stopSync: (() => void) | null = null;
/** Native mode: start polling the engine for position/status. */
function ensureSync(
  set: (partial: Partial<PlayerState>) => void,
  get: () => PlayerState,
) {
  if (!isNative() || stopSync) return;
  let stopped = false;
  const poll = async () => {
    if (stopped) return;
    const s: EngineStatus | null = await native.status();
    if (s) {
      const t =
        s.index >= 0 && s.index < nativeQueueTracks.length
          ? nativeQueueTracks[s.index]
          : undefined;
      set({
        position: s.position,
        index: s.index,
        status: s.status,
        duration: t?.duration ?? get().duration,
      });
    }
    setTimeout(poll, 250);
  };
  poll();
  stopSync = () => {
    stopped = true;
  };
}
/** Browser mode: start the simulated FFT feed. */
function ensureSim() {
  if (!isNative()) startSimulation();
}

export const usePlayer = create<PlayerState>((set, get) => {
  return {
    status: "stopped",
    queue: [],
    index: -1,
    history: [],
    position: 0,
    duration: 0,
    volume: 0.85,
    muted: false,
    shuffle: false,
    repeat: "off",
    levels: new Array(64).fill(0),
    bass: 0,
    mid: 0,
    treble: 0,

    playTrackList(tracks, startIdx = 0) {
      if (tracks.length === 0) return;
      const idx = Math.min(Math.max(0, startIdx), tracks.length - 1);
      const cur = tracks[idx];
      set({
        queue: tracks.map((t) => t.id),
        index: idx,
        position: 0,
        duration: cur.duration ?? 0,
        status: "playing",
        history: [cur.id, ...get().history.filter((h) => h !== cur.id)].slice(0, 12),
      });
      if (isNative()) {
        nativeQueueTracks = tracks;
        native.play(tracks.map((t) => t.path), idx);
        ensureSync(set, get);
      } else {
        ensureSim();
        spectrum.playing = true;
      }
    },

    playQueueIndex: (i) => {
      const q = get().queue;
      if (i < 0 || i >= q.length) return;
      set({
        index: i,
        position: 0,
        status: "playing",
        history: [q[i], ...get().history.filter((h) => h !== q[i])].slice(0, 12),
      });
      if (isNative()) {
        native.play(q, i); // reload queue pointing at the chosen index
        ensureSync(set, get);
      } else {
        const t = trackById(q[i]);
        set({ duration: t?.duration ?? 0 });
        ensureSim();
        spectrum.playing = true;
      }
    },

    togglePlay: () => {
      const { status, queue } = get();
      if (isNative()) {
        native.toggle();
        ensureSync(set, get);
        set({ status: status === "playing" ? "paused" : status === "paused" ? "playing" : status });
        return;
      }
      if (status === "playing") {
        set({ status: "paused" });
        spectrum.playing = false;
      } else if (status === "paused") {
        set({ status: "playing" });
        spectrum.playing = true;
      } else if (queue.length > 0) {
        set({ status: "playing" });
        spectrum.playing = true;
      }
    },

    next: () => {
      const s = get();
      if (isNative()) {
        native.next();
        ensureSync(set, get);
        set({ position: 0 });
        return;
      }
      if (s.repeat === "one" && s.status !== "stopped") {
        set({ position: 0, status: "playing" });
        return;
      }
      let i = s.index + 1;
      if (i >= s.queue.length) {
        if (s.repeat === "all") i = 0;
        else {
          set({ status: "stopped", position: 0 });
          spectrum.playing = false;
          return;
        }
      }
      const t = trackById(s.queue[i]);
      set({ index: i, position: 0, duration: t?.duration ?? 0, status: "playing" });
    },

    prev: () => {
      const s = get();
      if (isNative()) {
        native.prev();
        ensureSync(set, get);
        return;
      }
      if (s.position > 3) {
        set({ position: 0 });
        return;
      }
      let i = s.index - 1;
      if (i < 0) i = s.repeat === "all" ? s.queue.length - 1 : 0;
      const t = trackById(s.queue[i]);
      set({ index: i, position: 0, duration: t?.duration ?? 0, status: "playing" });
    },

    seek: (sec) => {
      const d = get().duration;
      const p = Math.min(Math.max(0, sec), d || 0);
      set({ position: p });
      if (isNative()) native.seek(p);
    },

    setVolume: (v) => {
      const vol = Math.min(1, Math.max(0, v));
      set({ volume: vol, muted: false });
      if (isNative() && Math.abs(vol - lastSentVolume) > 0.001) {
        lastSentVolume = vol;
        native.setVolume(vol);
      }
    },

    toggleMute: () => {
      const { muted, volume } = get();
      set({ muted: !muted });
      if (isNative()) native.setVolume(muted ? volume : 0);
      else spectrum.playing = get().status === "playing";
    },

    toggleShuffle: () => {
      const { shuffle, queue, index } = get();
      if (shuffle) {
        set({ shuffle: false });
      } else {
        const head = queue.slice(0, index + 1);
        const rest = queue.slice(index + 1);
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        set({ queue: [...head, ...rest], shuffle: true });
      }
    },

    cycleRepeat: () => {
      const order: RepeatMode[] = ["off", "all", "one"];
      const cur = get().repeat;
      const nextMode = order[(order.indexOf(cur) + 1) % order.length];
      set({ repeat: nextMode });
      if (isNative() && nextMode !== lastSentRepeat) {
        lastSentRepeat = nextMode;
        native.setRepeat(repeatModeToInt(nextMode));
      }
    },

    playNextInQueue: (track) => {
      const { queue, index } = get();
      const q = [...queue];
      q.splice(index + 1, 0, track.id);
      set({ queue: q });
    },

    removeFromQueue: (i) => {
      const { queue, index } = get();
      if (i === index) return;
      const q = queue.filter((_, idx) => idx !== i);
      set({ queue: q, index: i < index ? index - 1 : index });
    },

    moveInQueue: (from, to) => {
      const { queue, index } = get();
      if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
      const q = [...queue];
      const [id] = q.splice(from, 1);
      q.splice(to, 0, id);
      let idx = index;
      if (from === index) idx = to;
      else if (from < index && to >= index) idx = index - 1;
      else if (from > index && to <= index) idx = index + 1;
      set({ queue: q, index: idx });
    },

    setLevels: (levels, bass, mid, treble) => set({ levels, bass, mid, treble }),

    tick: (dt) => {
      const s = get();
      if (s.status !== "playing") return;
      const p = s.position + dt;
      if (s.duration > 0 && p >= s.duration) {
        get().next();
        return;
      }
      set({ position: p });
    },
  };
});
