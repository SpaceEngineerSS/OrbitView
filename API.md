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
| `visual` | CelesTrak's ~150 brightest objects. The Tonight card normally takes them from the loaded catalog and asks for this group only if the catalog lacks most of them |
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

---

# `/api/satcat`

```
GET /api/satcat
```

CelesTrak's satellite catalog (`satcat.csv`, about 6–7 MB) reduced to the
objects still in orbit, as JSON:

```json
{ "fetchedAt": 1760280000000,
  "rows": [["25544", "ISS", "1998-11-20", "TYMSC", "PAY", "+", 399.05, "1998-067A"], …] }
```

Row fields: NORAD id, owner code, launch date, launch site code, object type
(`PAY`, `R/B`, `DEB`, `UNK`), operational status, radar cross-section (m², or
null), international designator.

Cached for a day in memory and on the CDN (`s-maxage=86400`); after a failure
the last good copy is served with `X-Stale: 1` for ten minutes, or a `503` if
there is none. Upstream timeout: 20 s. The client loads it once the globe is
idle and uses it for the Identity card and the country filter.
