import { Disc3, ListMusic, Folder, User, Music4, SlidersHorizontal } from "lucide-react";
import type { ViewId } from "../App";
import { usePlayer } from "../player/store";

const NAV: { id: ViewId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "albums", label: "Albums", icon: Disc3 },
  { id: "artists", label: "Artists", icon: User },
  { id: "tracks", label: "Tracks", icon: Music4 },
  { id: "folders", label: "Folders", icon: Folder },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "eq", label: "Equalizer", icon: SlidersHorizontal },
];

export default function Sidebar({
  view,
  onView,
}: {
  view: ViewId;
  onView: (v: ViewId) => void;
}) {
  const playing = usePlayer((s) => s.status === "playing");

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`side-item ${view === id ? "side-item-active" : ""}`}
            onClick={() => onView(id)}
          >
            <Icon size={17} />
            <span>{label}</span>
            {id === "eq" && playing && (
              <span className="side-eq-live" aria-label="equalizer active" />
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="dot-grid sidebar-foot-dots" />
        <span className="text-faint">Lossless-first local library</span>
      </div>
    </aside>
  );
}
