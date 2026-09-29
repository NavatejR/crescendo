import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import Playbar from "./components/Playbar";
import NowPlaying from "./components/NowPlaying";
import Settings from "./components/Settings";
import Library from "./components/Library";
import EQPanel from "./components/EQPanel";
import { usePlayer } from "./player/store";

export type ViewId = "albums" | "artists" | "tracks" | "folders" | "playlists" | "eq";

export default function App() {
  const [view, setView] = useState<ViewId>("albums");
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEQ, setShowEQ] = useState(false);

  // Playback clock (simulated engine until native audio lands)
  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      usePlayer.getState().tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const p = usePlayer.getState();
      if (e.code === "Space") {
        e.preventDefault();
        p.togglePlay();
      } else if (e.code === "ArrowRight" && e.metaKey) p.next();
      else if (e.code === "ArrowLeft" && e.metaKey) p.prev();
      else if (e.code === "ArrowUp" && e.metaKey) p.setVolume(p.volume + 0.05);
      else if (e.code === "ArrowDown" && e.metaKey) p.setVolume(p.volume - 0.05);
      else if (e.key === "n" && (e.metaKey || e.ctrlKey)) p.next();
      else if (e.key === "f" && (e.metaKey || e.ctrlKey)) setShowNowPlaying((v) => !v);
      else if (e.key === "," && (e.metaKey || e.ctrlKey)) setShowSettings((v) => !v);
      else if (e.key === "e" && (e.metaKey || e.ctrlKey)) setShowEQ((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-shell">
      <TitleBar
        onOpenSettings={() => setShowSettings(true)}
        onToggleNowPlaying={() => setShowNowPlaying((v) => !v)}
      />
      <div className="app-body">
        <Sidebar view={view} onView={setView} />
        <main className="app-main">
          <Library view={view} />
        </main>
      </div>
      <Playbar
        onExpand={() => setShowNowPlaying(true)}
        onToggleEQ={() => setShowEQ((v) => !v)}
      />

      <AnimatePresence>
        {showEQ && <EQPanel onClose={() => setShowEQ(false)} />}
        {showNowPlaying && (
          <NowPlaying key="np" onClose={() => setShowNowPlaying(false)} />
        )}
        {showSettings && (
          <Settings key="settings" onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
