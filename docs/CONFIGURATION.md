# Configuration Guide

OrbitView is highly configurable via environment variables and settings. This guide explains how to customize the application.

## 🔑 Environment Variables

Create a `.env.local` file in the root directory to override default settings.

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Base URL of your deployment | `http://localhost:3000` |
| `SPACETRACK_USER` | Space-Track.org login email | (empty) |
| `SPACETRACK_PASS` | Space-Track.org login password | (empty) |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Cesium Ion access token | (optional) |

> [!NOTE]
> Space-Track credentials enable the "Full Catalog" mode, tracking over 20,000 objects. Without them, the app falls back to CelesTrak (~5,000 active satellites).

## ⚙️ Application Settings (In-App)

Users can customize their experience through the **Settings Panel** (Gear icon):

### 🌍 Visualization
- **Show Orbits**: Toggle rendering of orbital paths (performance impact: Medium).
- **Show Labels**: Display satellite names next to their positions (performance impact: Low).
- **Show Ground Track**: Toggle the sub-satellite point track (performance impact: Low).
- **Enable Lighting**: Use real-time Sun position for globe lighting (performance impact: High).
- **Enable Atmosphere**: Use high-fidelity atmospheric scattering (performance impact: High).

### ⚡ Performance
- **Max Satellites**: Limit the number of satellites rendered simultaneously.
- **Orbit Path Quality**: Step size for orbit lines (Lower = Faster).

## 🔬 Scientific Calibration

Parameters for scientific models are located in `src/lib/`:

- **Atmospheric Model**: Scaling factors for drag are in `src/lib/OrbitalDecay.ts`.
- **Pass Prediction**: Default minimum elevation is set to 10° in `src/lib/PassPrediction.ts`.
- **Conjunction Risk**: Thresholds for "High Risk" are defined in `src/lib/ConjunctionAnalysis.ts`.

---

## 👨‍💻 Developer Attribution

Configured and documented by **Mehmet Gümüş**.
🌐 [spacegumus.com.tr](https://spacegumus.com.tr)

*Last Updated: 2025-12-20*
