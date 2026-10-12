# Validation

What is tested, against what, and how closely. All of these run with
`npm test`; the numbers below are the assertions in the test files, not
estimates.

The question these tests answer is "does OrbitView add error on top of
SGP4?". They don't measure SGP4 or TLE accuracy itself — for that, see
Vallado et al. 2006 and the TLE age warning in the app.

## Frames and time — `src/lib/__tests__/science-regressions.test.ts`

| What | Reference | Assertion |
|---|---|---|
| GMST every 30 min for a day | `satellite.gstime` | equal to 1e-12 rad |
| Geodetic round trip at 89.9999°, 90°, −90° | `geodeticToEcf` | height to 1 mm, latitude to 1e-4° |
| Mean elements of the ISS | its TLE | period, inclination, epoch match |

## Doppler

| What | Reference | Assertion |
|---|---|---|
| Range rate at 20 times over 2 h 20 min | central difference of range, ±0.5 s | within 1 m/s |
| Geostationary satellite seen from Istanbul | ≈ 0 by definition | below 20 m/s |
| Elevation and horizon flag | — | consistent |

The second case is the one that caught the v3 bug: without the ω × r term a
GEO satellite showed about 3 km/s of range rate, roughly 100 kHz at 12 GHz.

## Passes

| What | Reference | Assertion |
|---|---|---|
| AOS and LOS of every full pass in 24 h | 1-second brute-force scan | within 2 s |
| Maximum elevation | 5-second samples across the pass | none higher than reported + 0.01° |
| Pass already in progress at window start | — | flagged, starts at the window |
| Pass still in progress at window end | the same pass in a wider window | same LOS to 2 s |

## Lifetime

| What | Assertion |
|---|---|
| B* parsing, including negative and malformed fields | exact |
| ISS-like orbit | between 2 months and 5 years, range brackets the estimate |
| Lower perigee | shorter lifetime |
| B* = 0 | "drag not measurable" |
| 1200 km perigee | beyond the 25-year horizon |

## Close approaches

| What | Assertion |
|---|---|
| ISS vs. GEO | rejected by the apogee/perigee filter |
| ISS vs. the same orbit 0.01° behind | found, miss distance < 5 km, GEO not reported |

## Rendering and new features — `v4-features.test.ts`

| What | Assertion |
|---|---|
| Worker's inline TEME→ECF rotation vs. `stateAt` | under 1 m |
| Worker only touches the visible indices; failed propagation | untouched / NaN |
| Frame-rate rule | 0 when paused, 500 ms zoomed out at ×1, 66 ms at high speed, ≥ 200 ms on battery saver |
| Device tier | static hints and measured medians classify as expected |
| Calendar export | UTC times, escaping, 75-character folding, reminder |
| SATCAT parsing | decayed objects dropped, quoted names, radar size |
| Night window (Istanbul) | Sun below −6° just inside both edges, above it just before dusk |
| Shared pass cache | one calculation per key; previous result shown while a new window loads |

## Data layer — `tle.test.ts`, `db.test.ts`, `SpaceWeather.test.ts`, `route.test.ts`

- IndexedDB read failure falls back to the network; write failure still
  returns the downloaded data.
- A partial or stale refresh never overwrites the full cached catalog.
- Duplicate catalog numbers get stable suffixes.
- The API returns 400 for unknown groups, 502/503 (not someone else's data)
  when the upstream fails, flags stale responses, and times out.
- Kp parsing handles both NOAA JSON layouts; failed fetches are flagged as
  fallback values rather than shown as live.
