import { spectrum } from "./spectrum";

/**
 * Smoothed audio-energy signals shared by every orb visualizer instance.
 * One rAF loop updates all subscribers, so a backdrop orb, a mini orb and a
 * settings preview all move in lockstep instead of running their own loops.
 */
export interface AudioLevels {
  /** Low-band energy 0..1 — drives the orb "input" channel. */
  input: number;
  /** Broadband energy 0..1 — drives the orb "output" channel. */
  output: number;
}

const state: AudioLevels = { input: 0, output: 0 };

type Sub = (levels: AudioLevels) => void;
const subs = new Set<Sub>();

let raf = 0;
let last = 0;
let quietFor = 0;

function loop(now: number) {
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
  last = now;

  const playing = spectrum.playing;
  const targetIn = playing ? Math.min(1, spectrum.bass * 1.25) : 0;
  const targetOut = playing ? Math.min(1, spectrum.energy * 1.15) : 0;

  // Fast attack, slow release — orbs punch on hits, decay between them.
  const k = targetIn > state.input || targetOut > state.output ? 1 - Math.exp(-dt * 22) : 1 - Math.exp(-dt * 4);
  state.input += (targetIn - state.input) * k;
  state.output += (targetOut - state.output) * k;

  quietFor = playing ? 0 : quietFor + dt;
  for (const s of subs) s(state);

  // Keep animating while paused so orbs keep breathing, but at low duty.
  raf = requestAnimationFrame(loop);
  void quietFor;
}

function ensure() {
  if (!raf) {
    last = 0;
    raf = requestAnimationFrame(loop);
  }
}

export function subscribeAudioLevels(fn: Sub): () => void {
  ensure();
  subs.add(fn);
  fn(state);
  return () => {
    subs.delete(fn);
    // Note: the loop itself is tiny and shared; leave it running for the
    // next subscriber (also keeps MiniOrb alive across mounts).
  };
}

/** Current snapshot without subscribing. */
export function audioLevels(): AudioLevels {
  return state;
}
