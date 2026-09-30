import { useRef } from "react";
import { usePlayer } from "../player/store";
import { formatTime } from "../lib/mockLibrary";
import { useTrackById, useAlbumById, isArtUrl } from "../lib/libraryStore";
import { useTheme } from "../theme/store";
import { iconFor } from "../theme/iconSet";
import MiniOrb from "./MiniOrb";

export default function Playbar({
  onExpand,
  onToggleEQ,
}: {
  onExpand: () => void;
  onToggleEQ: () => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const skin = useTheme((s) => s.skin);
  const I = {
    shuffle: iconFor(skin, "shuffle"),
    prev: iconFor(skin, "prev"),
    play: iconFor(skin, "play"),
    pause: iconFor(skin, "pause"),
    next: iconFor(skin, "next"),
    repeat: iconFor(skin, "repeat"),
    repeat1: iconFor(skin, "repeat1"),
    volume: iconFor(skin, "volume"),
    mute: iconFor(skin, "mute"),
    eq: iconFor(skin, "eq"),
    expand: iconFor(skin, "expand"),
    favorite: iconFor(skin, "favorite"),
  };
  const {
    status, queue, index, position, duration, volume, muted,
    shuffle, repeat, togglePlay, next, prev, seek, setVolume,
    toggleMute, toggleShuffle, cycleRepeat,
  } = usePlayer();

  const queuedId = index >= 0 && index < queue.length ? queue[index] : undefined;
  const track = useTrackById(queuedId);
  const album = useAlbumById(track?.albumId);
  const art = album?.art ?? track?.art;

  function onSeek(e: React.MouseEvent) {
    const el = barRef.current;
    if (!el || !duration) return;
    const r = el.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * duration);
  }

  return (
    <footer className="playbar panel-glass sheen">
      {/* Left: artwork + meta */}
      <div className="pb-left">
        <div
          className={`pb-art ${track ? "" : "pb-art-empty"}`}
          style={{ background: isArtUrl(art) ? undefined : art }}
          onClick={onExpand}
          role="button"
        >
          {isArtUrl(art) && <img src={art} alt="" className="pb-art-img" draggable={false} />}
          {status === "playing" && <div className="pb-art-sheen" />}
        </div>
        <div className="pb-meta">
          <span className="pb-title">{track?.title ?? "Nothing playing"}</span>
          <span className="pb-artist text-dim">
            {track ? `${track.artist} · ${album?.title ?? track.albumTitle ?? ""}` : "Pick a track to begin"}
          </span>
        </div>
        <button className="icon-btn" title="Favorite"><I.favorite size={15} /></button>
      </div>

      {/* Center: transport + seek */}
      <div className="pb-center">
        <div className="pb-transport">
          <button
            className={`icon-btn ${shuffle ? "toggled" : ""}`}
            onClick={toggleShuffle}
            title="Shuffle"
          >
            <I.shuffle size={15} />
          </button>
          <button className="icon-btn" onClick={prev} title="Previous"><I.prev size={17} /></button>
          <button className="pb-play" onClick={togglePlay} title="Play/Pause (Space)">
            {status === "playing" ? <I.pause size={19} /> : <I.play size={19} style={{ marginLeft: 2 }} />}
          </button>
          <button className="icon-btn" onClick={next} title="Next"><I.next size={17} /></button>
          <button
            className={`icon-btn ${repeat !== "off" ? "toggled" : ""}`}
            onClick={cycleRepeat}
            title={`Repeat: ${repeat}`}
          >
            {repeat === "one" ? <I.repeat1 size={15} /> : <I.repeat size={15} />}
          </button>
        </div>
        <div className="pb-seekrow">
          <span className="pb-time text-faint">{formatTime(position)}</span>
          <div className="pb-seek" ref={barRef} onClick={onSeek}>
            <div className="pb-seek-fill" style={{ width: `${duration ? (position / duration) * 100 : 0}%` }} />
            <div
              className="pb-seek-knob"
              style={{ left: `${duration ? (position / duration) * 100 : 0}%` }}
            />
          </div>
          <span className="pb-time text-faint">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: mini visualizer + volume + extras */}
      <div className="pb-right">
        <MiniOrb />
        <div className="pb-volume">
          <button className="icon-btn" onClick={toggleMute} title="Mute">
            {muted || volume === 0 ? <I.mute size={16} /> : <I.volume size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="pb-vol-slider"
            aria-label="Volume"
          />
        </div>
        <button className="icon-btn" onClick={onToggleEQ} title="Equalizer (⌘E)">
          <I.eq size={16} />
        </button>
        <button className="icon-btn" onClick={onExpand} title="Full screen player (⌘F)">
          <I.expand size={15} />
        </button>
      </div>
    </footer>
  );
}
