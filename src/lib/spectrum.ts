/**
 * Spectrum singleton — written by the native event listener (or by the
 * simulator in browser preview mode) and read directly inside RAF loops.
 * Kept outside React state to avoid re-render churn.
 */
export const SPECTRUM_BANDS = 64;
export const SPECTRUM_WAVEFORM = 256;

export const spectrum = {
  bands: new Float32Array(SPECTRUM_BANDS),
  waveform: new Float32Array(SPECTRUM_WAVEFORM),
  bass: 0,
  mid: 0,
  treble: 0,
  energy: 0,
  playing: false,
};

let simRaf = 0;
let phase = 0;

/** Browser-preview simulation of the native FFT feed. */
export function startSimulation() {
  if (simRaf) return;
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    phase += dt * (spectrum.playing ? 2.2 : 0.35);
    const drive = spectrum.playing ? 1 : 0.12;
    for (let i = 0; i < SPECTRUM_BANDS; i++) {
      const x = i / SPECTRUM_BANDS;
      const tilt = Math.pow(1 - x, 1.6);
      const hump =
        Math.exp(-Math.pow((x - (0.12 + 0.22 * Math.sin(phase * 0.7 + i * 0.35))) * 5, 2)) +
        Math.exp(-Math.pow((x - (0.45 + 0.25 * Math.sin(phase * 0.45 + i * 0.22))) * 6, 2));
      const n = 0.5 + 0.5 * Math.sin(phase * (1.3 + x * 5) + i * 1.7);
      const target = drive * Math.min(1, (tilt * 0.7 + hump * 0.5) * (0.55 + 0.45 * n) + 0.05);
      const cur = spectrum.bands[i];
      spectrum.bands[i] = cur + (target - cur) * (target > cur ? 0.5 : 0.12);
    }
    spectrum.bass = drive * (0.25 + 0.75 * Math.abs(Math.sin(phase * 1.1) * Math.sin(phase * 0.53)));
    spectrum.mid = drive * (0.3 + 0.4 * Math.abs(Math.sin(phase * 0.8 + 1)));
    spectrum.treble = drive * (0.15 + 0.3 * Math.abs(Math.sin(phase * 2.3 + 2)));
    spectrum.energy = spectrum.bass * 0.55 + spectrum.mid * 0.3 + spectrum.treble * 0.15;
    simRaf = requestAnimationFrame(loop);
  };
  simRaf = requestAnimationFrame(loop);
}

export function stopSimulation() {
  if (simRaf) cancelAnimationFrame(simRaf);
  simRaf = 0;
}
