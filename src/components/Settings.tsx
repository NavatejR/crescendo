import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SKINS, OVERHAULS, ACCENTS, type SkinId, type OverhaulId } from "../theme/skins";
import { iconFor } from "../theme/iconSet";
import { useTheme } from "../theme/store";
import ThemeThumbnail from "../theme/ThemeThumbnail";
import LavaGradient from "./LavaGradient";
import { useUI } from "../lib/uiStore";
import { usePlayer } from "../player/store";

type Tab = "appearance" | "visualizer" | "about";

export default function Settings({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("appearance");
  const { skin, overhaul, accent, setSkin, setOverhaul, setAccent } = useTheme();
  const { vizIntensity, setVizIntensity } = useUI();
  const volume = usePlayer((s) => s.volume);
  const I = {
    close: iconFor(skin, "close"),
    palette: iconFor(skin, "palette"),
    sparkles: iconFor(skin, "sparkles"),
    info: iconFor(skin, "info"),
    check: iconFor(skin, "check"),
  };

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
                  ["appearance", "Appearance", I.palette],
                  ["visualizer", "Visualizer", I.sparkles],
                  ["about", "About", I.info],
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
            <button className="icon-btn" onClick={onClose}><I.close size={17} /></button>
          </div>

          <div className="settings-body">
            {tab === "appearance" && (
              <>
                <section>
                  <h3 className="settings-h3">Interface overhaul</h3>
                  <p className="text-faint settings-sub">
                    A full structural redesign — shell layout, navigation, grid format and
                    transport all change, not just the finish.
                  </p>
                  <div className="thumb-grid">
                    {OVERHAULS.map((o) => (
                      <ThemeThumbnail
                        key={o.id}
                        skin={skin}
                        overhaul={o.id as OverhaulId}
                        axis="overhaul"
                        active={overhaul === o.id}
                        onClick={() => setOverhaul(o.id)}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="settings-h3">Skin</h3>
                  <p className="text-faint settings-sub">
                    Identity — colors, typography and the icon set. Combines with any overhaul.
                  </p>
                  <div className="thumb-grid">
                    {SKINS.map((s) => (
                      <ThemeThumbnail
                        key={s.id}
                        skin={s.id as SkinId}
                        overhaul={overhaul}
                        axis="skin"
                        active={skin === s.id}
                        onClick={() => setSkin(s.id)}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="settings-h3">Accent</h3>
                  <p className="text-faint settings-sub">Overrides the skin's native accent — UI and visualizer alike.</p>
                  <div className="accent-row">
                    {ACCENTS.map((a) => (
                      <button
                        key={a.name}
                        className={`accent-dot ${accent === a.value ? "accent-dot-active" : ""}`}
                        style={{ background: a.value || "var(--accent)" }}
                        title={a.name}
                        onClick={() => setAccent(a.value)}
                      >
                        {accent === a.value && <I.check size={12} color={a.value ? "#000" : "inherit"} />}
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {tab === "visualizer" && (
              <>
                <section className="viz-preview">
                  <div className="viz-preview-box">
                    <LavaGradient seed="preview" intensity={vizIntensity} active shade={false} />
                  </div>
                </section>
                <section>
                  <h3 className="settings-h3">Lava lamp</h3>
                  <p className="text-faint settings-sub">
                    The fullscreen player melts into a slow gradient built from the playing
                    album's cover colors, breathing gently with the music.
                  </p>
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
                  Version 0.1.0 · Native lossless engine (FLAC, ALAC, WAV, AIFF, MP3, AAC, OGG,
                  Opus) · 10-band EQ · offline library.
                  <br />
                  Visualizer: lava-lamp gradients generated from album artwork palettes.
                </p>
              </section>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
