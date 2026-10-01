import { motion } from "motion/react";
import type { ViewId } from "../App";
import { usePlayer } from "../player/store";
import { useTheme } from "../theme/store";
import { iconFor, type IconName } from "../theme/iconSet";

const NAV: { id: ViewId; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "albums", label: "Albums", icon: "albums" },
  { id: "artists", label: "Artists", icon: "artists" },
  { id: "tracks", label: "Tracks", icon: "tracks" },
  { id: "folders", label: "Folders", icon: "folders" },
  { id: "playlists", label: "Playlists", icon: "playlists" },
  { id: "eq", label: "Equalizer", icon: "eq" },
];

export default function Sidebar({
  view,
  onView,
}: {
  view: ViewId;
  onView: (v: ViewId) => void;
}) {
  const playing = usePlayer((s) => s.status === "playing");
  const skin = useTheme((s) => s.skin);

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {NAV.map(({ id, label, icon }) => {
          const Icon = iconFor(skin, icon);
          return (
            <button
              key={id}
              className={`side-item ${view === id ? "side-item-active" : ""}`}
              onClick={() => onView(id)}
            >
              {view === id && (
                <motion.span
                  layoutId="nav-indicator"
                  className="side-indicator"
                  transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.8 }}
                />
              )}
              <Icon size={17} />
              <span>{label}</span>
              {id === "eq" && playing && (
                <span className="side-eq-live" aria-label="equalizer active" />
              )}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <div className="dot-grid sidebar-foot-dots" />
        <span className="text-faint">Lossless-first local library</span>
      </div>
    </aside>
  );
}
