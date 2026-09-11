# NorthTracks - Major Updates & Enhancement Documentation

## 🚀 Overview

This document summarizes all key architectural improvements, feature additions, UI/UX polish, and bug fixes implemented across NorthTracks.

---

## 🎧 Audio Processing & Equalizer (EQ)

- **Auto Hardware Adjust & Hardware Profiling**:
  - Implemented `autoDetectHardwareDevice()` and `getDetectedHardwareName()` in `AudioEngine.ts`.
  - Automatically profiles audio output hardware using Web Audio device enumeration to detect profiles like **Home Theater System (Surround 5.1)**, **Soundbar & Cinema Speakers**, **Studio Headphones / Reference Monitors**, **Bluetooth AirPods / Earbuds**, and **Desktop Hi-Fi Speakers**.
  - Displays detected hardware profile badge directly in `EQPanel.tsx`.
- **Spotify & YouTube Music Studio Master DSP**:
  - Integrated `DynamicsCompressorNode` into `AudioEngine.ts` node processing graph (-24dB threshold, 4:1 ratio compression) for commercial studio clarity.
  - Added one-click Studio Master DSP toggle to enhance dynamic range and loudness of local and online audio tracks.
- **"Hey Cortana" Hands-Free Voice Assistant**:
  - Added `CortanaControl.tsx` component in `PlayerBar.tsx` with animated Cortana halo pulse ring.
  - Speech Recognition integration for hands-free voice commands ("Hey Cortana, play next track", "Volume up", "Bass boost", "Spotify mode").
- **Full-Length Online Track Playback in Explore Tab**:
  - Continuous stream resolution & seamless extension in `App.tsx` ensuring Explore tab online tracks play 100% full song length (3:30+ mins) without stopping after 30 seconds.
- **Adaptive AGC Loudness & Pitch Auto-Adjustment**:
  - Implemented `startAdaptiveLoudnessControl()` in `AudioEngine.ts` running a real-time Automatic Gain Control (AGC) loop every 250ms.
  - Smoothly equalizes RMS volume level (-14 LUFS target) when switching from quiet tracks (acoustic/lofi) to loud tracks (EDM/rock), preventing sudden volume spikes.
- **Personalized Recommendations in Explore Tab**:
  - Added `"Picked for You Based on Your Listening"` section in `ExploreView.tsx`.
  - Automatically queries online music catalog matching the user's most played artist/genre (e.g. `"Recommended Hits (Because You Listen to Charli XCX)"`).
- **Explore Tab Card Layout Matching Home View**:
  - Re-styled Explore tab category & recommendation cards to match the Home screen (1:1 ratio 150px square cover art, `borderRadius: 8px`, `fontWeight: 600` title, subtext underneath).
  - Removed icon clutter and fake text strings (`500+ Trending Tracks`).

---

## 🔍 Smart Media Catalog Scanner, Stale File Purging & Call Recording Filter

- **OS Music Folder Default Scanning**:
  - Default scanning in `scanner.ts` strictly targets the OS Music folder (`path.join(os.homedir(), 'Music')`), preventing rogue scanning of entire PC drives, system folders, or AppData.
- **Disk Existence Validation & Automatic Stale Purging**:
  - `get-library` IPC handler in `main.ts` verifies `fs.existsSync(track.filePath)`.
  - When music files are deleted from disk by the user, they are automatically purged from `library.json` so deleted tracks disappear instantly from the app.
- **Enhanced Call Recording & Podcast Filter**:
  - `isRecordingTrack` in `scanner.ts` filters phone numbers (`+91...`, `022...`), call recordings (`call_rec`, `rec_`, `aud-`, `ptt-`), WhatsApp audio, Jio/Airtel spam alerts, podcasts, audiobooks, and short sound clips (<12s).
- **Context-Aware Search Bar (Explore vs Local)**:
  - When on the **Explore** tab, search queries fetch and display online music catalog results (`searchOnlineMusic`).
  - When on **Home** or **Library**, search queries exclusively search local PC tracks from the OS Music folder.

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
