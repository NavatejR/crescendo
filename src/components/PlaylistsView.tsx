import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "../theme/store";
import { iconFor } from "../theme/iconSet";
import { useLibrary, isArtUrl } from "../lib/libraryStore";
import { native } from "../lib/native";
import { formatTime } from "../lib/mockLibrary";
import type { Track } from "../lib/types";
import ArtImage from "./ArtImage";

interface PlaylistRow {
  id: string;
  name: string;
  trackIds: string[];
}

function toRows(
  pls: { id: number | string; name: string; trackIds: (number | string)[] }[] | null | undefined,
): PlaylistRow[] {
  if (!pls) return [];
  return pls.map((p) => ({ id: String(p.id), name: p.name, trackIds: p.trackIds.map(String) }));
}

/** 2×2 mosaic of the first tracks' artwork. */
function PlaylistArt({ tracks }: { tracks: Track[] }) {
  const IListMusic = iconFor(useTheme((s) => s.skin), "playlists");
  if (tracks.length === 0) {
    return (
      <div className="pl-art-empty">
        <IListMusic size={22} />
      </div>
    );
  }
  return (
    <>
      {tracks.slice(0, 4).map((t, i) =>
        isArtUrl(t.art) ? (
          <ArtImage key={t.id} src={t.art} className="pl-art-img" />
        ) : (
          <div key={t.id ?? i} style={{ background: t.art ?? "var(--surface-2)" }} />
        ),
      )}
    </>
  );
}

export function PlaylistsView({ onPlay }: { onPlay: (t: Track[], idx?: number) => void }) {
  const allTracks = useLibrary((s) => s.tracks);
  const refreshLibrary = useLibrary((s) => s.refresh);
  const ready = useLibrary((s) => s.ready);
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const skin = useTheme((s) => s.skin);
  const IPlay = iconFor(skin, "play");
  const IPlus = iconFor(skin, "plus");
  const IFolder = iconFor(skin, "folderOpen");
  const IListMusic = iconFor(skin, "playlists");
  const IClose = iconFor(skin, "close");

  const load = async () => setPlaylists(toRows(await native.listPlaylists()));

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const tracksOf = (pl: PlaylistRow) =>
    pl.trackIds.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean) as Track[];

  async function create() {
    if (!name.trim()) return;
    await native.createPlaylist(name.trim());
    setName("");
    setCreating(false);
    await load();
  }

  async function addTrackIds(playlistId: string, ids: string[]) {
    for (const id of ids) await native.addToPlaylist(Number(playlistId), Number(id));
    await load();
  }

  async function importFiles(playlistId: string) {
    const files = await native.pickFiles();
    if (!files.length) return;
    setBusy(true);
    setNotice("");
    const ids = await native.importFiles(files);
    if (ids && ids.length) {
      await addTrackIds(playlistId, ids.map(String));
      await refreshLibrary();
    }
    setNotice(
      ids && ids.length
        ? `Imported ${ids.length} file${ids.length === 1 ? "" : "s"}`
        : "Nothing to import",
    );
    setBusy(false);
  }

  async function addFolder(playlistId: string) {
    const dir = await native.pickFolder();
    if (!dir) return;
    setBusy(true);
    setNotice("");
    const n = await native.addFolderToPlaylist(Number(playlistId), dir);
    await refreshLibrary();
    await load();
    setNotice(n ? `Added ${n} track${n === 1 ? "" : "s"} from folder` : "Folder scanned");
    setBusy(false);
  }

  async function removeTrack(playlistId: string, trackId: string) {
    await native.removeFromPlaylist(Number(playlistId), Number(trackId));
    await load();
  }

  const open = playlists.find((p) => p.id === openId) ?? null;
  const picker = playlists.find((p) => p.id === pickerId) ?? null;

  return (
    <div className="playlists-view">
      {notice && <div className="pl-toast text-faint">{notice}</div>}
      <div className="pl-grid">
        {playlists.map((pl, i) => {
          const tracks = tracksOf(pl);
          return (
            <motion.div
              key={pl.id}
              className="pl-card panel"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
            >
              <button
                type="button"
                className="pl-art"
                onClick={() => setOpenId(pl.id)}
                title={`Open ${pl.name}`}
              >
                <PlaylistArt tracks={tracks} />
              </button>
              <button type="button" className="pl-name pl-name-btn" onClick={() => setOpenId(pl.id)}>
                {pl.name}
              </button>
              <span className="text-faint">{pl.trackIds.length} tracks</span>
              <div className="pl-actions">
                <button className="btn" onClick={() => onPlay(tracks)} disabled={!tracks.length}>
                  <IPlay size={13} /> Play
                </button>
                <button
                  className="icon-btn"
                  title="Delete playlist"
                  onClick={async () => {
                    await native.deletePlaylist(Number(pl.id));
                    await load();
                  }}
                >
                  <IClose size={14} />
                </button>
              </div>
              <div className="pl-btns">
                <button className="btn" onClick={() => setPickerId(pl.id)} title="Add from library">
                  <IPlus size={13} /> Add
                </button>
                <button
                  className="btn"
                  onClick={() => importFiles(pl.id)}
                  disabled={busy}
                  title="Import music files"
                >
                  <IPlus size={13} /> Files
                </button>
                <button
                  className="btn"
                  onClick={() => addFolder(pl.id)}
                  disabled={busy}
                  title="Add a folder of music"
                >
                  <IFolder size={13} /> Folder
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
            <IPlus size={20} />
            <span>New playlist</span>
          </button>
        )}
      </div>
      <div className="pl-hint text-faint">
        <IListMusic size={13} /> Open a playlist to manage it · Add from your library, import files,
        or pull in a whole folder.
      </div>

      <AnimatePresence>
        {picker && (
          <TrackPicker
            key="picker"
            playlist={picker}
            allTracks={allTracks}
            onClose={() => setPickerId(null)}
            onConfirm={async (ids) => {
              await addTrackIds(picker.id, ids);
              setPickerId(null);
              setNotice(`Added ${ids.length} track${ids.length === 1 ? "" : "s"}`);
            }}
          />
        )}
        {open && (
          <PlaylistDetail
            key="detail"
            playlist={open}
            tracks={tracksOf(open)}
            onClose={() => setOpenId(null)}
            onPlay={onPlay}
            onRemove={(tid) => removeTrack(open.id, tid)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Playlist detail ---------------- */
function PlaylistDetail({
  playlist,
  tracks,
  onClose,
  onPlay,
  onRemove,
}: {
  playlist: PlaylistRow;
  tracks: Track[];
  onClose: () => void;
  onPlay: (t: Track[]) => void;
  onRemove: (trackId: string) => void;
}) {
  const skin = useTheme((s) => s.skin);
  const IPlay = iconFor(skin, "play");
  const IClose = iconFor(skin, "close");

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="pl-modal panel-glass"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pl-modal-head">
          <h2>{playlist.name}</h2>
          <span className="text-faint">{tracks.length} tracks</span>
          <button className="btn" onClick={() => onPlay(tracks)} disabled={!tracks.length}>
            <IPlay size={13} /> Play all
          </button>
          <button className="icon-btn" onClick={onClose}>
            <IClose size={16} />
          </button>
        </div>
        <div className="pl-track-list">
          {tracks.map((t, i) => (
            <div key={t.id} className="pl-track-row">
              <span className="pl-track-num text-faint">{i + 1}</span>
              <div className="pl-track-art">
                {isArtUrl(t.art) ? (
                  <ArtImage src={t.art} className="pl-art-img" />
                ) : (
                  <div style={{ background: t.art ?? "var(--surface-2)" }} />
                )}
              </div>
              <div className="pl-track-meta">
                <span className="pl-track-title">{t.title}</span>
                <span className="text-faint">{t.artist}</span>
              </div>
              <span className="text-faint pl-track-time">{formatTime(t.duration)}</span>
              <button
                className="icon-btn"
                title="Remove from playlist"
                onClick={() => onRemove(t.id)}
              >
                <IClose size={13} />
              </button>
            </div>
          ))}
          {tracks.length === 0 && (
            <p className="text-faint pl-empty">Empty — add tracks, import files, or pull in a folder.</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Library track picker ---------------- */
function TrackPicker({
  playlist,
  allTracks,
  onClose,
  onConfirm,
}: {
  playlist: PlaylistRow;
  allTracks: Track[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const skin = useTheme((s) => s.skin);
  const IClose = iconFor(skin, "close");
  const ISearch = iconFor(skin, "search");
  const ICheck = iconFor(skin, "check");

  const existing = useMemo(() => new Set(playlist.trackIds), [playlist.trackIds]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return allTracks;
    return allTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(s) ||
        t.artist.toLowerCase().includes(s) ||
        (t.albumTitle ?? "").toLowerCase().includes(s),
    );
  }, [q, allTracks]);

  function toggle(id: string) {
    if (existing.has(id)) return;
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="pl-modal panel-glass"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pl-modal-head">
          <h2>Add to “{playlist.name}”</h2>
          <span className="text-faint">{sel.size} selected</span>
          <button
            className="btn btn-accent"
            onClick={() => onConfirm([...sel])}
            disabled={sel.size === 0}
          >
            Add {sel.size || ""}
          </button>
          <button className="icon-btn" onClick={onClose}>
            <IClose size={16} />
          </button>
        </div>
        <div className="pl-picker-search">
          <ISearch size={14} className="text-faint" />
          <input
            className="input"
            placeholder="Search your library…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="pl-track-list">
          {filtered.map((t) => {
            const inList = existing.has(t.id);
            const picked = sel.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={`pl-pick-row ${picked ? "pl-pick-on" : ""} ${inList ? "pl-pick-in" : ""}`}
                onClick={() => toggle(t.id)}
                disabled={inList}
              >
                <span className={`pl-pick-check ${picked ? "pl-pick-check-on" : ""}`}>
                  {picked && <ICheck size={12} />}
                </span>
                <span className="pl-track-meta">
                  <span className="pl-track-title">{t.title}</span>
                  <span className="text-faint">
                    {t.artist}
                    {t.albumTitle ? ` — ${t.albumTitle}` : ""}
                  </span>
                </span>
                <span className="text-faint pl-track-time">
                  {inList ? "In playlist" : formatTime(t.duration)}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="text-faint pl-empty">No matching tracks.</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Add-to-playlist dialog (track rows) ---------------- */
export function AddToPlaylistDialog({ trackId, onClose }: { trackId: string; onClose: () => void }) {
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [name, setName] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const skin = useTheme((s) => s.skin);
  const IClose = iconFor(skin, "close");
  const IPlus = iconFor(skin, "plus");
  const IListMusic = iconFor(skin, "playlists");

  useEffect(() => {
    native.listPlaylists().then((p) => setPlaylists(toRows(p)));
  }, []);

  async function add(id: string) {
    await native.addToPlaylist(Number(id), Number(trackId));
    setDone(id);
    setTimeout(onClose, 500);
  }

  async function create() {
    if (!name.trim()) return;
    const id = await native.createPlaylist(name.trim());
    if (id != null) await add(String(id));
  }

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="pl-modal pl-modal-sm panel-glass"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pl-modal-head">
          <h2>Add to playlist</h2>
          <button className="icon-btn" onClick={onClose}>
            <IClose size={16} />
          </button>
        </div>
        <div className="pl-track-list">
          {playlists.map((pl) => (
            <button
              key={pl.id}
              type="button"
              className="pl-pick-row"
              onClick={() => add(pl.id)}
              disabled={done !== null}
            >
              <IListMusic size={14} className="text-faint" />
              <span className="pl-track-meta">
                <span className="pl-track-title">{pl.name}</span>
                <span className="text-faint">{pl.trackIds.length} tracks</span>
              </span>
              {done === pl.id && <span className="text-faint">Added ✓</span>}
            </button>
          ))}
          {playlists.length === 0 && <p className="text-faint pl-empty">No playlists yet — create one below.</p>}
        </div>
        <div className="pl-picker-search">
          <IPlus size={14} className="text-faint" />
          <input
            className="input"
            placeholder="New playlist name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
          />
          <button className="btn" onClick={create} disabled={!name.trim()}>
            Create
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
