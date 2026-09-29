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
import { useLibrary } from "./lib/libraryStore";
import { isNative } from "./lib/env";
import { spectrum } from "./lib/spectrum";

export type ViewId = "albums" | "artists" | "tracks" | "folders" | "playlists" | "eq";

export default function App() {
  const [view, setView] = useState<ViewId>("albums");
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEQ, setShowEQ] = useState(false);
  const [scan, setScan] = useState<{ done: number; total: number } | null>(null);

  // Load library (native DB or mock) once
  useEffect(() => {
    useLibrary.getState().refresh();
  }, []);

  // Native spectrum + scan events; browser simulation otherwise
  useEffect(() => {
    if (!isNative()) return;
    let unlisten: (() => void) | null = null;
    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const offA = await listen<{
        bands: number[]; waveform: number[]; bass: number; mid: number; treble: number; energy: number;
      }>("spectrum", (e) => {
        const p = e.payload;
        for (let i = 0; i < spectrum.bands.length && i < p.bands.length; i++) {
          spectrum.bands[i] = p.bands[i];
        }
        for (let i = 0; i < spectrum.waveform.length && i < p.waveform.length; i++) {
          spectrum.waveform[i] = p.waveform[i];
        }
        spectrum.bass = p.bass;
        spectrum.mid = p.mid;
        spectrum.treble = p.treble;
        spectrum.energy = p.energy;
        spectrum.playing = usePlayer.getState().status === "playing";
      });
      const offB = await listen<[number, number]>("scan:progress", (e) => {
        setScan({ done: e.payload[0], total: e.payload[1] });
      });
      const offC = await listen("scan:done", () => {
        setScan(null);
        useLibrary.getState().refresh();
      });
      const offD = await listen<string>("scan:error", (e) => {
        console.error("scan error:", e.payload);
        setScan(null);
      });
      unlisten = () => { offA(); offB(); offC(); offD(); };
    })();
    return () => unlisten?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scan completion also refreshes; keep scan progress listener unmount-safe
  useEffect(() => () => { /* listeners cleaned above */ }, []);

  // Playback clock (browser mode only; native uses engine polling)
  useEffect(() => {
    if (isNative()) return;
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

  const macOffset = isNative() && navigator.userAgent.includes("Macintosh");

  return (
    <div className={`app-shell ${macOffset ? "titlebar-mac" : ""}`}>
      <TitleBar
        onOpenSettings={() => setShowSettings(true)}
        onToggleNowPlaying={() => setShowNowPlaying((v) => !v)}
      />
      <div className="app-body">
        <Sidebar view={view} onView={setView} />
        <main className="app-main">
          {scan && (
            <div className="scan-bar">
              Scanning library… {scan.done}/{scan.total}
            </div>
          )}
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
