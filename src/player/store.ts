import { create } from "zustand";
import { trackById } from "../lib/mockLibrary";
import type { RepeatMode, Track } from "../lib/types";

export type PlayerStatus = "stopped" | "playing" | "paused";

interface PlayerState {
  status: PlayerStatus;
  queue: string[];
  index: number;
  position: number; // seconds
  duration: number;
  volume: number; // 0..1
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Simulated spectrum levels 0..1 (until native FFT events arrive) */
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

export const usePlayer = create<PlayerState>((set, get) => {
  const load = (i: number) => {
    const q = get().queue;
    if (i < 0 || i >= q.length) return;
    const t = trackById(q[i]);
    if (!t) return;
    set({ index: i, position: 0, duration: t.duration, status: "playing" });
  };

  return {
    status: "stopped",
    queue: [],
    index: -1,
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
      set({
        queue: tracks.map((t) => t.id),
        index: idx,
        position: 0,
        duration: tracks[idx]?.duration ?? 0,
        status: "playing",
      });
    },

    playQueueIndex: (i) => load(i),

    togglePlay: () => {
      const { status, queue } = get();
      if (status === "playing") set({ status: "paused" });
      else if (status === "paused") set({ status: "playing" });
      else if (queue.length > 0) set({ status: "playing" });
    },

    next: () => {
      const s = get();
      if (s.repeat === "one" && s.status !== "stopped") {
        set({ position: 0, status: "playing" });
        return;
      }
      let i = s.index + 1;
      if (i >= s.queue.length) {
        if (s.repeat === "all") i = 0;
        else {
          set({ status: "stopped", position: 0 });
          return;
        }
      }
      load(i);
    },

    prev: () => {
      const s = get();
      if (s.position > 3) {
        set({ position: 0 });
        return;
      }
      let i = s.index - 1;
      if (i < 0) i = s.repeat === "all" ? s.queue.length - 1 : 0;
      load(i);
    },

    seek: (sec) => {
      const d = get().duration;
      set({ position: Math.min(Math.max(0, sec), d || 0) });
    },

    setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)), muted: false }),

    toggleMute: () => set({ muted: !get().muted }),

    toggleShuffle: () => {
      const { shuffle, queue, index } = get();
      if (shuffle) {
        set({ shuffle: false });
      } else {
        // Keep played order up to current index; shuffle everything after it.
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
      set({ repeat: order[(order.indexOf(cur) + 1) % order.length] });
    },

    playNextInQueue: (track) => {
      const { queue, index } = get();
      const q = [...queue];
      q.splice(index + 1, 0, track.id);
      set({ queue: q });
    },

    removeFromQueue: (i) => {
      const { queue, index } = get();
      if (i === index) return; // never remove the playing row
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
