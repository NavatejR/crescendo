import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Power } from "lucide-react";

export const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Bass Boost": [6, 5.5, 4, 1.5, 0, 0, 0, 0, 0, 0],
  Rock: [4, 3, 1.5, 0, -1, -0.5, 1.5, 3, 4, 4.5],
  Pop: [-1, 1, 2.5, 4, 3, 0.5, -1, -1.5, 0, 1],
  Jazz: [3, 2, 0.5, 1.5, -1, -1, 0, 1.5, 2.5, 3],
  Electronic: [5, 4.5, 1, 0, -2, 1.5, 0.5, 2, 4.5, 5],
  Vocal: [-2, -1, 0, 2.5, 4.5, 4.5, 3, 1.5, 0, -1],
  Podcast: [-3, -2, 0.5, 3.5, 4, 3.5, 2, 0.5, -1, -2.5],
};

function bandLabel(hz: number): string {
  return hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
}

export default function EQPanel({ onClose }: { onClose: () => void }) {
  const [enabled, setEnabled] = useState(true);
  const [preamp, setPreamp] = useState(0);
  const [gains, setGains] = useState<number[]>(EQ_PRESETS.Flat);
  const [preset, setPreset] = useState("Flat");

  function applyPreset(name: string) {
    setPreset(name);
    setGains([...EQ_PRESETS[name]]);
  }
  function setGain(i: number, v: number) {
    const g = [...gains];
    g[i] = v;
    setGains(g);
    setPreset("Custom");
  }

  return (
    <AnimatePresence>
      <motion.div
        className="eq-panel panel-glass sheen"
        initial={{ y: 340, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 340, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
      >
        <div className="eq-head">
          <div className="eq-title">
            <button
              className={`icon-btn ${enabled ? "toggled" : ""}`}
              onClick={() => setEnabled(!enabled)}
              title={enabled ? "EQ on" : "EQ bypassed"}
            >
              <Power size={16} />
            </button>
            <span>Equalizer</span>
            {!enabled && <span className="text-faint eq-bypassed">bypassed</span>}
          </div>
          <div className="eq-presets">
            {Object.keys(EQ_PRESETS).map((name) => (
              <button
                key={name}
                className={`eq-preset ${preset === name ? "eq-preset-active" : ""}`}
                onClick={() => applyPreset(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={onClose} title="Close"><X size={16} /></button>
        </div>

        <div className="eq-preamp">
          <span className="text-dim">Preamp</span>
          <input
            type="range"
            min={-12}
            max={12}
            step={0.5}
            value={preamp}
            onChange={(e) => setPreamp(parseFloat(e.target.value))}
          />
          <span className="eq-db">{preamp > 0 ? "+" : ""}{preamp.toFixed(1)} dB</span>
        </div>

        <div className="eq-bands">
          {gains.map((g, i) => (
            <div className="eq-band" key={i}>
              <span className="eq-db text-faint">{g > 0 ? "+" : ""}{g.toFixed(1)}</span>
              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={g}
                onChange={(e) => setGain(i, parseFloat(e.target.value))}
                className="eq-vertical"
                aria-label={`${bandLabel(EQ_BANDS[i])} Hz`}
              />
              <span className="eq-hz text-faint">{bandLabel(EQ_BANDS[i])}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
