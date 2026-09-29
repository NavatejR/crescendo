# Testing checklist

Run through this list before tagging a release, and after any change to
playback, theming, or the visualizer.

## Install & first run
- [ ] App launches; window appears centered with the note icon in dock/taskbar
- [ ] First-run onboarding shows "Choose a music folder"
- [ ] Folder picker opens; chosen folder appears under **Folders**
- [ ] Scan progress bar appears, then library populates

## Library
- [ ] Albums grid shows covers (embedded art) with generated-gradient fallbacks
- [ ] Artists view groups by artist with play buttons
- [ ] Tracks table: lossless badge, sample-rate/bit-depth shown for FLAC/ALAC
- [ ] Search filters albums and tracks instantly
- [ ] Adding a second folder merges libraries; removing a folder removes its tracks
- [ ] Adding/removing a file in a watched folder is picked up on rescan

## Playback (the core)
- [ ] Double-click plays a FLAC **and** an MP3 — sound on both
- [ ] Play/pause (button + spacebar), next, previous (restart-if->3s rule)
- [ ] Seek: drag/click in the playbar and in the fullscreen player
- [ ] Volume slider + mute; volume persists while switching tracks
- [ ] Shuffle reorders upcoming tracks; repeat cycles off → all → one
- [ ] Album finishes → next album starts (gapless auto-advance)
- [ ] Repeat-one loops the same track forever
- [ ] **Lossless check:** play a 24/96 FLAC — no clicks/pops at sample-rate boundaries

## EQ
- [ ] Panel slides up with animation; power button bypasses
- [ ] Bass Boost preset: audible bass lift with EQ on; bypass restores flat
- [ ] Preamp works; gains clamp at ±12 dB; Custom appears after manual edits

## Visualizer
- [ ] Fullscreen player: shader orbs pulse to bass; aurora + rings styles all render
- [ ] Intensity slider changes amplitude; visuals dim when paused
- [ ] Mini orb on playbar breathes with the music
- [ ] No GPU console errors in dev tools; recovery works after resize

## Theming
- [ ] All 5 overhauls × 5 skins render coherently (spot-check brutalism × liquid, maximalism × oneui)
- [ ] Thumbnails in Settings match the live UI they represent
- [ ] Accent override applies immediately (playbar, seek bar, orb)
- [ ] Theme choice persists across app restarts

## Platform specifics
### macOS
- [ ] Traffic lights overlay cleanly; titlebar drag moves the window
- [ ] Media keys (F8/F9/F10) do not conflict

### Windows
- [ ] HiDPI scaling renders sharp at 125%/150%
- [ ] WebView2 present; app installs and launches from MSI/NSIS

### Linux
- [ ] AppImage runs on a clean system (no system webkit needed at runtime)
- [ ] Fonts render (Space Grotesk, Roboto Flex load from bundle)

## Performance
- [ ] 5,000+ track library: scrolling stays smooth, search stays instant
- [ ] Visualizer on: CPU stays modest (<15% on Apple Silicon, no fan spin)
- [ ] Memory stable across 30 min playback
