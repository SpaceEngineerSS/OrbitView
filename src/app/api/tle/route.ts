import { NextRequest, NextResponse } from 'next/server';

/**
 * TLE API Route - Multi-Group Support
 *
 * Supported `group` values:
 * - stations | starlink | cubesat | active | oneweb | iridium  (single CelesTrak group)
 * - all      (stations + starlink + cubesat, merged)
 * - default  (also used when no param is given: Space-Track full catalog,
 *             falling back to CelesTrak `active`, then embedded TLEs)
 *
 * Response contract:
 * - 200 with fresh data: `X-Source` names the upstream, `X-Group` the group served.
 * - 200 with stale data for the SAME group: additionally `X-Stale: 1`, short s-maxage.
 * - 200 with embedded last-resort data (default group only): `X-Source: embedded`,
 *   `X-Stale: 1`, `Cache-Control: no-store`.
 * - 400 for an unknown group, 502/503 JSON when the upstream failed and nothing
 *   cached exists for that group.
 */

const isDev = process.env.NODE_ENV !== 'production';
function devLog(...args: unknown[]): void {
    if (isDev) console.log(...args);
}

interface CacheEntry {
    data: string;
    timestamp: number;
    source: string;
}

// Server-side in-memory caches (per group)
const serverCache = new Map<string, CacheEntry>();
const failureCache = new Map<string, number>(); // group -> time of last failure

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CELESTRAK_TIMEOUT_MS = 10_000;
const SPACETRACK_TIMEOUT_MS = 15_000;
const SPACETRACK_LOGOUT_TIMEOUT_MS = 5_000;

const FRESH_CACHE_CONTROL = 'public, s-maxage=7200, stale-while-revalidate=600';
const STALE_CACHE_CONTROL = 'public, s-maxage=60';
const USER_AGENT = 'OrbitView-SatTracker/4.0';

// CelesTrak group endpoints
const CELESTRAK_GROUPS: Record<string, string> = {
    stations: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
    starlink: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
    cubesat: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=cubesat&FORMAT=tle',
    active: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
    oneweb: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=tle',
    iridium: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-NEXT&FORMAT=tle',
    // ~100 brightest objects, used for the "tonight" list
    visual: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle',
};

const MULTI_GROUPS: Record<string, string[]> = {
    all: ['stations', 'starlink', 'cubesat'],
};

const DEFAULT_GROUP = 'default';

const EMBEDDED_TLE = `ISS (ZARYA)
1 25544U 98067A   24355.50000000  .00020000  00000-0  36000-3 0  9999
2 25544  51.6400 200.0000 0007000  90.0000 270.0000 15.50000000400000
TIANHE (CSS)
1 48274U 21035A   24355.50000000  .00015000  00000-0  25000-3 0  9999
2 48274  41.4700 180.0000 0005000 120.0000 240.0000 15.60000000100000
STARLINK-1007
1 44713U 19074A   24355.50000000  .00010000  00000-0  70000-4 0  9999
2 44713  53.0000 150.0000 0001500  80.0000 280.0000 15.06000000200000
HUBBLE SPACE TELESCOPE
1 20580U 90037B   24355.50000000  .00002000  00000-0  10000-4 0  9999
2 20580  28.4700 100.0000 0002800  50.0000 310.0000 15.09000000500000`;

type GroupResult =
    | { ok: true; data: string; source: string; stale: boolean; cacheHit: boolean; timestamp: number }
    | { ok: false; reason: string };

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const requested = searchParams.get('group');
    const group = requested === null || requested === '' ? DEFAULT_GROUP : requested;

    if (Object.hasOwn(CELESTRAK_GROUPS, group)) {
        return respondForGroup(group, await getCelesTrakGroup(group));
    }

    if (Object.hasOwn(MULTI_GROUPS, group)) {
        return fetchMultipleGroups(group, MULTI_GROUPS[group]);
    }

    if (group === DEFAULT_GROUP) {
        return fetchDefaultCatalog();
    }

    return NextResponse.json(
        {
            error: 'Unknown group',
            group,
            allowed: [...Object.keys(CELESTRAK_GROUPS), ...Object.keys(MULTI_GROUPS), DEFAULT_GROUP],
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function freshEntry(entry: CacheEntry | undefined, now: number): CacheEntry | null {
    return entry && now - entry.timestamp < CACHE_TTL_MS ? entry : null;
}

function recentlyFailed(group: string, now: number): boolean {
    const failedAt = failureCache.get(group);
    return failedAt !== undefined && now - failedAt < NEGATIVE_CACHE_TTL_MS;
}

function looksLikeTLE(text: string): boolean {
    return /(^|\r?\n)1 \d/.test(text) && /(^|\r?\n)2 \d/.test(text);
}

function errorMessage(error: unknown): string {
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    return String(error);
}

function textResponse(body: string, headers: Record<string, string>, status = 200): NextResponse {
    return new NextResponse(body, {
        status,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', ...headers },
    });
}

function respondForGroup(group: string, result: GroupResult): NextResponse {
    if (!result.ok) {
        return NextResponse.json(
            { error: 'Upstream TLE source unavailable', group, reason: result.reason },
            {
                status: result.reason === 'negative-cache' ? 503 : 502,
                headers: {
                    'Cache-Control': 'no-store',
                    'Retry-After': String(Math.ceil(NEGATIVE_CACHE_TTL_MS / 1000)),
                    'X-Group': group,
                },
            },
        );
    }

    const headers: Record<string, string> = {
        'X-Source': result.source,
        'X-Group': group,
        'X-Fetched-At': new Date(result.timestamp).toISOString(),
        'X-Cache-Status': result.cacheHit ? 'HIT_SERVER' : 'MISS',
        'Cache-Control': result.stale ? STALE_CACHE_CONTROL : FRESH_CACHE_CONTROL,
    };
    if (result.stale) headers['X-Stale'] = '1';
    return textResponse(result.data, headers);
}

/**
 * Get one CelesTrak group: fresh cache -> upstream (with timeout) -> stale cache of
 * the same group. Failures are negatively cached so CelesTrak isn't hammered.
 */
async function getCelesTrakGroup(group: string): Promise<GroupResult> {
    const now = Date.now();
    const cached = serverCache.get(group);

    const fresh = freshEntry(cached, now);
    if (fresh) {
        devLog(`[TLE HUB] Cache HIT for group: ${group}`);
        return { ok: true, data: fresh.data, source: fresh.source, stale: false, cacheHit: true, timestamp: fresh.timestamp };
    }

    let reason = 'negative-cache';
    if (!recentlyFailed(group, now)) {
        try {
            devLog(`[TLE HUB] Fetching CelesTrak group: ${group}`);
            const response = await fetch(CELESTRAK_GROUPS[group], {
                headers: { 'User-Agent': USER_AGENT },
                cache: 'no-store',
                signal: AbortSignal.timeout(CELESTRAK_TIMEOUT_MS),
            });

            if (response.ok) {
                const text = await response.text();
                if (looksLikeTLE(text)) {
                    const minified = minifyTLE(text);
                    const source = `celestrak-${group}`;
                    serverCache.set(group, { data: minified, timestamp: now, source });
                    failureCache.delete(group);
                    devLog(`[TLE HUB] CelesTrak ${group} OK, ${text.length} -> ${minified.length} chars`);
                    return { ok: true, data: minified, source, stale: false, cacheHit: false, timestamp: now };
                }
                reason = 'invalid-payload';
            } else {
                reason = `http-${response.status}`;
            }
        } catch (error) {
            reason = errorMessage(error);
        }
        console.warn(`[TLE HUB] CelesTrak ${group} failed: ${reason}`);
        failureCache.set(group, now);
    }

    if (cached) {
        return { ok: true, data: cached.data, source: cached.source, stale: true, cacheHit: true, timestamp: cached.timestamp };
    }
    return { ok: false, reason };
}

/**
 * Fetch multiple groups in parallel and merge the ones that succeeded.
 */
async function fetchMultipleGroups(name: string, groups: string[]): Promise<NextResponse> {
    const results = await Promise.all(groups.map(g => getCelesTrakGroup(g)));

    const okGroups: string[] = [];
    const failedGroups: string[] = [];
    const parts: string[] = [];
    let stale = false;
    let oldest = Date.now();

    results.forEach((result, i) => {
        if (result.ok) {
            okGroups.push(groups[i]);
            parts.push(result.data);
            stale = stale || result.stale;
            oldest = Math.min(oldest, result.timestamp);
        } else {
            failedGroups.push(groups[i]);
        }
    });

    if (parts.length === 0) {
        return NextResponse.json(
            { error: 'Upstream TLE source unavailable', group: name, failedGroups },
            { status: 502, headers: { 'Cache-Control': 'no-store', 'X-Group': name } },
        );
    }

    const partial = failedGroups.length > 0;
    const headers: Record<string, string> = {
        'X-Source': 'celestrak-multi',
        'X-Group': name,
        'X-Groups': okGroups.join(','),
        'X-Fetched-At': new Date(oldest).toISOString(),
        'Cache-Control': stale || partial ? STALE_CACHE_CONTROL : FRESH_CACHE_CONTROL,
    };
    if (stale) headers['X-Stale'] = '1';
    if (partial) {
        headers['X-Partial'] = '1';
        headers['X-Groups-Failed'] = failedGroups.join(',');
    }
    return textResponse(parts.join('\n'), headers);
}

/**
 * Default catalog: Space-Track (full) -> CelesTrak `active` -> stale default -> embedded.
 */
async function fetchDefaultCatalog(): Promise<NextResponse> {
    const now = Date.now();
    const cached = serverCache.get(DEFAULT_GROUP);

    const fresh = freshEntry(cached, now);
    if (fresh) {
        return respondForGroup(DEFAULT_GROUP, {
            ok: true, data: fresh.data, source: fresh.source, stale: false, cacheHit: true, timestamp: fresh.timestamp,
        });
    }

    if (!recentlyFailed(DEFAULT_GROUP, now)) {
        const text = await fetchSpaceTrack();
        if (text) {
            const minified = minifyTLE(text);
            serverCache.set(DEFAULT_GROUP, { data: minified, timestamp: now, source: 'space-track' });
            failureCache.delete(DEFAULT_GROUP);
            return respondForGroup(DEFAULT_GROUP, {
                ok: true, data: minified, source: 'space-track', stale: false, cacheHit: false, timestamp: now,
            });
        }
        failureCache.set(DEFAULT_GROUP, now);
    }

    // Documented fallback for the default catalog: CelesTrak active (cached under `active`).
    const active = await getCelesTrakGroup('active');
    if (active.ok) {
        const response = respondForGroup(DEFAULT_GROUP, active);
        response.headers.set('X-Fallback', '1');
        if (!active.stale) response.headers.set('Cache-Control', 'public, s-maxage=600');
        return response;
    }

    if (cached) {
        return respondForGroup(DEFAULT_GROUP, {
            ok: true, data: cached.data, source: cached.source, stale: true, cacheHit: true, timestamp: cached.timestamp,
        });
    }

    console.warn('[TLE HUB] All sources failed, returning embedded fallback');
    return textResponse(EMBEDDED_TLE, {
        'X-Source': 'embedded',
        'X-Stale': '1',
        'X-Group': DEFAULT_GROUP,
        'Cache-Control': 'no-store',
    });
}

function extractCookies(response: Response): string {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const raw = typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie()
        : (headers.get('set-cookie') ?? '').split(/,(?=\s*[^;,=\s]+=)/);
    return raw
        .map(c => c.split(';')[0].trim())
        .filter(c => c.length > 0)
        .join('; ');
}

/**
 * Space-Track full GP catalog (on-orbit objects, newest epochs). Returns null on failure.
 */
async function fetchSpaceTrack(): Promise<string | null> {
    const user = process.env.SPACETRACK_USER;
    const pass = process.env.SPACETRACK_PASS;
    if (!user || !pass) return null;

    let cookie = '';
    try {
        devLog('[TLE HUB] Authenticating with Space-Track.org...');
        const authResponse = await fetch('https://www.space-track.org/ajaxauth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ identity: user, password: pass }).toString(),
            cache: 'no-store',
            signal: AbortSignal.timeout(SPACETRACK_TIMEOUT_MS),
        });
        cookie = extractCookies(authResponse);
        if (!authResponse.ok || !cookie) {
            console.warn(`[TLE HUB] Space-Track login failed (HTTP ${authResponse.status})`);
            return null;
        }

        // All on-orbit objects with a recent epoch, newest NORAD IDs first, no row limit.
        const queryUrl = 'https://www.space-track.org/basicspacedata/query/class/gp'
            + '/decay_date/null-val/epoch/%3Enow-30'
            + '/orderby/norad_cat_id%20desc/format/3le';
        const dataResponse = await fetch(queryUrl, {
            headers: { Cookie: cookie },
            cache: 'no-store',
            signal: AbortSignal.timeout(SPACETRACK_TIMEOUT_MS),
        });

        if (!dataResponse.ok) {
            console.warn(`[TLE HUB] Space-Track query failed (HTTP ${dataResponse.status})`);
            return null;
        }
        const text = await dataResponse.text();
        if (!looksLikeTLE(text)) {
            console.warn('[TLE HUB] Space-Track returned an invalid payload');
            return null;
        }
        devLog(`[TLE HUB] Space-Track OK, ${text.length} chars`);
        return text;
    } catch (error) {
        console.warn(`[TLE HUB] Space-Track error: ${errorMessage(error)}`);
        return null;
    } finally {
        if (cookie) {
            // Best-effort logout; never let it affect the response.
            fetch('https://www.space-track.org/ajaxauth/logout', {
                headers: { Cookie: cookie },
                cache: 'no-store',
                signal: AbortSignal.timeout(SPACETRACK_LOGOUT_TIMEOUT_MS),
            }).catch(() => undefined);
        }
    }
}

/**
 * Minify TLE payload: trim, drop blank/garbage lines, normalize to 3-line format.
 */
function minifyTLE(rawTLE: string): string {
    const lines = rawTLE.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const cleaned: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 3-line pattern
        if (i + 2 < lines.length && lines[i + 1].startsWith('1 ') && lines[i + 2].startsWith('2 ')) {
            cleaned.push(line.startsWith('0 ') ? line.substring(2).trim() : line);
            cleaned.push(lines[i + 1]);
            cleaned.push(lines[i + 2]);
            i += 2;
            continue;
        }

        // 2-line pattern
        if (i + 1 < lines.length && line.startsWith('1 ') && lines[i + 1].startsWith('2 ')) {
            const id = line.substring(2, 7).trim();
            cleaned.push(`SAT ${id}`);
            cleaned.push(line);
            cleaned.push(lines[i + 1]);
            i += 1;
            continue;
        }
    }

    return cleaned.join('\n');
}
