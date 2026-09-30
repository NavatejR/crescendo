import { useEffect, useRef } from "react";
import { spectrum } from "../lib/spectrum";
import { isNative } from "../lib/env";
import { usePlayer } from "../player/store";

/**
 * A small CSS orb on the playbar that breathes with the live audio
 * spectrum. Works in both native mode (engine FFT) and browser mode
 * (simulated spectrum) — same source, same motion.
 */
export default function MiniOrb() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    const loop = () => {
      const s = usePlayer.getState();
      const playing = isNative() ? s.status === "playing" : s.status === "playing" && spectrum.playing;
      const target = playing ? Math.min(1, spectrum.bass * 1.4) : 0;
      smooth += (target - smooth) * 0.18;
      if (ref.current) {
        ref.current.style.setProperty("--orb-scale", (0.75 + smooth * 0.45).toFixed(3));
        ref.current.style.setProperty("--orb-glow", (0.35 + smooth * 0.65).toFixed(3));
        ref.current.style.opacity = s.status === "stopped" ? "0.25" : "1";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="mini-orb" ref={ref} title="Audio spectrum">
      <div className="mini-orb-core" />
      <div className="mini-orb-ring" />
    </div>
  );
}
