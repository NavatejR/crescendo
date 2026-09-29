import { Search, Settings as SettingsIcon, Maximize2 } from "lucide-react";

interface Props {
  onOpenSettings: () => void;
  onToggleNowPlaying: () => void;
}

export default function TitleBar({ onOpenSettings, onToggleNowPlaying }: Props) {
  return (
    <header className="titlebar" data-tauri-drag-region>
      {/* Draggable spacer also serves as the brand mark zone */}
      <div className="titlebar-brand" data-tauri-drag-region>
        <span className="brand-dot" />
        <span className="brand-name">Crescendo</span>
      </div>

      <div className="titlebar-search">
        <Search size={14} className="text-faint" />
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
          <Maximize2 size={16} />
        </button>
        <button className="icon-btn" onClick={onOpenSettings} title="Settings (⌘,)">
          <SettingsIcon size={16} />
        </button>
      </div>
    </header>
  );
}
