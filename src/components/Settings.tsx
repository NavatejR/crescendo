import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Palette, Sparkles, Info, Check } from "lucide-react";
import { SKINS, OVERHAULS, ACCENTS, type SkinId, type OverhaulId } from "../theme/skins";
import { useTheme } from "../theme/store";
import ThemeThumbnail from "../theme/ThemeThumbnail";
import { useUI, type VizStyle } from "../lib/uiStore";
import { usePlayer } from "../player/store";

type Tab = "appearance" | "visualizer" | "about";

export default function Settings({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("appearance");
  const { skin, overhaul, accent, setSkin, setOverhaul, setAccent } = useTheme();
  const { vizStyle, vizIntensity, setVizStyle, setVizIntensity } = useUI();
  const volume = usePlayer((s) => s.volume);

  return (
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="settings panel-glass sheen"
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="settings-head">
            <h2>Settings</h2>
            <div className="settings-tabs">
              {(
                [
                  ["appearance", "Appearance", Palette],
                  ["visualizer", "Visualizer", Sparkles],
                  ["about", "About", Info],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={`chip ${tab === id ? "chip-active" : ""}`}
                  onClick={() => setTab(id)}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
            <button className="icon-btn" onClick={onClose}><X size={17} /></button>
          </div>

          <div className="settings-body">
            {tab === "appearance" && (
              <>
                <section>
                  <h3 className="settings-h3">Interface overhaul</h3>
                  <p className="text-faint settings-sub">
                    Structure & feel — layout, shape, blur, shadows, density.
                  </p>
                  <div className="thumb-grid">
                    {OVERHAULS.map((o) => (
                      <ThemeThumbnail
                        key={o.id}
                        skin={skin}
                        overhaul={o.id as OverhaulId}
                        active={overhaul === o.id}
                        onClick={() => setOverhaul(o.id)}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="settings-h3">Skin</h3>
                  <p className="text-faint settings-sub">
                    Identity — colors & typography. Combines with any overhaul.
                  </p>
                  <div className="thumb-grid">
                    {SKINS.map((s) => (
                      <ThemeThumbnail
                        key={s.id}
                        skin={s.id as SkinId}
                        overhaul={overhaul}
                        active={skin === s.id}
                        onClick={() => setSkin(s.id)}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="settings-h3">Accent</h3>
                  <p className="text-faint settings-sub">Overrides the skin's native accent.</p>
                  <div className="accent-row">
                    {ACCENTS.map((a) => (
                      <button
                        key={a.name}
                        className={`accent-dot ${accent === a.value ? "accent-dot-active" : ""}`}
                        style={{ background: a.value || "var(--accent)" }}
                        title={a.name}
                        onClick={() => setAccent(a.value)}
                      >
                        {accent === a.value && <Check size={12} color={a.value ? "#000" : "inherit"} />}
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {tab === "visualizer" && (
              <>
                <section>
                  <h3 className="settings-h3">Shader style</h3>
                  <p className="text-faint settings-sub">
                    Rendered live on the GPU in the fullscreen player.
                  </p>
                  <div className="seg-row">
                    {(["orbs", "aurora", "rings"] as VizStyle[]).map((s) => (
                      <button
                        key={s}
                        className={`chip ${vizStyle === s ? "chip-active" : ""}`}
                        onClick={() => setVizStyle(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="settings-h3">Intensity</h3>
                  <input
                    type="range"
                    min={0.2}
                    max={1.5}
                    step={0.05}
                    value={vizIntensity}
                    onChange={(e) => setVizIntensity(parseFloat(e.target.value))}
                    className="settings-range"
                  />
                  <p className="text-faint settings-sub">
                    Honors your system "reduce motion" preference for animations.
                  </p>
                </section>
                <section>
                  <h3 className="settings-h3">Output volume</h3>
                  <p className="text-faint settings-sub">Current session volume: {Math.round(volume * 100)}%</p>
                </section>
              </>
            )}

            {tab === "about" && (
              <section className="about">
                <div className="about-logo">♩</div>
                <h2>Crescendo</h2>
                <p className="text-dim">
                  A beautiful, deeply customizable local music player.
                  <br />
                  macOS · Windows · Linux
                </p>
                <p className="text-faint">
                  Version 0.1.0 · UI preview build with simulated audio.
                  Native lossless engine, EQ DSP and folder scanning arrive next.
                </p>
              </section>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
