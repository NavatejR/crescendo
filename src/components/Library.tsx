import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play, Plus, ListMusic, Folder as FolderIcon, SlidersHorizontal, Clock3, FolderOpen, RefreshCw,
} from "lucide-react";
import type { ViewId } from "../App";
import { formatTime } from "../lib/mockLibrary";
import { useLibrary, isArtUrl } from "../lib/libraryStore";
import { native } from "../lib/native";
import { usePlayer } from "../player/store";
import type { Album, Track } from "../lib/types";

export default function Library({ view }: { view: ViewId }) {
  const { tracks, albums, ready, native: nativeMode } = useLibrary();
  const { search, setSearch } = useUI();
  const playTrackList = usePlayer((s) => s.playTrackList);

  const q = search.trim().toLowerCase();

  const filteredTracks = useMemo(() => {
    if (!q) return tracks;
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.albumTitle ?? "").toLowerCase().includes(q),
    );
  }, [tracks, q]);

  const filteredAlbums = useMemo(() => {
    if (!q) return albums;
    return albums.filter(
      (a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q),
    );
  }, [albums, q]);

  if (!ready) {
    return (
      <div className="eq-landing">
        <RefreshCw size={20} className="text-faint" />
        <p className="text-faint">Loading library…</p>
      </div>
    );
  }

  return (
    <div className="library">
      <header className="lib-head">
        <motion.h1
          key={view}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
        >
          {view === "albums" && "Albums"}
          {view === "artists" && "Artists"}
          {view === "tracks" && "All Tracks"}
          {view === "folders" && "Folders"}
          {view === "playlists" && "Playlists"}
          {view === "eq" && "Equalizer"}
        </motion.h1>
        {view !== "eq" && (
          <input
            className="input lib-search"
            placeholder="Filter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="lib-body"
        >
          {view === "albums" && (filteredAlbums.length ? (
            <AlbumsView albums={filteredAlbums} onPlay={playTrackList} />
          ) : (
            <EmptyLibrary nativeMode={nativeMode} />
          ))}
          {view === "artists" && <ArtistsView tracks={filteredTracks} onPlay={playTrackList} />}
          {view === "tracks" && <TracksView tracks={filteredTracks} onPlay={playTrackList} />}
          {view === "folders" && <FoldersView />}
          {view === "playlists" && <PlaylistsView onPlay={playTrackList} />}
          {view === "eq" && <EQView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// useUI import placed here to avoid circular import warnings
import { useUI } from "../lib/uiStore";

/* ---------------- Empty state ---------------- */
function EmptyLibrary({ nativeMode }: { nativeMode: boolean }) {
  const [busy, setBusy] = useState(false);
  async function add() {
    setBusy(true);
    const dir = await native.pickFolder();
    if (dir) await native.addFolder(dir);
    setBusy(false);
  }
  return (
    <div className="eq-landing">
      <FolderOpen size={30} className="text-faint" />
      <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Welcome to Crescendo</h2>
      <p className="text-dim" style={{ maxWidth: 380, margin: "0 0 8px" }}>
        Add a folder of music to begin. FLAC, ALAC, WAV, AIFF, MP3, AAC, OGG and Opus are supported — lossless formats get the badge.
      </p>
      {nativeMode ? (
        <button className="btn btn-accent" onClick={add} disabled={busy}>
          <FolderOpen size={14} /> {busy ? "Adding…" : "Choose a music folder"}
        </button>
      ) : (
        <p className="text-faint">Running in preview mode with a demo library — the desktop app scans real folders.</p>
      )}
    </div>
  );
}

/* ---------------- Albums ---------------- */
function AlbumsView({ albums, onPlay }: { albums: Album[]; onPlay: (t: Track[]) => void }) {
  const allTracks = useLibrary((s) => s.tracks);
  return (
    <div className="album-grid">
      {albums.map((al, i) => {
        const tracks = allTracks.filter((t) => t.albumId === al.id);
        return (
          <motion.div
            key={al.id}
            className="album-card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.4), type: "spring", stiffness: 260, damping: 24 }}
            whileHover={{ y: -4 }}
          >
            <div className="album-art" style={{ background: isArtUrl(al.art) ? undefined : al.art }}>
              {isArtUrl(al.art) && (
                <img src={al.art} alt="" className="album-art-img" draggable={false} />
              )}
              <button className="album-play" onClick={() => onPlay(tracks)} title={`Play ${al.title}`}>
                <Play size={16} style={{ marginLeft: 2 }} />
              </button>
            </div>
            <span className="album-title">{al.title}</span>
            <span className="album-artist text-dim">{al.artist}{al.year ? ` · ${al.year}` : ""}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ---------------- Artists ---------------- */
function ArtistsView({ tracks, onPlay }: { tracks: Track[]; onPlay: (t: Track[]) => void }) {
  const byArtist = useMemo(() => {
    const map = new Map<string, Track[]>();
    for (const t of tracks) {
      if (!map.has(t.artist)) map.set(t.artist, []);
      map.get(t.artist)!.push(t);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tracks]);

  return (
    <div className="artist-list">
      {byArtist.map(([artist, list], i) => (
        <motion.div
          key={artist}
          className="artist-row panel"
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: Math.min(i * 0.04, 0.4) }}
        >
          <div className="artist-avatar">{artist.slice(0, 1).toUpperCase()}</div>
          <div className="artist-info">
            <span className="artist-name">{artist}</span>
            <span className="text-faint">{list.length} tracks</span>
          </div>
          <button className="btn" onClick={() => onPlay(list)}>
            <Play size={14} /> Play
          </button>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------------- Tracks ---------------- */
function TracksView({ tracks, onPlay }: { tracks: Track[]; onPlay: (t: Track[], idx?: number) => void }) {
  const currentId = usePlayer((s) => (s.index >= 0 ? s.queue[s.index] : undefined));
  const status = usePlayer((s) => s.status);

  return (
    <div className="track-table panel">
      <div className="track-row track-head">
        <span className="tr-num">#</span>
        <span className="tr-title">Title</span>
        <span className="tr-artist">Artist</span>
        <span className="tr-album">Album</span>
        <span className="tr-format">Format</span>
        <span className="tr-time"><Clock3 size={12} /></span>
      </div>
      {tracks.map((t, i) => {
        const isCur = t.id === currentId;
        return (
          <div
            key={t.id}
            className={`track-row ${isCur ? "track-row-current" : ""}`}
            onDoubleClick={() => onPlay(tracks, i)}
          >
            <span className="tr-num text-faint">{isCur && status === "playing" ? "▶" : i + 1}</span>
            <span className="tr-title">
              {t.title}
              {t.lossless && <span className="badge-lossless">LOSSLESS</span>}
            </span>
            <span className="tr-artist text-dim">{t.artist}</span>
            <span className="tr-album text-dim">{t.albumTitle ?? ""}</span>
            <span className="tr-format text-faint">
              {t.format}
              {t.sampleRate ? ` · ${(t.sampleRate / 1000).toFixed(0)}/${t.bitDepth ?? "?"}` : ""}
            </span>
            <span className="tr-time text-faint">{formatTime(t.duration)}</span>
            <button className="icon-btn tr-play" onClick={() => onPlay(tracks, i)} title="Play">
              <Play size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Folders ---------------- */
function FoldersView() {
  const [folders, setFolders] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useMemo(() => {
    native.listFolders().then((f) => setFolders(f ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    setBusy(true);
    const dir = await native.pickFolder();
    if (dir) {
      await native.addFolder(dir);
      setFolders((await native.listFolders()) ?? []);
    }
    setBusy(false);
  }

  async function remove(path: string) {
    await native.removeFolder(path);
    setFolders((await native.listFolders()) ?? []);
  }

  async function rescan() {
    setBusy(true);
    await native.rescanAll();
    setBusy(false);
  }

  return (
    <div className="folders-view">
      <div className="panel folders-card">
        <FolderIcon size={22} className="text-dim" />
        <div>
          <span className="folders-title">Watched folders</span>
          <p className="text-faint">
            Scanned recursively — FLAC, ALAC, WAV, AIFF, MP3, AAC, OGG, Opus. Files are tagged, artwork extracted, everything stays offline.
          </p>
        </div>
        <button className="btn btn-accent" onClick={add} disabled={busy}>
          <Plus size={14} /> Add folder
        </button>
        <button className="btn" onClick={rescan} disabled={busy} title="Rescan all folders">
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="folder-tree">
        {folders.map((f) => (
          <div key={f} className="folder-node">
            <FolderIcon size={14} className="text-faint" />
            <span>{f}</span>
            <button className="icon-btn folder-remove" onClick={() => remove(f)} title="Remove folder">
              ×
            </button>
          </div>
        ))}
        {folders.length === 0 && (
          <div className="folder-node text-faint">
            No folders yet — add one to build your library.
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Playlists ---------------- */
function PlaylistsView({ onPlay }: { onPlay: (t: Track[], idx?: number) => void }) {
  const allTracks = useLibrary((s) => s.tracks);
  const [playlists, setPlaylists] = useState<{ id: string; name: string; trackIds: string[] }[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const loaded = useLibrary((s) => s.ready);

  async function load() {
    const pls = await native.listPlaylists();
    if (pls) {
      setPlaylists(
        pls.map((p) => ({
          id: String(p.id),
          name: p.name,
          trackIds: p.trackIds.map(String),
        })),
      );
    }
  }

  useEffect(() => {
    if (loaded) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  async function create() {
    if (!name.trim()) return;
    await native.createPlaylist(name.trim());
    setName("");
    setCreating(false);
    await load();
  }

  return (
    <div className="playlists-view">
      <div className="pl-grid">
        {playlists.map((pl, i) => {
          const tracks = pl.trackIds
            .map((id) => allTracks.find((t) => t.id === id))
            .filter(Boolean) as Track[];
          return (
            <motion.div
              key={pl.id}
              className="pl-card panel"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              onDoubleClick={() => onPlay(tracks)}
            >
              <div className="pl-art">
                {tracks.slice(0, 4).map((t, i) =>
                  isArtUrl(t.art) ? (
                    <img key={t.id} src={t.art} alt="" className="pl-art-img" draggable={false} />
                  ) : (
                    <div key={t.id ?? i} style={{ background: t.art ?? "var(--surface-2)" }} />
                  ),
                )}
              </div>
              <span className="pl-name">{pl.name}</span>
              <span className="text-faint">{pl.trackIds.length} tracks</span>
              <div className="pl-actions">
                <button className="btn" onClick={() => onPlay(tracks)}>
                  <Play size={13} /> Play
                </button>
                <button
                  className="icon-btn"
                  title="Delete playlist"
                  onClick={async () => {
                    await native.deletePlaylist(Number(pl.id));
                    await load();
                  }}
                >
                  ×
                </button>
              </div>
            </motion.div>
          );
        })}
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
            <Plus size={20} />
            <span>New playlist</span>
          </button>
        )}
      </div>
      <div className="pl-hint text-faint">
        <ListMusic size={13} /> Double-click a playlist to play it.
      </div>
    </div>
  );
}

/* ---------------- EQ landing view ---------------- */
function EQView() {
  const showEQ = () => {
    document.querySelector<HTMLButtonElement>('[title="Equalizer (⌘E)"]')?.click();
  };
  return (
    <div className="eq-landing">
      <SlidersHorizontal size={22} className="text-dim" />
      <p className="text-dim">
        The 10-band parametric equalizer lives in a slide-up panel.
      </p>
      <button className="btn btn-accent" onClick={showEQ}>
        Open Equalizer
      </button>
    </div>
  );
}
