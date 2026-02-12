# Changelog

All notable changes to OrbitView will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
