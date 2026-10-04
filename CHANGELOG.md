# Changelog

All notable changes to Crescendo are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] — 2026-10-04

### Added
- Full-page playlist pages: gradient hero derived from the cover palette, real track table with a sticky header, multi-select track picker, file/folder import, and one-click dedupe
- Delete a playlist from both the grid (hover ✕) and its page (two-step confirm), with visible failure feedback
- App-wide motion layer: view transitions, staggered card entrances, animated counters — all reduced-motion aware

### Changed
- Redesigned all four overhauls (Minimalism, Glassmorphism, Brutalism, Maximalism) with distinct shells, nav states, density and motion pacing
- Main-column padding is now tokenized (`--main-pad-*`); the playlist hero bleeds exactly to the shell edges in every overhaul, and hero content aligns with the page grid
- Playlist hero is a soft palette glow (brightest swatch) that dissolves into the page instead of a hard dark block; empty playlists get a quiet accent glow
- Sticky playlist table header is translucent with blur instead of an opaque strip
- Grid delete chip keeps its dark background and contrast over artwork (was clobbered by the shared icon-button styles)

### Fixed
- Playlists could not be deleted from the playlist page (no control existed) and the grid's delete chip rendered invisibly
- Back navigation could leave the playlist page stuck open
- Hand-written `-webkit-backdrop-filter` twins were dropped by the CSS minifier, disabling all glass blur in production builds

## [0.1.0] — 2026-09-29

### Added
- Two-axis theme engine: 4 overhauls (Minimalism, Glassmorphism, Brutalism, Maximalism) × 5 skins (Material You, NothingOS, Windows 11, One UI, Liquid Glass) with live token-driven thumbnails and accent overrides
- WebGL2 shader-orb visualizer (orbs / aurora / rings) with native FFT feed and mini playbar orb
- Native Rust audio engine: Symphonia decoding (FLAC, ALAC, WAV, AIFF, MP3, AAC, OGG, Opus), gapless queue auto-advance, shuffle/repeat
- 10-band ISO biquad EQ with preamp and 8 presets, hot-swappable while playing
- Library: folder scanning with progress, SQLite storage, embedded artwork + palette extraction, lossless badges with sample-rate/bit-depth, search, albums/artists/tracks/folders/playlists views
- Playlists (create/delete, add tracks), queue with play-next
- Custom titlebar, keyboard shortcuts, remembered window state, onboarding
- CI (typecheck + Rust tests/clippy on 3 OSes) and multi-platform release workflow
