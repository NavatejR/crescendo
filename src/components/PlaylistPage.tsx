import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "../theme/store";
import { iconFor } from "../theme/iconSet";
import { useLibrary, isArtUrl } from "../lib/libraryStore";
import { native } from "../lib/native";
import { formatTime } from "../lib/mockLibrary";
import { usePlayer } from "../player/store";
import type { Track } from "../lib/types";
import ArtImage from "./ArtImage";
import { Stagger, StaggerItem } from "./Reveal";

export interface PlaylistRow {
  id: string;
  name: string;
  trackIds: string[];
}

export function toRows(
  pls: { id: number | string; name: string; trackIds: (number | string)[] }[] | null | undefined,
): PlaylistRow[] {
  if (!pls) return [];
  return pls.map((p) => ({ id: String(p.id), name: p.name, trackIds: p.trackIds.map(String) }));
}

/** Human total length: "42 min" or "1 hr 12 min". */
export function formatTotal(secs: number): string {
  if (!secs) return "0 min";
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
}

/**
 * Brightest swatch of a raw "r,g,b|r,g,b|…" palette, as an "r g b" triple,
 * picked by perceived luminance. The hero glow should read as light — a full
 * palette gradient is usually dominated by its dark last swatch, which is
 * exactly what made the hero look like a black box.
 */
function brightestSwatch(palette: string | undefined): string | null {
  let best: string | null = null;
  let bestLum = -1;
  for (const entry of (palette ?? "").split("|")) {
    const [r, g, b] = entry.split(",").map((n) => parseInt(n, 10));
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) continue;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum > bestLum) {
      bestLum = lum;
      best = `${r} ${g} ${b}`;
    }
  }
  return best;
}

/** 2×2 mosaic of the first tracks' artwork. */
export function PlaylistArt({ tracks }: { tracks: Track[] }) {
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

/**
 * A full playlist page — a gradient hero derived from the playlist's own
 * cover palette, then a proper track table. Replaces the old modal.
 */
export default function PlaylistPage({
  playlist,
  onBack,
  onChanged,
}: {
  playlist: PlaylistRow;
  onBack: () => void;
  onChanged: () => void;
}) {
  const allTracks = useLibrary((s) => s.tracks);
  const refreshLibrary = useLibrary((s) => s.refresh);
  const playTrackList = usePlayer((s) => s.playTrackList);
  const playShuffled = usePlayer((s) => s.playShuffled);
  const playIndex = usePlayer((s) => s.playIndex);
  const currentId = usePlayer((s) => (s.index >= 0 ? s.queue[s.index] : undefined));
  const status = usePlayer((s) => s.status);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  // Two-step delete: first click arms, second confirms.
  const [delArmed, setDelArmed] = useState(false);

  const skin = useTheme((s) => s.skin);
  const I = {
    play: iconFor(skin, "play"),
    pause: iconFor(skin, "pause"),
    shuffle: iconFor(skin, "shuffle"),
    plus: iconFor(skin, "plus"),
    folder: iconFor(skin, "folderOpen"),
    back: iconFor(skin, "back"),
    close: iconFor(skin, "close"),
    clock: iconFor(skin, "clock"),
    disc: iconFor(skin, "disc"),
  };

  const tracks = useMemo(
    () => playlist.trackIds.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean) as Track[],
    [playlist.trackIds, allTracks],
  );

  const total = tracks.reduce((s, t) => s + (t.duration ?? 0), 0);
  const palette = tracks.find((t) => t.artPalette)?.artPalette;
  const glow = brightestSwatch(palette);
  // A light, top-left glow over the page that fades to nothing at the edges —
  // never a dark slab. Empty playlist? Quiet accent glow so the hero still
  // belongs to the theme.
  const heroWash = glow
    ? `radial-gradient(72% 104% at 9% -4%, rgb(${glow} / 0.52), transparent 63%)`
    : `radial-gradient(66% 96% at 9% -4%, rgb(var(--accent-rgb) / 0.16), transparent 66%)`;

  async function addTrackIds(ids: string[]) {
    for (const id of ids) await native.addToPlaylist(Number(playlist.id), Number(id));
    onChanged();
  }

  async function importFiles() {
    const files = await native.pickFiles();
    if (!files.length) return;
    setBusy(true);
    setNotice("");
    const ids = await native.importFiles(files);
    if (ids && ids.length) {
      await addTrackIds(ids.map(String));
      await refreshLibrary();
    }
    setNotice(ids && ids.length ? `Imported ${ids.length} file${ids.length === 1 ? "" : "s"}` : "Nothing to import");
    setBusy(false);
  }

  async function addFolder() {
    const dir = await native.pickFolder();
    if (!dir) return;
    setBusy(true);
    setNotice("");
    const n = await native.addFolderToPlaylist(Number(playlist.id), dir);
    await refreshLibrary();
    onChanged();
    setNotice(n ? `Added ${n} track${n === 1 ? "" : "s"} from folder` : "Folder scanned");
    setBusy(false);
  }

  async function removeTrack(trackId: string) {
    await native.removeFromPlaylist(Number(playlist.id), Number(trackId));
    onChanged();
  }

  async function dedupe() {
    const removed = await native.dedupePlaylist(Number(playlist.id));
    onChanged();
    setNotice(removed ? `Removed ${removed} duplicate${removed === 1 ? "" : "s"}` : "No duplicates found");
  }

  async function deletePlaylist() {
    if (!delArmed) {
      setDelArmed(true);
      return;
    }
    setDelArmed(false);
    try {
      await native.deletePlaylist(Number(playlist.id));
      // Library's load effect notices the playlist is gone and falls back to the grid.
      onChanged();
    } catch {
      setNotice("Couldn't delete this playlist");
    }
  }

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  // Auto-disarm the pending delete so a later stray click can't confirm it.
  useEffect(() => {
    if (!delArmed) return;
    const t = setTimeout(() => setDelArmed(false), 3200);
    return () => clearTimeout(t);
  }, [delArmed]);

  return (
    <div className="plp">
      {/* ---- Hero ---- */}
      <div className="plp-hero" style={{ background: heroWash }}>
        <div className="plp-hero-scrim" />
        <button className="icon-btn plp-back" onClick={onBack} title="Back">
          <I.back size={17} />
        </button>
        <div className="plp-hero-inner">
          <div className="plp-cover">
            <PlaylistArt tracks={tracks} />
          </div>
          <div className="plp-hero-meta">
            <span className="plp-eyebrow">Playlist</span>
            <h1 className="plp-title">{playlist.name}</h1>
            <p className="plp-sub">
              {tracks.length} track{tracks.length === 1 ? "" : "s"} · {formatTotal(total)}
            </p>
          </div>
        </div>
      </div>

      {/* ---- Actions ---- */}
      <div className="plp-tools">
        <button
          className="plp-play"
          onClick={() => playTrackList(tracks)}
          disabled={!tracks.length}
          title="Play"
        >
          {status === "playing" ? <I.pause size={22} /> : <I.play size={22} style={{ marginLeft: 3 }} />}
        </button>
        <button className="btn" onClick={() => playShuffled(tracks)} disabled={!tracks.length}>
          <I.shuffle size={14} /> Shuffle
        </button>
        <button className="btn" onClick={() => setPickerOpen(true)}>
          <I.plus size={14} /> Add tracks
        </button>
        <button className="btn" onClick={importFiles} disabled={busy}>
          <I.plus size={14} /> Files
        </button>
        <button className="btn" onClick={addFolder} disabled={busy}>
          <I.folder size={14} /> Folder
        </button>
        <button className="btn" onClick={dedupe} disabled={!tracks.length}>
          Clean up
        </button>
        <button
          className={`btn plp-del-btn ${delArmed ? "plp-del-btn-armed" : ""}`}
          onClick={deletePlaylist}
          title="Delete this playlist"
        >
          <I.close size={14} /> {delArmed ? "Confirm delete" : "Delete"}
        </button>
        {notice && <span className="plp-notice text-faint">{notice}</span>}
      </div>

      {/* ---- Track table ---- */}
      <div className="plp-table">
        <div className="plp-row plp-head">
          <span className="plp-num">#</span>
          <span className="plp-title-col">Title</span>
          <span className="plp-album-col">Album</span>
          <span className="plp-dur-col">
            <I.clock size={12} />
          </span>
          <span />
        </div>

        {tracks.length === 0 ? (
          <p className="text-faint plp-empty">
            This playlist is empty — use <b>Add tracks</b>, <b>Files</b> or <b>Folder</b> above.
          </p>
        ) : (
          <Stagger step={0.02}>
            {tracks.map((t, i) => {
              const isCur = t.id === currentId;
              return (
                <StaggerItem key={`${t.id}-${i}`} y={10}>
                  <div
                    className={`plp-row ${isCur ? "plp-row-current" : ""}`}
                    onDoubleClick={() => playIndex(tracks, i)}
                  >
                    <span className="plp-num text-faint">
                      {isCur && status === "playing" ? <I.disc size={13} className="plp-spin" /> : i + 1}
                    </span>
                    <span className="plp-title-col">
                      <span className="plp-thumb">
                        {isArtUrl(t.art) ? (
                          <ArtImage src={t.art} className="pl-art-img" />
                        ) : (
                          <span style={{ background: t.art ?? "var(--surface-2)" }} />
                        )}
                      </span>
                      <span className="plp-name-col">
                        <span className="plp-track-title">{t.title}</span>
                        <span className="text-faint">{t.artist}</span>
                      </span>
                    </span>
                    <span className="plp-album-col text-dim">{t.albumTitle ?? ""}</span>
                    <span className="plp-dur-col text-faint">{formatTime(t.duration)}</span>
                    <span className="plp-row-actions">
                      <button
                        className="icon-btn"
                        title="Play"
                        onClick={() => playIndex(tracks, i)}
                      >
                        <I.play size={13} />
                      </button>
                      <button
                        className="icon-btn"
                        title="Remove from playlist"
                        onClick={() => removeTrack(t.id)}
                      >
                        <I.close size={13} />
                      </button>
                    </span>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <TrackPicker
            key="picker"
            playlist={playlist}
            allTracks={allTracks}
            onClose={() => setPickerOpen(false)}
            onConfirm={async (ids) => {
              await addTrackIds(ids);
              setPickerOpen(false);
              setNotice(`Added ${ids.length} track${ids.length === 1 ? "" : "s"}`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Library track picker (multi-select) ---------------- */
export function TrackPicker({
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
  const selectable = useMemo(() => allTracks.filter((t) => !existing.has(t.id)), [allTracks, existing]);

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
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="pl-modal panel-glass"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pl-modal-head">
          <h2>Add to “{playlist.name}”</h2>
          <span className="text-faint">{sel.size} selected</span>
          <button
            className="btn"
            onClick={() => setSel(new Set(selectable.map((t) => t.id)))}
            disabled={!selectable.length}
          >
            Select all
          </button>
          <button className="btn" onClick={() => setSel(new Set())} disabled={!sel.size}>
            Clear
          </button>
          <button className="btn btn-accent" onClick={() => onConfirm([...sel])} disabled={!sel.size}>
            Add {sel.size || ""}
          </button>
          <button className="icon-btn" onClick={onClose} title="Close">
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
        <div className="pl-track-list pl-track-list-pick">
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
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="pl-modal pl-modal-sm panel-glass"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pl-modal-head">
          <h2>Add to playlist</h2>
          <button className="icon-btn" onClick={onClose}>
            <IClose size={16} />
          </button>
        </div>
        <div className="pl-track-list pl-track-list-pick">
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
          {playlists.length === 0 && (
            <p className="text-faint pl-empty">No playlists yet — create one below.</p>
          )}
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