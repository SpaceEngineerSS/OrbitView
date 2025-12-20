# Changelog

All notable changes to OrbitView will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
