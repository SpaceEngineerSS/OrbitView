import { NextResponse } from 'next/server';

// Server-side In-Memory Cache
let serverCache: {
    data: string;
    timestamp: number;
} | null = null;

const CACHE_TTL = 7200 * 1000; // 2 hours

export async function GET() {
    const now = Date.now();

    // 1. Check Server-side In-Memory Cache
    if (serverCache && (now - serverCache.timestamp) < CACHE_TTL) {
        console.log('[TLE HUB] Serving from server-side in-memory cache');
        return new NextResponse(serverCache.data, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
                'X-Cache-Status': 'HIT_SERVER',
                'Cache-Control': 'public, s-maxage=7200'
            }
        });
    }

    const SPACETRACK_USER = process.env.SPACETRACK_USER;
    const SPACETRACK_PASS = process.env.SPACETRACK_PASS;

    // 2. Try Space-Track.org (Official Source) if credentials exist
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

                // Fetch Full Satellite Catalog (Including Debris/Rocket Bodies for completeness)
                const queryUrl = 'https://www.space-track.org/basicspacedata/query/class/gp/orderby/NORAD_CAT_ID asc/limit/20000/format/3le';
                const dataResponse = await fetch(queryUrl, {
                    headers: { 'Cookie': cookie || '' }
                });

                if (dataResponse.ok) {
                    const text = await dataResponse.text();

                    // Verify we actually got TLE data and not an empty response
                    if (text.length > 1000) {
                        console.log(`[TLE HUB] Space-Track Success, received ${text.length} chars (Full Catalog)`);
                        serverCache = { data: text, timestamp: now };
                        return new NextResponse(text, {
                            status: 200,
                            headers: {
                                'Content-Type': 'text/plain',
                                'X-Source': 'Space-Track-Full',
                                'Cache-Control': 'public, s-maxage=7200'
                            }
                        });
                    }
                    console.warn('[TLE HUB] Space-Track returned empty or too short data');
                }
            }
            console.warn('[TLE HUB] Space-Track attempt failed, falling back...');
        } catch (error) {
            console.error('[TLE HUB] Space-Track error:', error);
        }
    }

    // 3. Fallback to Mirrors (CelesTrak & AMSAT)
    const MIRROR_URLS = [
        'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
        'https://www.amsat.org/tle/current/nasabare.txt', // AMSAT high-reliability mirror
        'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
    ];

    for (const url of MIRROR_URLS) {
        try {
            console.log(`[TLE HUB] Trying Mirror: ${url}`);
            const response = await fetch(url, {
                headers: { 'User-Agent': 'OrbitView-SatTracker/1.0 (Professional-Caching)' },
                next: { revalidate: 7200 }
            });

            if (response.ok) {
                const text = await response.text();
                // Basic validation: TLE files should contain lines starting with 1 or 2
                if (text.includes('\n1 ') || text.includes('\r\n1 ')) {
                    console.log(`[TLE HUB] Mirror Success from ${url}, length: ${text.length}`);
                    serverCache = { data: text, timestamp: now };
                    return new NextResponse(text, {
                        status: 200,
                        headers: {
                            'Content-Type': 'text/plain',
                            'X-Source': url.includes('amsat') ? 'AMSAT-Mirror' : 'CelesTrak',
                            'Cache-Control': 'public, s-maxage=7200'
                        }
                    });
                }
            }
        } catch (error) {
            console.error(`[TLE HUB] Error fetching ${url}:`, error);
        }
    }

    // 4. Final Fallback: Embedded Data (Top ~100 Satellites)
    console.log('[TLE HUB] All real-time sources failed, returning expanded embedded fallback');
    const fallbackTLE = `ISS (ZARYA)
1 25544U 98067A   24355.50000000  .00020000  00000-0  36000-3 0  9999
2 25544  51.6400 200.0000 0007000  90.0000 270.0000 15.50000000400000
STARLINK-1007
1 44713U 19074A   24355.50000000  .00010000  00000-0  70000-4 0  9999
2 44713  53.0000 150.0000 0001500  80.0000 280.0000 15.06000000200000
HUBBLE SPACE TELESCOPE
1 20580U 90037B   24355.50000000  .00002000  00000-0  10000-4 0  9999
2 20580  28.4700 100.0000 0002800  50.0000 310.0000 15.09000000500000
TIANHE (CSS)
1 48274U 21035A   24355.50000000  .00015000  00000-0  25000-3 0  9999
2 48274  41.4700 180.0000 0005000 120.0000 240.0000 15.60000000100000
GPS BIIR-2
1 24876U 97035A   24355.50000000  .00000100  00000-0  10000-6 0  9999
2 24876  55.5000  60.0000 0050000 200.0000 160.0000  2.00570000300000
GPS BIIR-3
1 24877U 97036A   24355.50000000  .00000100  00000-0  10000-6 0  9999
2 24877  55.5000  70.0000 0050000 210.0000 150.0000  2.00570000300000
IRIDIUM 100
1 42737U 17036A   24355.50000000  .00000200  00000-0  15000-4 0  9999
2 42737  86.4000  75.0000 0001500  45.0000 315.0000 14.34000000200000
ONEWEB-0010
1 44057U 19010A   24355.50000000  .00000150  00000-0  12000-4 0  9999
2 44057  87.4100  40.0000 0002500 110.0000 250.0000 13.15000000300000
GALILEO 1 (GSAT0101)
1 37846U 11060A   24355.50000000  .00000050  00000-0  10000-6 0  9999
2 37846  56.0000 120.0000 0001200 200.0000 160.0000  1.70470000200000
GLONASS-K (COSMOS 2471)
1 37372U 11009A   24355.50000000  .00000070  00000-0  10000-6 0  9999
2 37372  64.8400  55.0000 0001500 150.0000 210.0000  2.13100000250000
NOAA 19
1 33591U 09005A   24355.50000000  .00000200  00000-0  15000-4 0  9999
2 33591  99.1900  80.0000 0014000 300.0000  60.0000 14.12000000400000`;

    return new NextResponse(fallbackTLE, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain',
            'X-Source': 'Embedded-Fallback'
        }
    });
}
