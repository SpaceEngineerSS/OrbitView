# OrbitView 🛰️

<div align="center">
  <img src="public/orbitview-logo-full.png" alt="OrbitView Logo" width="600">
  
 > **Advanced 3D Satellite Tracking & Orbital Mechanics Platform**  
> Real-time visualization, pass prediction, and conjunction analysis powered by CesiumJS and SGP4.
  [![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
  [![CesiumJS](https://img.shields.io/badge/CesiumJS-1.135-green)](https://cesium.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
  [![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://orbitview-five.vercel.app)
  
  [Wiki](https://github.com/SpaceEngineerSS/OrbitVieW/wiki) • [Features](#features) • [Quick Start](#quick-start) • [Scientific Validation](#-scientific-foundation--validation) • [Contributing](#contributing)
</div>

---

<div align="center">
  <p><b>Scientific Satellite Tracker & Orbital Analysis</b></p>
  <img src="public/screenshots/desktop-view.png" alt="OrbitView Desktop View" width="900">
</div>

### 📱 Mobile Experience

<div align="center">
  <img src="public/screenshots/mobile-view.png" alt="OrbitView Mobile View" width="300">
  <p><i>Fully responsive design with touch-optimized controls</i></p>
</div>

---

## ✨ Features

### 🎨 v2.2 ORBITAL GLASS Design System
- 🖥️ **Apple Vision Pro-inspired Glassmorphism UI** - Clean, modern interface with frosted glass panels, subtle gradients, and smooth animations
- ⏱️ **Smart Timeline** - Context-aware time scrubber that auto-hides when analyzing satellites
- 🎥 **Satellite Cockpit View (POV)** - Velocity-vector locked camera with Quaternion orientation
- 🔬 **Centered Scientific Modal** - Full-screen analysis dashboard with backdrop blur

### ⚡ v2.0 Performance
- 🧮 **Spatial Hashing Collision Engine** - O(N) link calculation with 1000km³ grid cells
- 📊 **Scientific Data Export** - TLE, CSV, and JSON format export for research

### 🌍 Core Features
- 🌍 **Interactive 3D Globe** - Real-time visualization of 25,000+ satellites and space objects
- 🔬 **Scientific Analysis** - Doppler shift, orbital decay, conjunction analysis, pass prediction
- 🛰️ **Professional TLE Hub** - Multi-source fallback (Space-Track, CelesTrak, AMSAT)
- ☀️ **Eclipse Detection** - Real-time sunlight/shadow status for all objects
- ⛓️ **Deep Linking** - Share specific satellites via URL (e.g., `?sat=25544`)
- ⏱️ **Time Travel** - Simulate orbits at any point in history or future
- 📱 **Mobile-Friendly** - Responsive design with touch-optimized bottom sheet UI
- 🧭 **AR Compass Mode** - Use device orientation to spot satellites in the sky
- ⌨️ **Power User Tools** - Keyboard shortcuts, analyst mode, and TLE exporting
- ⭐ **Favorites System** - Save and quickly access your favorite satellites

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/SpaceEngineerSS/OrbitVieW.git
cd orbitview

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | React framework with App Router |
| [CesiumJS](https://cesium.com/) + [Resium](https://resium.reearth.io/) | 3D globe visualization |
| [satellite.js](https://github.com/shashwatak/satellite-js) | SGP4/SDP4 orbital propagation |
| [Zustand](https://zustand-demo.pmnd.rs/) | High-performance state management |
| [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) | Spatial Hashing physics engine |
| [TailwindCSS](https://tailwindcss.com/) | Utility-first CSS |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| [Lucide React](https://lucide.dev/) | Icons |

## 📖 Documentation

### Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/
│   ├── HUD/            # Heads-up display components
│   │   ├── Sidebar.tsx
│   │   ├── Timeline.tsx
│   │   └── ...
│   └── Scientific/     # Analysis tools
│       ├── DopplerPanel.tsx
│       ├── DecayPanel.tsx
│       └── ...
├── lib/                # Core calculations
│   ├── DopplerCalculator.ts
│   ├── OrbitalDecay.ts
│   ├── ConjunctionAnalysis.ts
│   └── PassPrediction.ts
└── hooks/              # Custom React hooks
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `F` | Toggle favorite |
| `R` | Random satellite |
| `Space` | Toggle play/pause |
| `Escape` | Close panels |
| `?` | Show shortcuts |
| `A` | Toggle Analyst Mode |

### Scientific Features

#### Doppler Shift Calculator
Calculate frequency shifts for satellite radio signals based on relative velocity.

#### Orbital Decay Prediction
Estimate satellite lifetime using atmospheric drag models and B* coefficients.

#### Conjunction Analysis
Analyze close approach events between space objects with risk assessment.

#### Pass Prediction
Predict when satellites will be visible from your location with sky plots.

## 🌐 Data Sources

- **Space-Track.org**: Official source for 25,000+ active payload and debris TLEs
- **CelesTrak**: Secondary mirror and supplemental data provider
- **NASA Horizons**: High-precision ephemeris for deep space missions (JWST)
- **SatNOGS**: Real-time frequency and communication metadata

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔬 Scientific Foundation & Validation

OrbitView is engineered with high-fidelity astrodynamic models to ensure research-grade accuracy in orbital analysis.

### Core Models
- **Propagation**: High-precision **SGP4/SDP4** models considering Earth's oblateness (J2-J4), atmospheric drag ($B^*$), and deep-space perturbations.
- **Atmospheric Model**: Optimized exponential decay model correlated with real-time $B^*$ terms for objects below 600km.
- **Signal Analysis**: Relativistic Doppler shift calculations based on ITRF radial velocity vectors.

### 📊 Validation Benchmarks
We continuously validate OrbitView against ground truth data (STK, NASA J2000 Ephemerides).

| Parameter | Modelled Accuracy | Benchmark Source | Status |
|-----------|-------------------|------------------|--------|
| **LEO Propagation** | ~1-3 km (1-day) | NAVSTAR GPS (Post-Fit) | ✅ Validated |
| **Pass Prediction** | ±5 seconds (AOS/LOS) | ISS (Zarya) TLE Observations | ✅ Validated |
| **Doppler Shift** | ±5 Hz @ 435 MHz | SatNOGS Network Telemetry | ✅ Validated |
| **Orbital Decay** | ±15% (Altitude < 400km) | NRLMSISE-00 High-Fidelity | ✅ Validated |

### Detailed Scientific Reports
For in-depth analysis and methodology, please refer to the following:
- 📑 **[THEORY.md](THEORY.md)** - Comprehensive mathematical framework and derivations.
- 🔬 **[Doppler Validation](docs/validation/doppler_validation.md)** - Signal shift accuracy report.
- ⏱️ **[Pass Accuracy](docs/validation/pass_prediction_accuracy.md)** - Timeline precision analysis.
- 🧪 **[Decay Model Comparison](docs/validation/decay_model_comparison.md)** - Atmospheric density validation.

---

## 👨‍💻 Developer & Attribution

This project was developed by **Mehmet Gümüş**.

🌐 **Website:** [spacegumus.com.tr](https://spacegumus.com.tr)  
🐙 **GitHub:** [OrbitVieW](https://github.com/SpaceEngineerSS/OrbitVieW)  
𝕏 **X (Twitter):** [@persesmg](https://x.com/persesmg)  
📧 **Email:** [contact@spacegumus.com.tr](mailto:contact@spacegumus.com.tr)

## �️ Scientific Roadmap

We are committed to evolving OrbitView into the most accurate open-source orbital platform.

- **Phase 1 (Q1 2026)**: TLE History Analysis - Track orbital changes over time for specific objects.
- **Phase 2 (Q2 2026)**: Maneuver Detection - Identify impulsive maneuvers by analyzing TLE residuals.
- **Phase 3 (Q3 2026)**: High-Fidelity Shadow Model - Integrate Penumbra/Umbra atmospheric refraction for optical passes.
- **Phase 4 (Q4 2026)**: Space Weather Integration - Real-time F10.7 solar flux for dynamic atmospheric density scaling.

---

## �🙏 Acknowledgments

- [CelesTrak](https://celestrak.org/) for satellite TLE data
- [CesiumJS](https://cesium.com/) for the amazing 3D globe engine
- [satellite.js](https://github.com/shashwatak/satellite-js) for orbital calculations

---

## 🚀 Live Demo

You can test the latest stable version of OrbitView here:
[**orbitview-five.vercel.app**](https://orbitview-five.vercel.app)

---

<div align="center">
  Made with ❤️ for space enthusiasts | v2.2.0 | Last updated: 2026-01-14
</div>
