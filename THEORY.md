# The maths behind OrbitView

Notes on what the app actually computes, in the order a position flows
through it. Each section names the file that implements it. Equations are in
plain text so they read the same everywhere.

References I lean on throughout:

- Vallado, *Fundamentals of Astrodynamics and Applications*, 4th ed. (2013)
- Hoots & Roehrich, *Spacetrack Report No. 3* (1980) — SGP4
- Vallado, Crawford, Hujsak & Kelso, *Revisiting Spacetrack Report #3* (AIAA 2006-6753)
- King-Hele, *Satellite Orbits in an Atmosphere* (1987)

---

## 1. Element sets and SGP4

A two-line element set (TLE) is not a position. It is a set of *mean*
elements fitted so that the SGP4/SDP4 propagator reproduces observations. They
are only meaningful when fed back into SGP4, which is why OrbitView never uses
them with plain Kepler equations.

Propagation is done by [satellite.js](https://github.com/shashwatak/satellite-js),
a port of the Vallado 2006 code. It returns position and velocity in the
**TEME** frame (true equator, mean equinox of date), in km and km/s.

`satrec.error` is checked after every call; a non-zero value (eccentricity out
of range, decayed orbit…) means the object is hidden rather than drawn at a
wrong place. — `src/lib/orbit.ts`, `src/workers/satellite.worker.ts`

### Derived elements

From the SGP4 record, not from the instantaneous radius:

```
period      = 2π / n             (n: un-Kozai'd mean motion, rad/min)
a           = rec.a · 6378.135 km
perigee alt = a (1 − e) − 6378.135
apogee alt  = a (1 + e) − 6378.135
```

Earlier versions used `6371 + current altitude` as the semi-major axis, which
is wrong for anything eccentric. — `elementsFromSatrec` in `src/lib/orbit.ts`

---

## 2. From TEME to the ground

### Sidereal time

TEME is rotated to the Earth-fixed frame by the Greenwich mean sidereal angle
θ (IAU-82, the model SGP4 is built on). OrbitView uses `satellite.gstime`
everywhere.

Version 3 had its own GMST function that evaluated the 0h-UT polynomial at the
full Julian date *and* added the rotation for the time of day, counting it
twice — up to about 1° late by 23:59 UTC. A test now compares against
`gstime` across a day to 1e-12 rad.

### Position and velocity

```
r_ecf = R3(θ) · r_teme
v_ecf = R3(θ) · v_teme − ω⊕ × r_ecf         ω⊕ = 7.292115e-5 rad/s
```

The second term is the one people forget. Rotating the velocity is not
enough: a point fixed on the ground moves at up to 0.46 km/s in the inertial
frame, so the velocity *relative to the ground* has to subtract it. Every
calculation that uses velocity (Doppler, range rate) goes through
`temeToEcf` in `src/lib/orbit.ts`.

### Geodetic coordinates

Latitude is found iteratively on the WGS-84 ellipsoid; height is computed as

```
h = p cos φ + z sin φ − a √(1 − e² sin² φ)
```

which, unlike `p / cos φ − N`, doesn't blow up at the poles.
— `ecfToGeodetic` in `src/lib/CoordinateConverter.ts`

---

## 3. Look angles

For an observer at geodetic (φ, λ, h), the range vector ρ = r_sat − r_obs is
projected onto the local South-East-Zenith axes:

```
S = sin φ cos λ ρx + sin φ sin λ ρy − cos φ ρz
E = −sin λ ρx + cos λ ρy
Z = cos φ cos λ ρx + cos φ sin λ ρy + sin φ ρz

azimuth   = atan2(E, −S)          (clockwise from north)
elevation = asin(Z / |ρ|)
range rate = (ρ · v_ecf) / |ρ|     (positive = moving away)
```

— `lookAngles` in `src/lib/orbit.ts`

---

## 4. Passes

A pass is the interval in which elevation ≥ the mask (10° by default,
adjustable in settings).

1. **Scan** the window every 60 s. A LEO pass above 10° lasts several minutes,
   so none is skipped.
2. **Bisect** each sign change of (elevation − mask) down to 0.5 s to get rise
   (AOS) and set (LOS).
3. **Golden-section search** between AOS and LOS for culmination; elevation
   is unimodal over a single pass.

The window starts 30 minutes before "now" so a pass already in progress keeps
its real rise time, and a pass still in progress at the end of the window is
followed until it sets. An object that never sets (a geostationary satellite
in view) is reported as one pass covering the window.

**Visibility.** A pass is marked sunlit when, at any moment of the pass, the
satellite is in sunlight and the Sun is more than 6° below the observer's
horizon (civil twilight). The pass is checked every 30 s plus its ends and
culmination: evening passes often enter the shadow before their highest
point. The app says "sunlit in a dark sky" rather than "visible" because it
doesn't estimate brightness — a small cubesat can be sunlit and still far too
faint to see. Shadow uses a cylindrical Earth-shadow model, which is accurate to
a few seconds at the shadow boundary.

Not modelled: atmospheric refraction (≈ 0.5° at the horizon, so real rises are
a little earlier), and the Earth's oblateness in the horizon itself.

The test suite checks AOS/LOS against a 1-second brute-force scan (± 2 s) and
that no 5-second sample in a pass is higher than the reported maximum.
— `src/lib/PassPrediction.ts`

---

### Tonight

The night is the interval in which the Sun is more than 6° below the
observer's horizon. It is found with a 10-minute scan of the Sun's elevation
from the current simulation time (if it's already dark the window starts
now), and both edges are refined by bisection to about 10 s. Passes of the
CelesTrak "visual" group (about 100 bright objects) are then predicted inside
that window with the method above, and only those marked visible are listed.
— `src/lib/tonight.ts`

---

## 5. Doppler

```
Δf = −(ṙ / c) · f₀
f_received = f₀ + Δf
```

with ṙ the range rate from section 3 and c = 299 792 458 m/s. Negative ṙ
(approaching) raises the frequency. This is first-order Doppler; for LEO
speeds the relativistic terms are below 1 Hz at VHF/UHF.

Because ṙ uses the Earth-fixed velocity, a geostationary satellite correctly
shows almost no shift. The tests check ṙ against the numerical derivative of
the range (< 1 m/s) and a GEO case (< 20 m/s).
— `computeDoppler` in `src/lib/DopplerCalculator.ts`

---

## 6. Orbital lifetime

This is an estimate, not a reentry prediction.

**Ballistic coefficient from B\*.** SGP4 defines

```
B* = ρ₀ B / 2,   ρ₀ = 0.15696615 kg m⁻² ER
B  = C_D A / m = 2 B* / ρ₀      [m²/kg]
```

**Decay.** For a near-circular orbit (King-Hele):

```
da/dt = −B ρ(h) √(μ a)
```

Drag acts mostly near perigee, so the integration runs on the perigee height,
which is pessimistic for eccentric orbits. The step is adaptive (at most 0.5 km
of height loss or 30 days per step) down to 120 km; beyond 25 years the result
is reported as "> 25 years".

**Atmosphere.** Exponential bands from Vallado table 8-4 (CIRA-72 based),
all 28 bands from 0 to 1000 km. Earlier versions skipped the 110–180 km bands,
which put a 19× density jump at 150 km.

**Uncertainty.** Solar activity changes thermospheric density by roughly
×0.5–×2 over a cycle, so the range shown is the same integration with ρ×2 and
ρ×0.5. B* in a TLE is a fitted, noisy parameter (it absorbs other model
errors too); it is used as |B*|, and anything below 1e-7 is treated as "drag
not measurable".

Space weather (F10.7, its 81-day mean, Kp) from NOAA SWPC is shown for
context but not multiplied into the result: B* already reflects the drag the
satellite actually experienced when the element set was fitted.
— `src/lib/OrbitalDecay.ts`, `src/lib/SpaceWeather.ts`

---

## 7. Close-approach screening

For the selected object against everything loaded:

1. **Apogee/perigee filter** (Hoots, Crawford & Roehrich 1984). Two orbits
   whose altitude shells are further apart than the threshold can never meet,
   so they're skipped. This removes most of the catalog.
2. **Coarse scan** of the separation every 60 s over the window. A local
   minimum below `threshold + 15 km/s × 60 s` is a candidate (relative speeds
   in LEO reach about 15 km/s, so a closer approach could hide between samples).
3. **Refine** each candidate with a golden-section search to about 0.1 s,
   giving the time of closest approach, miss distance and relative speed.

TLE positions are uncertain by a kilometre or more, and there is no
covariance here, so this produces a list worth looking at, not a probability
of collision. Operators use conjunction data messages from 18 SDS for that.
— `src/lib/ConjunctionAnalysis.ts`

---

## 8. Ground track, orbit ring and footprint

- **Ground track:** sub-satellite points 1–5 periods ahead (a setting) and
  half a period behind, recomputed every 30 s of simulation time.
- **Orbit ring:** one revolution of TEME positions, drawn with a model
  matrix that rotates it by −θ (the sidereal angle at the current time). That
  is the inertial orbit as seen from the turning Earth, so the satellite sits
  exactly on it, and turning the Earth only changes the matrix. The positions
  themselves are recomputed every 15 minutes of simulation time to follow slow
  changes such as nodal precession.
- **Coverage circle:** the ground area from which the object is above the
  elevation mask ε:

```
λ = arccos(R cos ε / (R + h)) − ε        (Earth central angle)
radius on the ground = R λ
```

— `src/lib/GroundTrack.ts`, `src/components/globe/SelectedTrack.tsx`
