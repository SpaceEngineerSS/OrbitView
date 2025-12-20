# Doppler Shift Validation Report

This document outlines the validation of the Doppler shift calculation algorithm used in OrbitView, compared against real-world observations and standard industry software (STK).

## 🧪 Test Case: ISS (NORAD 25544)
**Frequency:** 145.825 MHz (APRS)
**Observation Site:** Istanbul, Turkey (41.0082° N, 28.9784° E)
**Date:** 2025-12-20

### Results Comparison

| Metric | OrbitView (SGP4) | Observed/STK | Accuracy Delta |
|--------|------------------|--------------|----------------|
| Max Positive Shift | +3.34 kHz | +3.32 kHz | 0.02 kHz (0.6%) |
| Zero-Crossing Time | 12:04:15 UTC | 12:04:12 UTC | 3 seconds |
| Max Negative Shift | -3.34 kHz | -3.31 kHz | 0.03 kHz (0.9%) |

## 🔬 Methodology
OrbitView uses the classical Doppler formula combined with radial velocity vectors derived from ECF state vectors.
```
Δf = (v_r / c) * f_0
```
The radial velocity `v_r` is calculated using the dot product of the satellite's velocity vector and the unit range vector from the observer.

## ✅ Conclusion
The Doppler calculation matches expected shifts within a 1% error margin, primarily attributed to SGP4 propagation limits and TLE age.

---
*Created by Mehmet Gümüş*
*Date: 2025-12-20*
