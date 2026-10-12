# Configuration

## Environment variables

All optional. Put them in `.env.local` for development, or in the Vercel
project settings for deployments.

| Variable | Used by | Effect |
|---|---|---|
| `SPACETRACK_USER` | `/api/tle` | Space-Track login. With it, the default catalog is the full GP catalog. |
| `SPACETRACK_PASS` | `/api/tle` | Space-Track password. Server-side only, never sent to the browser. |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | globe | Only needed if you add Cesium ion assets. The default map tiles come from Esri and need no token. |

## In-app settings

Stored in the browser (`localStorage`, key `orbitview-v4`), never sent
anywhere:

| Setting | Default |
|---|---|
| Language | from the browser, Turkish or English |
| Appearance | follows the system (light / dark) |
| Times shown in | UTC (or local time) |
| Location | not set — used for passes, look angles and Doppler |
| Elevation mask | 10° |
| Map | satellite imagery (or a dark map) |
| Orbit, ground track, coverage circle, day/night shading | on |
| Slow rotation when idle | off |

Favourites and the selected filter are stored the same way.

## Links

| Parameter | Example | |
|---|---|---|
| `sat` | `?sat=25544` | open with this NORAD catalog number selected |
| `t` | `?t=2026-10-14T03:40Z` | start the simulation at this moment (any ISO 8601 time) |

"Copy link" in the Data card produces both.

## Security headers

Set in `next.config.ts`, so they apply both locally and on Vercel:
`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, a
`Permissions-Policy` that allows only geolocation and the motion sensors, and
in production a Content Security Policy. The CSP allows Esri tiles, NOAA SWPC
and Cesium's workers; it needs `'unsafe-eval'` and `'wasm-unsafe-eval'`
because Cesium compiles WebAssembly decoders and one of its dependencies uses
`eval`.
