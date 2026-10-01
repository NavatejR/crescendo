import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Disc3 } from "lucide-react";
import { usePlayer } from "../player/store";
import { useTheme } from "../theme/store";
import { iconFor } from "../theme/iconSet";
import { formatTime } from "../lib/mockLibrary";
import { useTrackById, useAlbumById, useLibrary, isArtUrl, artBackground } from "../lib/libraryStore";
import { useUI } from "../lib/uiStore";
import LavaGradient from "./LavaGradient";
import ArtImage from "./ArtImage";

export default function NowPlaying({ onClose }: { onClose: () => void }) {
  const [queueOpen, setQueueOpen] = useState(false);
  const skin = useTheme((s) => s.skin);
  const I = {
    play: iconFor(skin, "play"),
    pause: iconFor(skin, "pause"),
    prev: iconFor(skin, "prev"),
    next: iconFor(skin, "next"),
    shuffle: iconFor(skin, "shuffle"),
    repeat: iconFor(skin, "repeat"),
    repeat1: iconFor(skin, "repeat1"),
    volume: iconFor(skin, "volume"),
    queue: iconFor(skin, "queue"),
    close: iconFor(skin, "close"),
  };
  const {
    status, queue, index, position, duration, volume, muted,
    shuffle, repeat, togglePlay, next, prev, seek, setVolume, toggleShuffle, cycleRepeat, playQueueIndex,
  } = usePlayer();
  const { vizIntensity, setVizIntensity } = useUI();

  const queuedId = index >= 0 && index < queue.length ? queue[index] : undefined;
  const track = useTrackById(queuedId);
  const album = useAlbumById(track?.albumId);
  const allTracks = useLibrary((s) => s.tracks);
  const art = album?.art ?? track?.art;
  const palette = album?.artPalette ?? track?.artPalette;
  const progress = duration ? position / duration : 0;

  // Palette-derived gradient shown beneath cover art (and as its fallback).
  const artBase = artBackground(art, palette);

  return (
    <motion.div
      className="np np-opaque"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
    >
      {/* Lava-lamp backdrop built from the album's cover palette */}
      <LavaGradient
        palette={palette}
        seed={album?.id ?? "np"}
        intensity={vizIntensity}
        active={status === "playing"}
        className="np-viz"
      />

      <div className="np-top">
        <button className="icon-btn" onClick={onClose} title="Close (⌘F)">
          <ChevronDown size={20} />
        </button>
        <span className="np-eyebrow text-dim">
          {album ? album.title : "Now Playing"}
        </span>
        <div className="np-top-actions">
          <button
            className={`icon-btn ${queueOpen ? "toggled" : ""}`}
            onClick={() => setQueueOpen((v) => !v)}
            title="Queue"
          >
            <I.queue size={17} />
          </button>
        </div>
      </div>

      <div className="np-stage">
        <motion.div
          className={`np-art ${status === "playing" ? "np-art-playing" : ""}`}
          style={{ background: isArtUrl(art) ? artBase : (art ?? artBase) }}
          layout
        >
          {isArtUrl(art) ? (
            <ArtImage src={art} className="np-art-img" />
          ) : (
            <div className="np-art-orb" /> /* specular highlight only for placeholder art */
          )}
          {track?.lossless && (
            <span className="np-lossless">
              LOSSLESS{track.sampleRate ? ` · ${(track.sampleRate / 1000).toFixed(1)}kHz` : ""}
              {track.bitDepth ? ` · ${track.bitDepth}-bit` : ""}
            </span>
          )}
        </motion.div>

        <div className="np-info">
          <h1 className="np-title">{track?.title ?? "Nothing playing"}</h1>
          <p className="np-artist text-dim">
            {track
              ? `${track.artist} — ${album?.title ?? track.albumTitle ?? ""}${album?.year ? ` · ${album.year}` : track.year ? ` · ${track.year}` : ""}`
              : "Choose something from your library"}
          </p>
          <div className="np-format text-faint">
            <Disc3 size={12} />
            <span>{track ? `${track.format}${track.bitrate ? ` · ${track.bitrate} kbps` : ""}` : "—"}</span>
          </div>
        </div>

        <div className="np-seekrow">
          <span className="text-faint">{formatTime(position)}</span>
          <div
            className="np-seek"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              seek(((e.clientX - r.left) / r.width) * duration);
            }}
          >
            <div className="np-seek-fill" style={{ width: `${progress * 100}%` }} />
            <div className="np-seek-knob" style={{ left: `${progress * 100}%` }} />
          </div>
          <span className="text-faint">{formatTime(duration)}</span>
        </div>

        <div className="np-controls">
          <button className={`icon-btn ${shuffle ? "toggled" : ""}`} onClick={toggleShuffle}>
            <I.shuffle size={17} />
          </button>
          <button className="icon-btn" onClick={prev}><I.prev size={22} /></button>
          <button className="np-play" onClick={togglePlay}>
            {status === "playing" ? <I.pause size={24} /> : <I.play size={24} style={{ marginLeft: 3 }} />}
          </button>
          <button className="icon-btn" onClick={next}><I.next size={22} /></button>
          <button className={`icon-btn ${repeat !== "off" ? "toggled" : ""}`} onClick={cycleRepeat}>
            {repeat === "one" ? <I.repeat1 size={17} /> : <I.repeat size={17} />}
          </button>
        </div>

        <div className="np-viz-picker">
          <span className="text-faint np-viz-note">{album?.title ?? "Orb visualizer"}</span>
          <input
            type="range"
            min={0.2}
            max={1.5}
            step={0.05}
            value={vizIntensity}
            onChange={(e) => setVizIntensity(parseFloat(e.target.value))}
            className="np-intensity"
            title="Visualizer intensity"
          />
        </div>
      </div>

      {/* Queue drawer */}
      <AnimatePresence>
        {queueOpen && (
          <motion.aside
            className="np-queue panel-glass"
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            <div className="np-queue-head">
              <span>Queue · {queue.length}</span>
              <button className="icon-btn" onClick={() => setQueueOpen(false)}><I.close size={15} /></button>
            </div>
            <div className="np-queue-list">
              {queue.map((id, i) => {
                const t = allTracks.find((x) => x.id === id);
                if (!t) return null;
                return (
                  <button
                    key={`${id}-${i}`}
                    className={`np-queue-row ${i === index ? "np-queue-now" : ""}`}
                    onClick={() => playQueueIndex(i)}
                  >
                    <span className="np-queue-num text-faint">{i + 1}</span>
                    <div className="np-queue-meta">
                      <span className="np-queue-title">{t.title}</span>
                      <span className="text-faint">{t.artist}</span>
                    </div>
                    <span className="text-faint">{formatTime(t.duration)}</span>
                  </button>
                );
              })}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Volume pill bottom-left */}
      <div className="np-volume">
        <I.volume size={15} className="text-dim" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          aria-label="Volume"
        />
      </div>
    </motion.div>
  );
}
