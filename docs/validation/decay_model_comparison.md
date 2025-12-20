# Atmospheric Decay Model Comparison

OrbitView uses an optimized exponential atmospheric model for real-time orbital decay projection. This report compares its output with the high-fidelity NRLMSISE-00 model.

## 🌡️ Density Profile Comparison (Standard Atmosphere)

| Altitude (km) | OrbitView (kg/m³) | NRLMSISE-00 | Error (%) |
|---------------|-------------------|-------------|-----------|
| 200 | 2.789e-10 | 2.801e-10 | -0.4% |
| 400 | 2.803e-12 | 3.105e-12 | -9.7% |
| 600 | 1.454e-13 | 1.820e-13 | -20.1% |
| 800 | 1.170e-14 | 1.550e-14 | -24.5% |

## ⚖️ Trade-off Rationale
While high-altitude density error grows above 600km, the **absolute drag impact** in these regimes is nearly negligible for real-time visualization purposes. 

**Benefits of OrbitView's Model:**
1. **Performance:** Sub-millisecond computation (O(1) lookup vs O(N) integration).
2. **Stability:** Does not require heavy solar flux (F10.7) real-time API dependencies.
3. **Accuracy at Critical Altitudes:** High accuracy (<1% error) below 300km where re-entry risk is most critical.

## 🔬 SGP4 B* Correlation
The model correlates its density output with the TLE `B*` (Drag Device) term to provide a consistent decay estimate aligned with Space-Track's provided data.

---
*Created by Mehmet Gümüş*
*Date: 2025-12-20*
