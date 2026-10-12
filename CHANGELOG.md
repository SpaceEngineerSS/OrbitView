# Changelog

All notable changes to OrbitView will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.0.0] - 2026-10-12

Most of the app was rewritten for this release. The calculations got a second
look, the data layer stopped hiding failures, and the interface was redesigned
from scratch.

### Fixed — calculations
- Doppler used the inertial velocity rotated into the Earth-fixed frame but
  left out the Earth's rotation (the ω × r term): up to 0.4 km/s of range-rate
  error for LEO, about 200 Hz at 145.8 MHz, and a large false shift for GEO.
- Sidereal time counted the time of day twice, up to about 1° late by the end
  of each UTC day. It now uses `satellite.gstime`, like SGP4 itself.
- Pass rise and set times were the first 60-second sample past the threshold.
  They are now bisected to 0.5 s; culmination comes from a golden-section
  search. Passes already in progress, or still in progress at the end of the
  window, keep their real times.
- Period and semi-major axis were derived from the current altitude. They now
  come from the SGP4 mean motion.
- The lifetime model skipped five density bands (a 19× jump at 150 km), mixed
  units, and clamped its rate. It now uses the full Vallado table, the
  ballistic coefficient from B*, perigee height and a solar-activity range.
- The inter-satellite link search missed most pairs between 1000 and 2500 km.
  It drew nothing, so it was removed.

### Fixed — labels
- "Space stations" counted all 19 objects in CelesTrak's stations list
  (modules, cargo ships, cubesats, a piece of debris). It now means the ISS
  and Tiangong.
- Unidentified new launches ("OBJECT A") were counted as debris; with the
  satellite catalog loaded, debris and rocket bodies come from its object type.
- Geostationary needs an inclination under 5°; inclined geosynchronous
  satellites (BeiDou IGSO, QZSS) are no longer listed as GEO. Every object now
  has exactly one regime, so the chips add up to the whole catalog.
- The GNSS filter missed GLONASS ("COSMOS … (7xx)"), Galileo and NavIC NVS.
- A pass is marked sunlit if any part of it is, not only the culmination.
  "Visible"/"Radio only" are now "Sunlit"/"Not visible": the app doesn't
  estimate brightness, and debris doesn't transmit.
- Doppler no longer defaults to the ISS voice frequency for every object and
  is hidden for debris; the NOAA APT preset is gone (NOAA 15/18/19 are retired).
- Lifetime badge follows the estimated lifetime (weeks / months / years /
  long-lived) instead of the perigee height.
- "TLEs 13 min old" was the download time; it now says "Updated 13 min ago".
- Featured: NOAA 21 replaces the retired NOAA 19, and GOES 19 (GOES-East
  since 2025) replaces GOES 16.

### Fixed — data
- A failed TLE group no longer returns the default catalog under that group's
  name (which could label every satellite as a space station for two hours).
- Every upstream request has a timeout; unknown groups return 400; failures are
  cached for five minutes so CelesTrak isn't hammered.
- IndexedDB errors are caught. A partial or stale refresh never overwrites the
  stored catalog, and background refreshes now reach the running app.
- Space-weather fallbacks were shown as live readings. They are now marked.
- The service worker cached API responses and range requests without limit.

### Performance
- The globe draws only when something changes. With time paused it doesn't
  draw at all; at normal speed it redraws a few times a second instead of
  sixty.
- Positions are recomputed on a timer whose rate follows speed, zoom and the
  device, only for the objects the current filter shows, and not while the
  tab is hidden.
- Passes, close-approach screening and the tonight list run in a second
  worker. Selecting an object starts one pass calculation instead of four.
- The browser's default GPU is requested instead of the high-performance one.
- Slower devices switch to a light profile automatically; Battery saver in
  Settings does it on demand.

### Changed
- New interface: light and dark appearance, cards instead of tabs, a first card
  that changes with the situation (overhead now / visible pass / next pass),
  a 48-hour pass strip, a pass marker scrubber, and a phone layout built
  around one bottom sheet.
- Your location is set from the device, a city list or by hand. Nothing assumes
  Ankara any more.
- Turkish and English everywhere; the language switch works on every screen.
- The main catalog uses Space-Track when configured, then CelesTrak.
- Next.js 16.3.8, Motion, Phosphor icons, Instrument Sans.
- Cesium's static files are copied from `node_modules` on install instead of
  being committed.
- Security headers and a Content Security Policy are set in `next.config.ts`.

### Added
- Tonight: visible passes of the ~100 brightest satellites during your next
  dark period.
- Add a pass to your calendar (.ics with a reminder); browser alerts before
  passes of starred and selected satellites while the app is open.
- Satellite identity from the CelesTrak catalog (owner country, launch date
  and site, object type, radar size) and a country filter.
- Flat map view.
- NASA's ISS model and a view from the satellite.
- Ground track length of 1–5 orbits; position and velocity in TEME and ECEF;
  references in About.
- Close-approach screening against the loaded catalog, with time of closest
  approach and relative speed.
- Doppler curve across the next pass; any downlink frequency.
- Ephemeris export (CSV, JSON) from the simulation time.
- Links to a specific object at a specific time: `?sat=25544&t=…`.
- Sky view on phones, steered by the compass from your location.
- Regression tests for every calculation above, against independent
  references.

### Removed
- About 4,000 lines of components that were never shown, the unused 3D models,
  Supabase types, and the placeholder readouts (random Doppler, "98% signal",
  "ONLINE").

## [2.4.0] - 2026-07-11

### Added
- **Interactive Desktop Search Autocomplete**
  - Autocomplete search suggestions dropdown in `TopBar` for desktop viewports
  - Support for real-time name/NORAD ID filtering and mouse/keyboard navigation (Arrow keys/Enter/Escape)
  - Auto-reset search filters when a satellite is selected or deselected
- **Globe Performance & Texture Loading**
  - Swapped default tile source to high-resolution ArcGIS World Imagery (Satellite) for realistic photographic globe textures
  - Pre-computed satellite visibility caching in `TLELayer.tsx` (O(1) lookups instead of 60fps string comparisons)
  - Throttled Web Worker propagation loop to 20fps and guarded primitive writes to save CPU/GPU overhead
- **Usability & UX Enhancements**
  - Integrated header close buttons directly inside `MissionDashboard` and `SettingsPanel` with smooth exit animations
  - Redesigned "No Target Selected" view inside a beautiful red-alert themed card with clear close actions
  - Dynamic positioning to prevent HUD panels from overlapping with the timeline scrubber on desktop
  - Auto-Rotate Globe toggle switch in Settings Panel to stop/start globe spinning

### Fixed
- Cesium Ion 401 Unauthorized API responses by correcting token environment variable mapping
- Next.js hydration mismatches on the clock controls by adding client-side mounting guards
- Repaint freeze on the 3D globe where loaded map tiles remained white when panning (disabled `requestRenderMode`)

## [2.3.0] - 2026-02-12

### Added
- **Mobile Experience & PWA**
  - Designed "Pocket Lab" interface with bottom-sheet Inspector and gesture controls
  - Implemented haptic feedback for tactile interactions
  - Added "Adaptive Performance" mode for mobile GPUs (auto-resolution scaling)
  - Created specific `MobileNavBar` replacing the sidebar on small screens
- **Documentation & Automation**
  - Automated screenshot generation via Puppeteer (`npm run docs:snap`)
  - Comprehensive `CONTRIBUTING.md` with scientific verification standards
  - GitHub Action (`docs.yml`) for documentation integrity checks
  - Updated `README.md` with fresh assets and scientific roadmap

### Fixed
- Navigation glitches on mobile where "Mission" button was unresponsive
- Dashboard tabs hidden on mobile screens (now scrollable)
- Syntax errors in `MissionDashboard.tsx` causing build warnings

---

## [2.2.0] - 2026-01-14

### Added
- **ORBITAL GLASS 2.0 Design System**
  - Apple Vision Pro-inspired glassmorphism aesthetic
  - Centered modal overlay for Scientific Dashboard
  - Smart TimeScrubber auto-hide when satellite selected
  - Refined frosted glass panels with subtle gradients
- **Documentation**
  - New desktop and mobile screenshots in README
  - Updated design system documentation

### Changed
- **ScientificDashboard:** Converted from side panel to centered modal with backdrop blur
- **TimeScrubber:** Now hides automatically when a satellite is selected, reducing visual clutter
- **UI Polish:** Larger modal sizes (700px/900px) with improved spacing and typography

### Fixed
- Redundant condition in prediction panel render
- Improved accessibility with ARIA labels on modal buttons

---

## [2.1.0] - 2025-12-29

### Added
- **Scientific HUD:** Completely redesigned Glassmorphism interface
  - `GlassPanel` - Base container with backdrop blur and neon effects
  - `MissionControl` - Top HUD bar with live/paused status indicator
  - `TelemetryDeck` - Bottom panel showing real-time satellite telemetry
  - Neon glow effects and scan-line animations
- **Time Machine:** YouTube-style draggable timeline (`TimeScrubber`)
  - Zustand-powered state management (`timelineStore.ts`)
  - Speed multiplier controls (0.1× to 3600×)
  - Bidirectional sync with Cesium Clock (100ms throttle)
- **Physics Core:** Spatial Hashing engine for 25k+ satellite performance
  - 1000km³ grid cell structure in `satellite.worker.ts`
  - O(N²) → O(N×k) complexity reduction for link calculation
- **Camera:** Velocity-vector locked "Satellite POV" mode
  - Quaternion-based orientation with Gram-Schmidt orthogonalization
  - Prograde direction following with radial "up" vector
- **Export:** Full data export functionality in InfoPanel
  - TLE format (`.tle`)
  - CSV telemetry export
  - JSON full data export

### Changed
- **State Management:** Migrated from React Context to Zustand for timeline control
- **UI Borders:** Thinner `border-white/5` for modern glassmorphism
- **Backdrop Blur:** Upgraded to `backdrop-blur-2xl`
- **Shadows:** Added colored shadows (`shadow-cyan-500/5`)

### Fixed
- **SSR Hydration:** Added `mounted` state pattern to fix clock mismatch
- **Mobile UX:** Safe area insets (`env(safe-area-inset-bottom)`) for iPhone
- **Bottom Sheet:** Improved handle bar styling

---

## [1.0.0] - 2024-12-19

### Added
- 🌍 Interactive 3D globe with CesiumJS
- 🛰️ Real-time tracking of 5000+ satellites from CelesTrak TLE data
- ⏱️ Timeline controls with time travel and speed multiplier
- 🔬 Analyst Mode with scientific dashboard
  - Doppler shift calculator
  - Orbital decay prediction
  - Conjunction analysis
  - Pass prediction with sky plots
- 📱 Mobile-responsive design with bottom sheet UI
- 🧭 AR Compass Mode for mobile devices
- ⌨️ Keyboard shortcuts for power users
- ⭐ Favorites system with local storage
- 🎨 Dark theme with glassmorphism design
- 🚀 JWST L2 orbit visualization

### Technical
- Next.js 16 with App Router
- CesiumJS + Resium for 3D rendering
- satellite.js for orbital calculations
- Web Worker for background calculations
- Framer Motion animations
- TailwindCSS styling
