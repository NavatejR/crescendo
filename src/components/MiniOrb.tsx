import { useEffect, useRef } from "react";
import { usePlayer } from "../player/store";

/** A small CSS orb on the playbar that breathes with the bass levels. */
export default function MiniOrb() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    const loop = () => {
      const s = usePlayer.getState();
      const target = s.status === "playing" ? Math.min(1, s.bass * 1.4) : 0;
      smooth += (target - smooth) * 0.18;
      if (ref.current) {
        ref.current.style.setProperty("--orb-scale", (0.75 + smooth * 0.45).toFixed(3));
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
