# Deployment

OrbitView runs on Vercel (that's where the live site is), but it's a normal
Next.js app and runs anywhere Node.js 20 does.

## Vercel

1. Import the repository. The framework is detected as Next.js; no build
   settings need changing (`vercel.json` only pins the framework).
2. Optionally add `SPACETRACK_USER` and `SPACETRACK_PASS` under
   *Settings → Environment Variables*.
3. Deploy.

The install step runs `postinstall`, which copies Cesium's static files into
`public/cesium` before the build.

`/api/tle` responses carry `s-maxage` headers, so Vercel's CDN serves the
catalog for two hours between upstream fetches. That keeps CelesTrak and
Space-Track happy regardless of traffic.

## Any Node host

```bash
npm ci
npm run build
npm start          # listens on PORT, default 3000
```

Put a cache in front that respects `Cache-Control: s-maxage` if you expect
traffic; otherwise the in-memory cache (two hours per group, per process)
still applies.

## After deploying

- Open the site and check the bottom-left line: it should say how many
  objects are loaded and how old the TLEs are.
- Open `/api/tle?group=stations` and look at `X-Source` and `X-Fetched-At`.
- The service worker (`/sw.js`) is only registered in production builds. Its
  cache names include the version, so a new release replaces the old caches on
  activation.
