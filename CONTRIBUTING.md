# Contributing to Crescendo

Thanks for your interest in improving Crescendo! 🎵

## Development setup

### Prerequisites
- **Node.js 20+** and npm
- **Rust 1.77+** via [rustup](https://rustup.rs)
- **Platform deps:**
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Windows: [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (preinstalled on Win 11) + Visual Studio Build Tools
  - Linux: `libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`

### Getting started
```bash
git clone https://github.com/NavatejR/crescendo.git
cd crescendo
npm install
npm run tauri dev    # launches the desktop app with hot reload
```

## Project layout
```
src/          React UI (components, theme engine, visualizer)
src/lib/      stores (zustand), IPC bridge, types
src/visualizer/  WebGL2 shader visualizer
src-tauri/    Rust core (audio engine, library, DB, commands)
```

## Ground rules
- **Theming:** all visual identity flows through CSS tokens. Skins own colors + fonts (`skins.css`), overhauls own structure (`overhauls.css`). Never hardcode colors in components.
- **Audio:** the Rust engine is the single source of truth for playback. UI state mirrors it; don't render audio in the webview.
- **Privacy:** everything stays offline. No telemetry, no network calls.
- **Commits:** conventional, present-tense ("Add gapless crossfade", not "added").

## Before opening a PR
```bash
npx tsc --noEmit       # type-check the frontend
cd src-tauri && cargo test && cargo clippy
```

Run through the manual checklist in [TESTING.md](TESTING.md) for anything user-facing.

## Areas that love contributions
- New skins and overhauls (see `src/theme/skins.ts` + the two CSS files)
- Shader visualizer styles (`src/visualizer/shaderSource.ts`)
- OS integration: MPRIS (Linux), SMTC (Windows), media keys (macOS)
- More EQ presets
