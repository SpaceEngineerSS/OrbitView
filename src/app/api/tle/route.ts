import { NextRequest, NextResponse } from 'next/server';

/**
 * TLE API Route - Multi-Group Support
 * 
 * Supports fetching specific satellite groups:
 * - ?group=stations (ISS, Tiangong - Priority 1)
 * - ?group=starlink (Starlink constellation)
 * - ?group=cubesat (CubeSats including Connecta/Plan-S)
 * - ?group=active (General active satellites)
 * - ?group=all (Combined: stations + starlink + cubesat)
 * - No param (Default: Space-Track full catalog or fallback)
 */

// Server-side In-Memory Cache (per group)
const serverCache: Map<string, {
    data: string;
    timestamp: number;
}> = new Map();

const CACHE_TTL = 7200 * 1000; // 2 hours

// CelesTrak group endpoints
const CELESTRAK_GROUPS: Record<string, string> = {
    stations: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
    starlink: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
    cubesat: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=cubesat&FORMAT=tle',
    active: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
    oneweb: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=tle',
    iridium: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-NEXT&FORMAT=tle',
};

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group') || 'default';
    const now = Date.now();

    // 1. Check Server-side Cache for this group
    const cached = serverCache.get(group);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
        console.log(`[TLE HUB] Cache HIT for group: ${group}`);
        return new NextResponse(cached.data, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
                'X-Cache-Status': 'HIT_SERVER',
                'X-Group': group,
                'Cache-Control': 'public, s-maxage=7200'
            }
        });
    }

    // 2. Handle multi-group "all" request
    if (group === 'all') {
        return await fetchMultipleGroups(['stations', 'starlink', 'cubesat'], now);
    }

    // 3. Handle specific CelesTrak group
    if (group in CELESTRAK_GROUPS) {
        return await fetchCelesTrakGroup(group, now);
    }

    // 4. Default: Use Space-Track (full catalog) or fallback
    return await fetchDefaultCatalog(now);
}

/**
 * Fetch multiple groups in parallel and merge results
 */
async function fetchMultipleGroups(groups: string[], now: number): Promise<NextResponse> {
    console.log(`[TLE HUB] Fetching multiple groups: ${groups.join(', ')}`);

    const results = await Promise.allSettled(
        groups.map(async (grp) => {
            const url = CELESTRAK_GROUPS[grp];
            if (!url) return '';

            const response = await fetch(url, {
                headers: { 'User-Agent': 'OrbitView-SatTracker/1.0' }
            });

            if (response.ok) {
                return response.text();
            }
            return '';
        })
    );

    // Merge all successful results
    const allTLE = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value.length > 0)
        .map(r => r.value)
        .join('\n');

    if (allTLE.length > 100) {
        const minified = minifyTLE(allTLE);
        console.log(`[TLE HUB] Multi-group fetch success, total chars: ${allTLE.length} -> minified: ${minified.length}`);
        serverCache.set('all', { data: minified, timestamp: now });

        return new NextResponse(minified, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
                'X-Source': 'CelesTrak-Multi',
                'X-Groups': groups.join(','),
                'Cache-Control': 'public, s-maxage=7200'
            }
        });
    }

    // Fallback if multi-fetch failed
    return await fetchDefaultCatalog(now);
}

/**
 * Fetch a specific CelesTrak group
 */
async function fetchCelesTrakGroup(group: string, now: number): Promise<NextResponse> {
    const url = CELESTRAK_GROUPS[group];
    console.log(`[TLE HUB] Fetching CelesTrak group: ${group}`);

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'OrbitView-SatTracker/1.0' }
        });

        if (response.ok) {
            const text = await response.text();
            if (text.includes('\n1 ') || text.includes('\r\n1 ')) {
                const minified = minifyTLE(text);
                console.log(`[TLE HUB] CelesTrak ${group} success, ${text.length} chars -> minified: ${minified.length}`);
                serverCache.set(group, { data: minified, timestamp: now });

                return new NextResponse(minified, {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/plain',
                        'X-Source': `CelesTrak-${group}`,
                        'X-Group': group,
                        'Cache-Control': 'public, s-maxage=7200'
                    }
                });
            }
        }
    } catch (error) {
        console.error(`[TLE HUB] CelesTrak ${group} error:`, error);
    }

    // Fallback
    return await fetchDefaultCatalog(now);
}

/**
 * Default catalog fetch (Space-Track or fallback mirrors)
 */
async function fetchDefaultCatalog(now: number): Promise<NextResponse> {
    const SPACETRACK_USER = process.env.SPACETRACK_USER;
    const SPACETRACK_PASS = process.env.SPACETRACK_PASS;

    // Try Space-Track.org first
    if (SPACETRACK_USER && SPACETRACK_PASS) {
        try {
            console.log('[TLE HUB] Attempting Space-Track.org authentication...');
            const authResponse = await fetch('https://www.space-track.org/ajaxauth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `identity=${SPACETRACK_USER}&password=${SPACETRACK_PASS}`,
            });

            if (authResponse.ok) {
                const cookie = authResponse.headers.get('set-cookie');
                console.log('[TLE HUB] Space-Track Auth Success. Fetching data...');

                const queryUrl = 'https://www.space-track.org/basicspacedata/query/class/gp/orderby/NORAD_CAT_ID asc/limit/20000/format/3le';
                const dataResponse = await fetch(queryUrl, {
                    headers: { 'Cookie': cookie || '' }
                });

                if (dataResponse.ok) {
                    const text = await dataResponse.text();
                    if (text.length > 1000) {
                        const minified = minifyTLE(text);
                        console.log(`[TLE HUB] Space-Track Success, received ${text.length} chars -> minified: ${minified.length}`);
                        serverCache.set('default', { data: minified, timestamp: now });
                        return new NextResponse(minified, {
                            status: 200,
                            headers: {
                                'Content-Type': 'text/plain',
                                'X-Source': 'Space-Track-Full',
                                'Cache-Control': 'public, s-maxage=7200'
                            }
                        });
                    }
                }
            }
            console.warn('[TLE HUB] Space-Track attempt failed, falling back...');
        } catch (error) {
            console.error('[TLE HUB] Space-Track error:', error);
        }
    }

    // Fallback to CelesTrak active satellites
    try {
        const response = await fetch(CELESTRAK_GROUPS.active, {
            headers: { 'User-Agent': 'OrbitView-SatTracker/1.0' },
            next: { revalidate: 7200 }
        });

        if (response.ok) {
            const text = await response.text();
            if (text.includes('\n1 ')) {
                const minified = minifyTLE(text);
                console.log(`[TLE HUB] CelesTrak active fallback success, ${text.length} chars -> minified: ${minified.length}`);
                serverCache.set('default', { data: minified, timestamp: now });
                return new NextResponse(minified, {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/plain',
                        'X-Source': 'CelesTrak-Active',
                        'Cache-Control': 'public, s-maxage=7200'
                    }
                });
            }
        }
    } catch (error) {
        console.error('[TLE HUB] CelesTrak fallback error:', error);
    }

    // Final fallback: embedded data
    console.log('[TLE HUB] All sources failed, returning embedded fallback');
    const fallbackTLE = `ISS (ZARYA)
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

    return new NextResponse(fallbackTLE, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain',
            'X-Source': 'Embedded-Fallback'
        }
    });
}

/**
 * Minify TLE Payload prior to over-the-air cell delivery
 * Strips unused comments, whitespaces, and normalizes formatting
 */
function minifyTLE(rawTLE: string): string {
    const lines = rawTLE.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const cleaned: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 3-line pattern
        if (i + 2 < lines.length && lines[i+1].startsWith('1 ') && lines[i+2].startsWith('2 ')) {
            cleaned.push(line);
            cleaned.push(lines[i+1]);
            cleaned.push(lines[i+2]);
            i += 2;
            continue;
        }
        
        // 2-line pattern
        if (i + 1 < lines.length && line.startsWith('1 ') && lines[i+1].startsWith('2 ')) {
            const id = line.substring(2, 7).trim();
            cleaned.push(`SAT ${id}`);
            cleaned.push(line);
            cleaned.push(lines[i+1]);
            i += 1;
            continue;
        }
    }
    
    return cleaned.join('\n');
}
