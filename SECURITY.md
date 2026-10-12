# Security

## Supported versions

Only the latest release (currently 4.x) gets fixes. The live site always runs
the latest `main`.

## Reporting a problem

Please don't open a public issue for security problems. Email
**security@spacegumus.com.tr** with:

- what the issue is and where (file, route or URL),
- how to reproduce it,
- what an attacker could do with it.

I'll reply within a few days and keep you updated until it's fixed. If you
want credit in the changelog, say how you'd like to be named.

## What there is to protect

OrbitView has no user accounts and stores nothing about visitors on the
server. The parts worth looking at:

- **`/api/tle`** — the only server endpoint. It calls CelesTrak and, if
  configured, Space-Track with credentials from environment variables. Those
  credentials are never sent to the browser.
- **The browser** — location, settings and favourites live in `localStorage`;
  the catalog in IndexedDB. Nothing is sent anywhere else.
- **Headers** — CSP, `X-Frame-Options: DENY` and a narrow
  `Permissions-Policy` are set in `next.config.ts`.

## If you self-host

- Keep `SPACETRACK_USER` / `SPACETRACK_PASS` in environment variables, never in
  the repository. Rotate them if they leak.
- Serve over HTTPS.
- Keep a cache that honours `s-maxage` in front of `/api/tle` so a traffic
  spike doesn't turn into upstream requests.
