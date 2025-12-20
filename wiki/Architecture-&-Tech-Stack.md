# Architecture & Tech Stack 🏗️

OrbitView is designed for high performance and scientific accuracy. Here is an overview of the technical components and architecture.

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Core Framework** | [Next.js 16](https://nextjs.org/) | Modern React framework with Turbopack for performance. |
| **Graphics Engine** | [CesiumJS](https://cesium.com/) | World-class 3D geospatial engine for planetary visualization. |
| **React Components** | [Resium](https://resium.com/) | React bindings for CesiumJS. |
| **Physics Engine** | [satellite.js](https://github.com/shashwatak/satellite-js) | SGP4/SDP4 implementations for orbital propagation. |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first CSS for the modern HUD (Heads-Up Display). |
| **State Management** | React Context & Hooks | Efficient management of satellite data and UI states. |

## 🛰️ System Architecture

### 1. Data Ingestion (TLE Hub)
OrbitView fetches Two-Line Element (TLE) data from multiple sources to ensure reliability:
- **Primary:** Space-Track.org (via API)
- **Secondary:** CelesTrak (CSV/JSON fallbacks)
- **Tertiary:** Local static cache for offline/dev modes.

### 2. Propagation Layer
To maintain a responsive UI with thousands of objects, propagation (calculating position vs. time) is handled via **Web Workers**. This prevents the main UI thread from locking up during complex math.

### 3. Rendering Pipeline
- **LOD (Level of Detail):** Satellites are rendered as simple points when zoomed out and transition to high-detail models/paths when approached.
- **Dynamic Layers:** Specialized sub-components handle Ground Tracks, Footprints, and Orbit Paths separately to optimize React re-renders.

## 🚄 Performance Optimization
OrbitView uses `RequestAnimationFrame` sync and custom memoization strategies to ensure 60fps even with 5,000+ active objects.
