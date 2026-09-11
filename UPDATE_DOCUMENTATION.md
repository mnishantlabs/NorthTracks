# NorthTracks - Major Updates & Enhancement Documentation

## 🚀 Overview

This document summarizes all key architectural improvements, feature additions, UI/UX polish, and bug fixes implemented across NorthTracks.

---

## 🎧 Audio Processing & Equalizer (EQ)

- **Auto Hardware Adjust Mode**:
  - Implemented `setAutoHardwareAdjust(enabled: boolean)` in `AudioEngine.ts`.
  - Automatically balances 10-band biquad filter frequencies according to connected hardware (headphones / external speakers) and track genre metadata.
- **Dynamic EQ Track-Change Tuning**:
  - Connected `audioEngine.onTrackChanged(track.genre)` in `App.tsx` on every track playback.
  - Automatically updates EQ band gains on song changes (e.g. Pop, Rock, Classical, Electronic, Hip-Hop, Acoustic, Vocal).
- **Equalizer Control Panel**:
  - Added an **Auto Hardware Adjust** toggle switch in `EQPanel.tsx` next to Volume Normalization.

---

## 🔍 Smart Media Catalog Scanner & Call Recording Filter

- **Enhanced Recording Detection**:
  - Updated `scanner.ts` with `isRecordingTrack` helper and regex matching phone numbers (`+91...`), spam alert audio (`(Spam Alert From Jio)...`), and voice recordings (`rec_`, `aud-`, `callrec`, etc.).
- **Automatic Library Filter**:
  - Filtered non-music recordings from `App.tsx`, `HomeView.tsx`, and `LibraryView.tsx` automatically.
- **User Settings Toggle**:
  - Added **"Filter call & voice recordings"** toggle under Settings.

---

## 🎨 Theme Flash Prevention (FOUC Fix)

- **Synchronous Theme Initialization**:
  - Added inline `<script>` in `index.html` `<head>` and updated `ThemeContext.tsx` using `localStorage.getItem('northtracks-theme')`.
  - Applies `document.documentElement.setAttribute('data-theme', theme)` before DOM body rendering, eliminating dark-to-light theme flash on startup.

---

## 🧭 Explore Tab & Music Catalog

- **Home Screen Playlist Card Styling**:
  - Re-styled `CATEGORY_CARDS` in `ExploreView.tsx` to match Home screen playlist cards (1:1 ratio square cover art container, title and subtitle text below).
  - Removed top floating icon badges from category cards.
- **Smooth Mouse Wheel Horizontal Scroll**:
  - Bound `categoriesScrollRef` with a mouse wheel listener to allow horizontal scrolling across category cards on any screen size.
- **Download Scoping & Merge Like/Download Setting**:
  - Restricted Download buttons exclusively to `ExploreView.tsx` (removed from `PlayerBar.tsx`, `HomeView.tsx`, `LibraryView.tsx`).
  - Added **"Merge Like & Auto-Download in Explore tab"** setting in `SettingsView.tsx`.
- **Library-Driven Online Recommendations**:
  - Derived personalized online music suggestions based on local PC music file genres (`tracks` / `browseLibrary`).
- **Clickable Artists & Favorite Playlists**:
  - Wrapped artist names in `<ArtistLinks />` so clicking any singer name navigates to `ArtistView`.
  - Added a Heart button overlay on category covers to save online playlists into local library playlists (`playlists.json`).

---

## 🎬 Fullscreen Player & Library Views

- **Fullscreen Now Playing Fixes**:
  - Fixed top-right `X` close button in `NowPlayingView.tsx` to instantly exit fullscreen view on click.
  - Added interactive **Volume Control Slider** with mute/unmute toggle inside `NowPlayingView.tsx`.
- **Unified Library View**:
  - Integrated tabbed navigation (`Local PC Music` and `Synced Online Tracks`) in `LibraryView.tsx`.

---

## 🧪 Build & Verification

- `npx tsc --noEmit`: Type check passed with **0 errors**.
- `node scripts/build.js`: Production build completed successfully for Electron main, preload, and Vite React renderer.
