<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" alt="Crescendo" width="128" />
</p>

<h1 align="center">Crescendo</h1>

<p align="center">
  <b>A beautiful, deeply customizable local music player.</b><br />
  Lossless-first · shader-driven visuals · two-axis theming<br />
  macOS · Windows · Linux
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-2-24C8D8?logo=tauri&logoColor=white" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Rust-core-F74C00?logo=rust&logoColor=white&labelColor=555" alt="Rust" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT" />
</p>

---

## ✨ Why Crescendo?

Most players make you choose between *pretty* and *powerful*. Crescendo is a native Rust audio core — bit-perfect lossless, a real 10-band EQ, GPU-driven visuals — wrapped in a UI that you can reshape entirely.

**Two-axis theming** means you pick a **structure** and an **identity**, independently:

**Overhauls (structure & feel)** — pick one:

- **Minimalism** — hairlines, quiet surfaces, icon rail
- **Glassmorphism** — frosted panels, soft glow, floating pill rail
- **Brutalism** — raw borders, hard offset shadows, exposed grid
- **Maximalism** — oversized radii, big type, featured hero cards

**Skins (colors & typography)** — pick one:

- **Material You** — dynamic tonal, Roboto Flex
- **NothingOS** — monochrome dot-matrix, Space Grotesk
- **Windows 11** — Mica neutrals, Fluent
- **One UI** — deep black, electric blue
- **Liquid Glass** — chromatic translucent

That's **20 coherent looks** out of the box — any overhaul × any skin — plus 9 accent overrides. Theme previews in Settings are rendered live from the actual theme tokens, so what you see is what you get.

## 🎵 Audio

| | |
|---|---|
| **Formats** | FLAC, ALAC, WAV, AIFF (lossless) · MP3, AAC/M4A, OGG Vorbis, Opus — decoded natively by Symphonia, no system codec roulette |
| **Output** | rodio/cpal, stream set up per-track sample rate (44.1 → 192 kHz) |
| **EQ** | 10-band ISO biquad peaking EQ (31 Hz–16 kHz) + preamp, running in the native DSP chain with hot-swappable coefficients — presets: Flat, Bass Boost, Rock, Pop, Jazz, Electronic, Vocal, Podcast |
| **Visualizer** | 4096-pt FFT (Hann window) over a lock-free PCM tap → 64 log-spaced bands + waveform at 60 fps, rendered as **WebGL2 ray-marched shader orbs** (plus aurora & rings styles), palette-locked to your theme accent |
| **Library** | rusqlite (bundled SQLite), embedded artwork + dominant-color palette extraction, background scanning with live progress, lossless badges with sample-rate/bit-depth |
| **Privacy** | 100% offline. No accounts, no telemetry, no network. |

## 🖼️ Screenshots

> Coming soon — the UI is stabilizing fast. Run it and see.

## 🚀 Getting started

### Download
Grab an installer from [**Releases**](https://github.com/NavatejR/crescendo/releases) — DMG (macOS, Apple Silicon + Intel), MSI/NSIS (Windows), AppImage/deb (Linux). macOS builds are unsigned: right-click the app → **Open** on first launch.

### Build from source
```bash
# Prerequisites: Node 20+, Rust (rustup.rs), platform deps (see CONTRIBUTING.md)
git clone https://github.com/NavatejR/crescendo.git
cd crescendo
npm install
npm run tauri dev      # develop with hot reload
npm run tauri build    # produce installers for your OS
```

> **Linux note:** building needs `libwebkit2gtk-4.1-dev` and friends (one `apt install`, documented in CONTRIBUTING.md). The AppImage we ship is self-contained for users.

## ⌨️ Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / pause |
| `⌘/Ctrl + →` / `←` | Next / previous |
| `⌘/Ctrl + ↑` / `↓` | Volume |
| `⌘/Ctrl + F` | Fullscreen player |
| `⌘/Ctrl + E` | Equalizer |
| `⌘/Ctrl + ,` | Settings |

## 🛠️ Tech stack

- **Core:** Rust · Tauri 2 · Symphonia · rodio · rustfft · lofty · rusqlite · image
- **UI:** React 19 · TypeScript · Tailwind CSS 4 · Motion · zustand · lucide
- **Visuals:** hand-written GLSL (WebGL2) — no heavy 3D dependency

```
Crescendo/
├── src/                  # React UI
│   ├── theme/            #   two-axis theme engine + live thumbnails
│   ├── visualizer/       #   WebGL2 shader visualizer
│   ├── player/           #   playback state machine
│   └── lib/              #   IPC bridge, stores, types
├── src-tauri/            # Rust core
│   └── src/
│       ├── audio/        #   engine, PCM tap, FFT worker, biquad EQ
│       ├── library/      #   scanner, metadata/artwork, SQLite
│       └── commands.rs   #   IPC surface
└── .github/workflows/    # CI + multi-platform release builds
```

## 🗺️ Roadmap

- [ ] OS media-key integration (MPRIS / SMTC / macOS now-playing)
- [ ] Crossfade & true gapless playback
- [ ] Dynamic palette extraction into Material You skin
- [ ] Additional shader packs & user-authored GLSL
- [ ] Custom user skins/overhauls (CSS import)

Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). File bugs with the [bug template](.github/ISSUE_TEMPLATE/bug_report.md); test per [TESTING.md](TESTING.md).

## 📜 License

[MIT](LICENSE) © 2026 NavatejR
