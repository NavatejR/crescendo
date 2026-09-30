import { useMemo } from "react";
import { motion } from "motion/react";
import { useLibrary, isArtUrl } from "../lib/libraryStore";
import { usePlayer } from "../player/store";
import { useTheme } from "../theme/store";
import { useIcon } from "../theme/iconSet";
import type { Track } from "../lib/types";
import type { ViewId } from "../App";

/**
 * Populated home experience: a jump-back-in shelf, artist chips, library
 * stats and a featured album wall — rendered for every overhaul except
 * minimal, which keeps the quiet, content-only grid.
 */
export default function Home({ onView }: { onView: (v: ViewId) => void }) {
  const { tracks, albums } = useLibrary();
  const playTrackList = usePlayer((s) => s.playTrackList);
  const history = usePlayer((s) => s.history);
  const overhaul = useTheme((s) => s.overhaul);

  const Iclock = useIcon("clock");
  const Iplay = useIcon("play");

  const isMinimal = overhaul === "minimal";

  const recent = useMemo(
    () => history.map((id) => tracks.find((t) => t.id === id)).filter(Boolean) as Track[],
    [history, tracks],
  );

  const artists = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tracks) map.set(t.artist, (map.get(t.artist) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [tracks]);

  const stats = useMemo(() => {
    const secs = tracks.reduce((s, t) => s + (t.duration ?? 0), 0);
    return {
      tracks: tracks.length,
      albums: albums.length,
      hours: Math.round(secs / 360) / 10,
    };
  }, [tracks, albums]);

  const byAlbum = useMemo(() => {
    const map = new Map<string, Track[]>();
    for (const t of tracks) {
      if (!map.has(t.albumId)) map.set(t.albumId, []);
      map.get(t.albumId)!.push(t);
    }
    return map;
  }, [tracks]);

  const featured = useMemo(() => albums.slice(0, 8), [albums]);

  const h = new Date().getHours();
  const daypart = h < 5 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";

  return (
    <div className="home">
      <header className="home-head">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
        >
          Good {daypart}.
        </motion.h1>
        {!isMinimal && (
          <div className="home-stats text-faint">
            <span><b>{stats.tracks}</b> tracks</span>
            <i />
            <span><b>{stats.albums}</b> albums</span>
            <i />
            <span><b>{stats.hours}</b> hours</span>
          </div>
        )}
      </header>

      {tracks.length === 0 && (
        <section className="home-section">
          <div className="home-empty panel">
            <p className="text-dim">Your library is empty — add a folder of music to begin.</p>
            <button className="btn btn-accent" onClick={() => onView("folders")}>Go to folders</button>
          </div>
        </section>
      )}

      {!isMinimal && recent.length > 0 && (
        <section className="home-section">
          <div className="home-sec-head">
            <span className="home-sec-title"><Iclock size={14} /> Jump back in</span>
          </div>
          <div className="home-recent">
            {recent.slice(0, 8).map((t, i) => (
              <motion.button
                key={t.id}
                className="home-recent-card"
                style={{ background: isArtUrl(t.art) ? undefined : t.art ?? "var(--surface-2)" }}
                onClick={() => playTrackList(recent, i)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), type: "spring", stiffness: 260, damping: 24 }}
                whileHover={{ y: -4 }}
                title={`Play ${t.title}`}
              >
                {isArtUrl(t.art) && <img src={t.art} alt="" className="home-recent-img" draggable={false} />}
                <span className="home-recent-play"><Iplay size={13} /></span>
                <span className="home-recent-title">{t.title}</span>
                <span className="home-recent-artist text-dim">{t.artist}</span>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {!isMinimal && artists.length > 0 && (
        <section className="home-section">
          <div className="home-sec-head">
            <span className="home-sec-title">Artists</span>
          </div>
          <div className="home-chips">
            {artists.map(([name]) => (
              <button key={name} className="home-chip" onClick={() => onView("artists")}>
                {name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="home-sec-head">
          <span className="home-sec-title">{isMinimal ? "Albums" : "Featured"}</span>
          <button className="home-sec-link text-faint" onClick={() => onView("albums")}>
            All albums →
          </button>
        </div>
        <div className="album-grid">
          {featured.map((al, i) => {
            const albumTracks = byAlbum.get(al.id) ?? [];
            return (
              <AlbumCard key={al.id} album={al} index={i} tracks={albumTracks} onPlay={playTrackList} />
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* Album card shared with the Albums view (kept visually identical). */
function AlbumCard({
  album, index, tracks, onPlay,
}: {
  album: ReturnType<typeof useLibrary.getState>["albums"][number];
  index: number;
  tracks: Track[];
  onPlay: (t: Track[]) => void;
}) {
  const Iplay = useIcon("play");
  return (
    <motion.div
      className="album-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4), type: "spring", stiffness: 260, damping: 24 }}
      whileHover={{ y: -4 }}
    >
      <div className="album-art" style={{ background: isArtUrl(album.art) ? undefined : album.art }}>
        {isArtUrl(album.art) && <img src={album.art} alt="" className="album-art-img" draggable={false} />}
        <button className="album-play" onClick={() => onPlay(tracks)} title={`Play ${album.title}`}>
          <Iplay size={16} style={{ marginLeft: 2 }} />
        </button>
      </div>
      <span className="album-title">{album.title}</span>
      <span className="album-artist text-dim">{album.artist}{album.year ? ` · ${album.year}` : ""}</span>
    </motion.div>
  );
}
