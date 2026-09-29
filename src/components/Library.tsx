import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Plus, ListMusic, Folder as FolderIcon, SlidersHorizontal, Clock3 } from "lucide-react";
import type { ViewId } from "../App";
import { ALBUMS, TRACKS, PLAYLISTS_SEED, albumById, tracksOfAlbum, trackById, formatTime } from "../lib/mockLibrary";
import { usePlayer } from "../player/store";
import { useUI } from "../lib/uiStore";
import type { Album, Track } from "../lib/types";

export default function Library({ view }: { view: ViewId }) {
  const { search, setSearch } = useUI();
  const playTrackList = usePlayer((s) => s.playTrackList);

  const q = search.trim().toLowerCase();

  const filteredTracks = useMemo(() => {
    if (!q) return TRACKS;
    return TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        albumById(t.albumId).title.toLowerCase().includes(q),
    );
  }, [q]);

  const filteredAlbums = useMemo(() => {
    if (!q) return ALBUMS;
    return ALBUMS.filter(
      (a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q),
    );
  }, [q]);

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
          {view === "albums" && <AlbumsView albums={filteredAlbums} onPlay={playTrackList} />}
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

/* ---------------- Albums ---------------- */
function AlbumsView({ albums, onPlay }: { albums: Album[]; onPlay: (t: Track[]) => void }) {
  return (
    <div className="album-grid">
      {albums.map((al, i) => {
        const tracks = tracksOfAlbum(al.id);
        return (
          <motion.div
            key={al.id}
            className="album-card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.4), type: "spring", stiffness: 260, damping: 24 }}
            whileHover={{ y: -4 }}
          >
            <div className="album-art" style={{ background: al.art }}>
              <button
                className="album-play"
                onClick={() => onPlay(tracks)}
                title={`Play ${al.title}`}
              >
                <Play size={16} style={{ marginLeft: 2 }} />
              </button>
            </div>
            <span className="album-title">{al.title}</span>
            <span className="album-artist text-dim">{al.artist} · {al.year}</span>
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
          <div className="artist-avatar">{artist.slice(0, 1)}</div>
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
            <span className="tr-album text-dim">{albumById(t.albumId).title}</span>
            <span className="tr-format text-faint">
              {t.format}
              {t.sampleRate ? ` · ${(t.sampleRate / 1000).toFixed(0)}/${t.bitDepth}` : ""}
            </span>
            <span className="tr-time text-faint">{formatTime(t.duration)}</span>
            <button
              className="icon-btn tr-play"
              onClick={() => onPlay(tracks, i)}
              title="Play"
            >
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
  return (
    <div className="folders-view">
      <div className="panel folders-card">
        <FolderIcon size={22} className="text-dim" />
        <div>
          <span className="folders-title">Your music folders</span>
          <p className="text-faint">
            Folder-based library scanning lands with the native engine. The mock
            library mirrors ~/Music with 10 albums across lossless & lossy formats.
          </p>
        </div>
        <button className="btn btn-accent" disabled title="Arrives with the native scanner">
          <Plus size={14} /> Add folder
        </button>
      </div>
      <div className="folder-tree">
        {[...new Set(TRACKS.map((t) => t.artist))].map((artist) => (
          <div key={artist} className="folder-node">
            <FolderIcon size={14} className="text-faint" />
            <span>{artist}</span>
            <span className="text-faint folder-count">
              {new Set(tracksOfAlbumFilter(artist).map((t) => t.albumId)).size} albums
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
function tracksOfAlbumFilter(artist: string) {
  return TRACKS.filter((t) => t.artist === artist);
}

/* ---------------- Playlists ---------------- */
function PlaylistsView({ onPlay }: { onPlay: (t: Track[], idx?: number) => void }) {
  const [pls] = useState(PLAYLISTS_SEED);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="playlists-view">
      <div className="pl-grid">
        {pls.map((pl, i) => {
          const tracks = pl.trackIds.map(trackById).filter(Boolean) as Track[];
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
                {tracks.slice(0, 4).map((t) => (
                  <div key={t.id} style={{ background: albumById(t.albumId).art }} />
                ))}
              </div>
              <span className="pl-name">{pl.name}</span>
              <span className="text-faint">{pl.trackIds.length} tracks</span>
              <button className="btn" onClick={() => onPlay(tracks)}>
                <Play size={13} /> Play
              </button>
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
                if (e.key === "Enter" && name.trim()) setCreating(false);
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
        <ListMusic size={13} /> Playlists persist with the native library layer.
      </div>
    </div>
  );
}

/* ---------------- EQ landing view ---------------- */
function EQView() {
  const showEQ = () => {
    // EQPanel is toggled from the playbar; here we just deep-link visually.
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
