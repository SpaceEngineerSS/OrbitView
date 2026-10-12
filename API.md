# `/api/tle`

The only server endpoint. It fetches two-line element sets from upstream,
caches them, and tells the client honestly how fresh they are.

```
GET /api/tle?group=<name>
```

## Groups

| `group` | Source |
|---|---|
| *(none)* or `default` | Space-Track GP (objects with an epoch in the last 30 days) if `SPACETRACK_USER`/`SPACETRACK_PASS` are set; otherwise, or if it fails, CelesTrak `active`; then a stale copy; then a tiny built-in set |
| `stations`, `active`, `starlink`, `cubesat`, `oneweb`, `iridium` | the CelesTrak group of that name |
| `all` | `stations` + `starlink` + `cubesat` merged |

Anything else is `400` with the list of allowed names. The app itself asks for
`stations` and `default`.

## Responses

Body: plain-text 3-line TLE (name, line 1, line 2).

| Status | Meaning |
|---|---|
| `200` | data for the group you asked for |
| `400` | unknown group |
| `502` | upstream failed and nothing is cached for this group |
| `503` | upstream failed recently; not retried for 5 minutes (`Retry-After`) |

A failing group never returns some other group's data. Earlier versions did,
under a 2-hour CDN cache, which is how the whole catalog could end up
labelled as space stations.

### Headers

| Header | |
|---|---|
| `X-Group` | the group served — the client rejects a mismatch |
| `X-Source` | `space-track`, `celestrak-<group>`, `celestrak-multi` or `embedded` |
| `X-Fetched-At` | when the data came from upstream (ISO 8601) |
| `X-Cache-Status` | `HIT_SERVER` or `MISS` |
| `X-Stale: 1` | older than the cache lifetime, or embedded |
| `X-Fallback: 1` | `default` was served from CelesTrak instead of Space-Track |
| `X-Partial: 1`, `X-Groups-Failed` | `all` with some groups missing |

### Caching

| Case | `Cache-Control` |
|---|---|
| fresh | `public, s-maxage=7200, stale-while-revalidate=600` |
| `default` from the CelesTrak fallback | `public, s-maxage=600` |
| stale | `public, s-maxage=60` |
| embedded, errors | `no-store` |

The server also keeps each group in memory for 2 hours. CelesTrak asks
clients not to download the same group more often than that; together with
the CDN cache this keeps the upstream load to a handful of requests a day.

### Timeouts

10 s for CelesTrak, 15 s for the Space-Track login and query, 5 s for the
Space-Track logout (best effort, after every query).

## Client side

`src/lib/tle.ts` calls the endpoint, keeps the last complete, fresh catalog in
IndexedDB, and refreshes in the background (stale-while-revalidate). A partial
or stale refresh is shown but never written over the stored catalog. The UI
shows the age of the data and says when the source was unreachable.
