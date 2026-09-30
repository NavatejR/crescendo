import { useTheme } from "../theme/store";
import { iconFor } from "../theme/iconSet";

interface Props {
  onOpenSettings: () => void;
  onToggleNowPlaying: () => void;
}

export default function TitleBar({ onOpenSettings, onToggleNowPlaying }: Props) {
  const skin = useTheme((s) => s.skin);
  const I = {
    search: iconFor(skin, "search"),
    expand: iconFor(skin, "expand"),
    settings: iconFor(skin, "settings"),
  };

  return (
    <header className="titlebar" data-tauri-drag-region>
      {/* Draggable spacer also serves as the brand mark zone */}
      <div className="titlebar-brand" data-tauri-drag-region>
        <span className="brand-dot" />
        <span className="brand-name">Crescendo</span>
      </div>

      <div className="titlebar-search">
        <I.search size={14} className="text-faint" />
        <input
          className="input titlebar-search-input"
          placeholder="Search library…"
          onKeyDown={(e) => {
            if (e.key === "Escape") (e.target as HTMLInputElement).blur();
          }}
        />
      </div>

      <div className="titlebar-actions">
        <button className="icon-btn" onClick={onToggleNowPlaying} title="Now Playing (⌘F)">
          <I.expand size={16} />
        </button>
        <button className="icon-btn" onClick={onOpenSettings} title="Settings (⌘,)">
          <I.settings size={16} />
        </button>
      </div>
    </header>
  );
}
