import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTheme } from "../theme/store";
import { iconFor } from "../theme/iconSet";
import { useLibrary } from "../lib/libraryStore";
import { native } from "../lib/native";
import { usePlayer } from "../player/store";
import type { Track } from "../lib/types";
import { PlaylistArt, formatTotal, toRows, type PlaylistRow } from "./PlaylistPage";
import { Stagger, StaggerItem } from "./Reveal";

export function PlaylistsView({ onOpen }: { onOpen: (pl: PlaylistRow) => void }) {
  const allTracks = useLibrary((s) => s.tracks);
  const ready = useLibrary((s) => s.ready);
  const playTrackList = usePlayer((s) => s.playTrackList);
  const playShuffled = usePlayer((s) => s.playShuffled);

  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  // Two-step delete: first click arms, second confirms. Prevents a stray click
  // from wiping a playlist, and gives the button a visible "confirm" state.
  const [arming, setArming] = useState<string | null>(null);
  const [delErr, setDelErr] = useState("");

  const skin = useTheme((s) => s.skin);
  const IPlay = iconFor(skin, "play");
  const IPlus = iconFor(skin, "plus");
  const IListMusic = iconFor(skin, "playlists");
  const IShuffle = iconFor(skin, "shuffle");
  const IClose = iconFor(skin, "close");

  const load = async () => setPlaylists(toRows(await native.listPlaylists()));

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Disarm a pending delete after a moment so an accidental second click
  // somewhere else can't be mistaken for confirmation.
  useEffect(() => {
    if (!arming) return;
    const t = setTimeout(() => setArming(null), 3200);
    return () => clearTimeout(t);
  }, [arming]);

  const tracksOf = (pl: PlaylistRow) =>
    pl.trackIds.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean) as Track[];

  async function create() {
    if (!name.trim()) return;
    await native.createPlaylist(name.trim());
    setName("");
    setCreating(false);
    await load();
  }

  async function requestDelete(pl: PlaylistRow) {
    if (arming !== pl.id) {
      setDelErr("");
      setArming(pl.id);
      return;
    }
    setArming(null);
    try {
      await native.deletePlaylist(Number(pl.id));
    } catch {
      setDelErr(`Couldn't delete “${pl.name}”.`);
    }
    await load();
  }

  return (
    <div className="playlists-view">
      <Stagger className="pl-grid" step={0.05}>
        {playlists.map((pl) => {
          const tracks = tracksOf(pl);
          const total = tracks.reduce((s, t) => s + (t.duration ?? 0), 0);
          return (
            <StaggerItem key={pl.id}>
              <motion.div
                className="pl-card panel"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="pl-art-wrap">
                  <button
                    type="button"
                    className="pl-art"
                    onClick={() => onOpen(pl)}
                    title={`Open ${pl.name}`}
                  >
                    <PlaylistArt tracks={tracks} />
                  </button>
                  <button
                    className="pl-play-fab"
                    title="Play"
                    onClick={() => playTrackList(tracks)}
                    disabled={!tracks.length}
                  >
                    <IPlay size={17} style={{ marginLeft: 2 }} />
                  </button>
                  <button
                    className={`icon-btn pl-del ${arming === pl.id ? "pl-del-armed" : ""}`}
                    title={arming === pl.id ? "Click again to delete" : "Delete playlist"}
                    onClick={() => requestDelete(pl)}
                  >
                    <IClose size={14} />
                  </button>
                </div>
                <button type="button" className="pl-name pl-name-btn" onClick={() => onOpen(pl)}>
                  {pl.name}
                </button>
                <span className="pl-meta text-faint">
                  {pl.trackIds.length} tracks · {formatTotal(total)}
                </span>
                <div className="pl-actions">
                  <button
                    className="btn"
                    onClick={() => playShuffled(tracks)}
                    disabled={!tracks.length}
                    title="Shuffle play"
                  >
                    <IShuffle size={13} /> Shuffle
                  </button>
                  <button className="btn" onClick={() => onOpen(pl)}>
                    <IListMusic size={13} /> Open
                  </button>
                </div>
              </motion.div>
            </StaggerItem>
          );
        })}
        <StaggerItem>
          {creating ? (
            <div className="pl-card panel pl-new">
              <input
                autoFocus
                className="input"
                placeholder="Playlist name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") create();
                  if (e.key === "Escape") setCreating(false);
                }}
              />
            </div>
          ) : (
            <button className="pl-card panel pl-add" onClick={() => setCreating(true)}>
              <IPlus size={20} />
              <span>New playlist</span>
            </button>
          )}
        </StaggerItem>
      </Stagger>
      <div className="pl-hint text-faint">
        <IListMusic size={13} /> Open a playlist to add tracks, import files or pull in a folder.
      </div>
      {delErr && <div className="pl-err">{delErr}</div>}
    </div>
  );
}