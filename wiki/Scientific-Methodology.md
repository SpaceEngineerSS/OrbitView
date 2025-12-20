# Scientific Methodology 🔬

OrbitView is built on industry-standard astrodynamic principles. This page explains the math and physics powering the simulation.

## 1. Orbital Propagation (SGP4)
OrbitView uses the **SGP4 (Simplified General Perturbations 4)** model to predict the position and velocity of satellites. 
- **TLE Data:** The model takes Two-Line Element sets (TLEs) as input.
- **Reference Frame:** Calculations are performed in the **TEME** (True Equator, Mean Equinox) coordinate system and then converted to **ITRF** (International Terrestrial Reference Frame) for Earth-fixed visualization.

## 2. Doppler Shift Calculation
The Doppler effect for satellite radio signals is calculated using the relative velocity vector ($\vec{v}_{rel}$) between the satellite and the ground observer:
$$f_{received} = f_{source} \times (1 - \frac{v_{range}}{c})$$
where $v_{range}$ is the rate of change of the distance between the observer and the satellite.

## 3. Atmospheric Decay Model
OrbitView implements a simplified **NRLMSISE-00** inspired decay model. It estimates the change in the semi-major axis over time based on:
- **B* Drag Term:** Provided in the TLE.
- **Altitude-Dependent Density:** Modeled using an exponential atmosphere approximation.
- **Solar Activity:** Estimates are adjusted for average F10.7 solar flux.

## 4. Pass Prediction Logic
A "Pass" is defined as any interval where the satellite's elevation relative to the observer is greater than 0°. 
- **AOS (Acquisition of Signal):** When elevation rises above the horizon.
- **TCA (Time of Closest Approach):** Maximum elevation and minimum range.
- **LOS (Loss of Signal):** When elevation drops below the horizon.
- **Visibility:** A pass is marked "Visual" if the satellite is sunlit and the observer is in local darkness.

## 5. Accuracy & Benchmarking
OrbitView is benchmarked against **JPL Horizons** and **STK (Systems Tool Kit)** to ensure scientific rigor.

| Capability | Observed Accuracy | Reference Frame |
|------------|-------------------|-----------------|
| Propagation | ~1-3 km/day | ITRF/WGS84 |
| Doppler | ±0.05 kHz | Topocentric Radial |
| Pass Calculation | ±5 seconds | Observer Horizon |

---

### Further Reading
- 📑 **[Detailed Theory (THEORY.md)](https://github.com/SpaceEngineerSS/OrbitVieW/blob/main/THEORY.md)**
- 🔬 **[Validation Reports](https://github.com/SpaceEngineerSS/OrbitVieW#scientific-validation-reports)**
