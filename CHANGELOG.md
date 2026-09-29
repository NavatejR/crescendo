# Changelog

All notable changes to Crescendo are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] — 2026-09-29

### Added
- Two-axis theme engine: 5 overhauls (Minimalist, Glassmorphism, Liquid Glass, Brutalism, Maximalism) × 5 skins (Material You, NothingOS, Windows 11, One UI, Liquid Glass) with live token-driven thumbnails and 10 accent overrides
- WebGL2 shader-orb visualizer (orbs / aurora / rings) with native FFT feed and mini playbar orb
- Native Rust audio engine: Symphonia decoding (FLAC, ALAC, WAV, AIFF, MP3, AAC, OGG, Opus), gapless queue auto-advance, shuffle/repeat
- 10-band ISO biquad EQ with preamp and 8 presets, hot-swappable while playing
- Library: folder scanning with progress, SQLite storage, embedded artwork + palette extraction, lossless badges with sample-rate/bit-depth, search, albums/artists/tracks/folders/playlists views
- Playlists (create/delete, add tracks), queue with play-next
- Custom titlebar, keyboard shortcuts, remembered window state, onboarding
- CI (typecheck + Rust tests/clippy on 3 OSes) and multi-platform release workflow
