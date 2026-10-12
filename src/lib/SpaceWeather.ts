/**
 * Space Weather Service
 * 
 * Fetches real-time space weather data for accurate orbital decay predictions.
 * Solar activity significantly affects atmospheric density and satellite drag.
 * 
 * @module SpaceWeather
 * 
 * Data Sources:
 * - NOAA Space Weather Prediction Center (SWPC)
 * - F10.7 Solar Radio Flux (10.7 cm wavelength)
 * - Kp Geomagnetic Index
 * 
 * References:
 * -----------
 * [1] Bowman, B.R. et al. (2008). "A New Empirical Thermospheric Density Model JB2008"
 *     AIAA 2008-6438. DOI: 10.2514/6.2008-6438
 * 
 * [2] NOAA SWPC: https://www.swpc.noaa.gov/products
 */

export type SpaceWeatherSource = 'live' | 'fallback';

export interface SpaceWeatherData {
    f107: number;           // 10.7cm solar radio flux (SFU)
    f107Average: number;    // 81-day trailing average F10.7
    kpIndex: number;        // Planetary K-index (0-9)
    apIndex: number;        // Ap index estimated from Kp
    timestamp: Date;
    solarWindSpeed?: number; // km/s
    solarWindDensity?: number; // p/cm³
    condition: 'quiet' | 'moderate' | 'active' | 'storm';
    /** 'live' only if both F10.7 and Kp came from NOAA; otherwise defaults were used */
    source: SpaceWeatherSource;
    /** Convenience flag: true when any value is a default rather than live data */
    isFallback: boolean;
    /** Per-field liveness, so the UI can show "no data" selectively */
    f107IsLive: boolean;
    kpIsLive: boolean;
}

// API endpoints
const NOAA_F107_URL = 'https://services.swpc.noaa.gov/json/f107_cm_flux.json';
const NOAA_KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';

const DEFAULT_F107 = 150;
const DEFAULT_KP = 2;
const F107_AVERAGE_DAYS = 81;
const DAY_MS = 86_400_000;
const FETCH_TIMEOUT_MS = 10_000;
const SESSION_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const FALLBACK_RETRY_MS = 60 * 1000; // retry sooner after a failure

const isDev = process.env.NODE_ENV !== 'production';

let sessionCache: { data: SpaceWeatherData; expiresAt: number } | null = null;
let inFlight: Promise<SpaceWeatherData> | null = null;

function toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : null;
}

async function fetchJson(url: string): Promise<unknown> {
    const init: RequestInit = { cache: 'no-store' };
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        init.signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    }
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.json();
}

/**
 * Parse NOAA F10.7 JSON (array of { time_tag, flux, ... }).
 * Returns the latest daily flux and the trailing 81-day average of daily values,
 * ignoring missing/invalid entries. Returns null if there is no valid data.
 */
export function parseF107(data: unknown): { f107: number; f107Average: number } | null {
    if (!Array.isArray(data)) return null;

    // Collapse to one value per UTC day (mean of that day's valid observations)
    const days = new Map<string, { sum: number; n: number }>();
    for (const row of data) {
        if (!row || typeof row !== 'object') continue;
        const rec = row as Record<string, unknown>;
        const flux = toNumber(rec.flux);
        const t = Date.parse(String(rec.time_tag ?? ''));
        if (flux === null || flux <= 0 || !Number.isFinite(t)) continue;
        const day = new Date(t).toISOString().slice(0, 10);
        const entry = days.get(day) ?? { sum: 0, n: 0 };
        entry.sum += flux;
        entry.n += 1;
        days.set(day, entry);
    }
    if (days.size === 0) return null;

    const daily = Array.from(days.entries())
        .map(([day, e]) => ({ dayMs: Date.parse(`${day}T00:00:00Z`), value: e.sum / e.n }))
        .sort((a, b) => a.dayMs - b.dayMs);

    const latest = daily[daily.length - 1];
    const windowStart = latest.dayMs - (F107_AVERAGE_DAYS - 1) * DAY_MS;
    const inWindow = daily.filter(d => d.dayMs >= windowStart);
    const f107Average = inWindow.reduce((sum, d) => sum + d.value, 0) / inWindow.length;

    return { f107: latest.value, f107Average };
}

/**
 * Parse NOAA planetary K-index JSON. Supports both:
 * - array of arrays with a header row: [["time_tag","Kp",...], ["2024-01-01 00:00:00","2.33",...]]
 * - array of objects: [{ time_tag: "...", Kp: 2.33, ... }]
 * Returns the most recent valid Kp, or null.
 */
export function parseKp(data: unknown): number | null {
    if (!Array.isArray(data) || data.length === 0) return null;

    type Row = { time: number; kp: number | null; order: number };
    let rows: Row[];

    if (Array.isArray(data[0])) {
        const header = (data[0] as unknown[]).map(h => String(h).trim().toLowerCase());
        const hasHeader = header.includes('kp') || header.includes('time_tag');
        const kpIdx = hasHeader ? header.indexOf('kp') : 1;
        const timeIdx = hasHeader ? header.indexOf('time_tag') : 0;
        if (kpIdx < 0) return null;
        rows = data.slice(hasHeader ? 1 : 0).map((row: unknown, order: number) => {
            const r = Array.isArray(row) ? row : [];
            return {
                time: timeIdx >= 0 ? Date.parse(String(r[timeIdx] ?? '')) : NaN,
                kp: toNumber(r[kpIdx]),
                order,
            };
        });
    } else {
        rows = data.map((row: unknown, order: number) => {
            const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
            const kpValue = r.Kp ?? r.kp ?? r.kp_index ?? r.estimated_kp;
            return { time: Date.parse(String(r.time_tag ?? '')), kp: toNumber(kpValue), order };
        });
    }

    const valid = rows.filter((r): r is { time: number; kp: number; order: number } =>
        r.kp !== null && r.kp >= 0 && r.kp <= 9);
    if (valid.length === 0) return null;

    valid.sort((a, b) => {
        const ta = Number.isFinite(a.time) ? a.time : -Infinity;
        const tb = Number.isFinite(b.time) ? b.time : -Infinity;
        return ta !== tb ? ta - tb : a.order - b.order;
    });
    return valid[valid.length - 1].kp;
}

/**
 * Fetch current F10.7 solar flux (null on failure)
 */
async function fetchF107(): Promise<{ f107: number; f107Average: number } | null> {
    try {
        return parseF107(await fetchJson(NOAA_F107_URL));
    } catch (error) {
        if (isDev) console.warn('[SpaceWeather] F10.7 fetch failed:', error);
        return null;
    }
}

/**
 * Fetch current Kp index (null on failure)
 */
async function fetchKpIndex(): Promise<number | null> {
    try {
        return parseKp(await fetchJson(NOAA_KP_URL));
    } catch (error) {
        if (isDev) console.warn('[SpaceWeather] Kp fetch failed:', error);
        return null;
    }
}

/**
 * Convert Kp to Ap index (standard table)
 */
function kpToAp(kp: number): number {
    const kpValues = [0, 0.33, 0.67, 1, 1.33, 1.67, 2, 2.33, 2.67, 3, 3.33, 3.67, 4, 4.33, 4.67, 5, 5.33, 5.67, 6, 6.33, 6.67, 7, 7.33, 7.67, 8, 8.33, 8.67, 9];
    const apValues = [0, 2, 3, 4, 5, 6, 7, 9, 12, 15, 18, 22, 27, 32, 39, 48, 56, 67, 80, 94, 111, 132, 154, 179, 207, 236, 300, 400];

    // Largest table Kp not above the value (small tolerance for 2.333 vs 2.33 etc.)
    let idx = 0;
    for (let i = 0; i < kpValues.length; i++) {
        if (kpValues[i] <= kp + 0.01) idx = i;
    }

    return apValues[idx];
}

/**
 * Determine space weather condition from indices
 */
function getCondition(kp: number, f107: number): 'quiet' | 'moderate' | 'active' | 'storm' {
    if (kp >= 7 || f107 >= 200) return 'storm';
    if (kp >= 5 || f107 >= 150) return 'active';
    if (kp >= 3 || f107 >= 100) return 'moderate';
    return 'quiet';
}

/**
 * Clear the in-memory session cache (e.g. for a manual refresh or tests).
 */
export function clearSpaceWeatherCache(): void {
    sessionCache = null;
    inFlight = null;
}

async function loadSpaceWeather(): Promise<SpaceWeatherData> {
    const [f107Data, kp] = await Promise.all([fetchF107(), fetchKpIndex()]);

    const f107IsLive = f107Data !== null;
    const kpIsLive = kp !== null;
    const f107 = f107Data?.f107 ?? DEFAULT_F107;
    const f107Average = f107Data?.f107Average ?? DEFAULT_F107;
    const kpIndex = kp ?? DEFAULT_KP;
    const isFallback = !(f107IsLive && kpIsLive);

    return {
        f107,
        f107Average,
        kpIndex,
        apIndex: kpToAp(kpIndex),
        timestamp: new Date(),
        condition: getCondition(kpIndex, f107),
        source: isFallback ? 'fallback' : 'live',
        isFallback,
        f107IsLive,
        kpIsLive,
    };
}

/**
 * Fetch complete space weather data (client-side; cached in memory for 15 minutes,
 * 1 minute after a failure). Never rejects: on failure returns defaults with
 * `source: 'fallback'` / `isFallback: true`.
 */
export async function fetchSpaceWeather(options?: { forceRefresh?: boolean }): Promise<SpaceWeatherData> {
    if (!options?.forceRefresh && sessionCache && Date.now() < sessionCache.expiresAt) {
        return sessionCache.data;
    }
    if (inFlight) return inFlight;

    const request: Promise<SpaceWeatherData> = loadSpaceWeather()
        .then((data) => {
            if (inFlight === request) {
                sessionCache = {
                    data,
                    expiresAt: Date.now() + (data.isFallback ? FALLBACK_RETRY_MS : SESSION_CACHE_TTL_MS),
                };
            }
            return data;
        })
        .finally(() => {
            if (inFlight === request) inFlight = null;
        });
    inFlight = request;
    return request;
}

