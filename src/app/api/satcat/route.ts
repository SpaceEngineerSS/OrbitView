/**
 * GET /api/satcat
 *
 * CelesTrak's satellite catalog (owner, launch date and site, object type)
 * for every object still in orbit, as compact JSON. The CSV changes once a
 * day, so the response is cached for a day on the CDN and in memory.
 */

import { NextResponse } from 'next/server';
import { parseSatcatCsv, type SatcatPayload } from '@/lib/satcat';

const SOURCE = 'https://celestrak.org/pub/satcat.csv';
const TTL_MS = 24 * 3600_000;
const FAIL_TTL_MS = 10 * 60_000;
const TIMEOUT_MS = 20_000;

let cache: { payload: SatcatPayload; body: string } | null = null;
let failedAt = 0;

export async function GET() {
    const now = Date.now();
    if (cache && now - cache.payload.fetchedAt < TTL_MS) return respond(cache.body, false);
    if (now - failedAt < FAIL_TTL_MS) return cache ? respond(cache.body, true) : unavailable();

    try {
        const res = await fetch(SOURCE, {
            headers: { 'User-Agent': 'OrbitView/4.0 (+https://orbitview-five.vercel.app)' },
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = parseSatcatCsv(await res.text());
        if (rows.length < 1000) throw new Error('SATCAT looks truncated');
        const payload: SatcatPayload = { fetchedAt: now, rows };
        cache = { payload, body: JSON.stringify(payload) };
        return respond(cache.body, false);
    } catch (err) {
        failedAt = now;
        if (process.env.NODE_ENV !== 'production') console.warn('[satcat]', err);
        return cache ? respond(cache.body, true) : unavailable();
    }
}

function respond(body: string, stale: boolean) {
    return new NextResponse(body, {
        status: 200,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': stale ? 'public, max-age=600, s-maxage=600' : 'public, max-age=86400, s-maxage=86400',
            ...(stale ? { 'X-Stale': '1' } : {}),
        },
    });
}

function unavailable() {
    return NextResponse.json({ error: 'SATCAT unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '600' } });
}
