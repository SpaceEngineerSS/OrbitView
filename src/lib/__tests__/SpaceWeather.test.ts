import { parseKp, parseF107, fetchSpaceWeather, clearSpaceWeatherCache } from '../SpaceWeather';

function jsonResponse(data: unknown, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: async () => data };
}

describe('parseKp', () => {
    it('parses array-of-arrays with header row (latest by time)', () => {
        const data = [
            ['time_tag', 'Kp', 'a_running', 'station_count'],
            ['2024-05-10 00:00:00.000', '3.33', '18', '8'],
            ['2024-05-10 03:00:00.000', '8.67', '300', '8'],
        ];
        expect(parseKp(data)).toBeCloseTo(8.67);
    });

    it('parses array-of-objects format', () => {
        const data = [
            { time_tag: '2025-04-01T03:00:00', Kp: 2.67, a_running: 12, station_count: 8 },
            { time_tag: '2025-04-01T00:00:00', Kp: 1.0, a_running: 4, station_count: 8 },
        ];
        expect(parseKp(data)).toBeCloseTo(2.67);
    });

    it('skips missing values and returns null for unusable input', () => {
        expect(parseKp([{ time_tag: '2025-01-01T00:00:00', Kp: 4 }, { time_tag: '2025-01-01T03:00:00', Kp: null }])).toBe(4);
        expect(parseKp([['time_tag', 'Kp']])).toBeNull();
        expect(parseKp({})).toBeNull();
        expect(parseKp([])).toBeNull();
    });
});

describe('parseF107', () => {
    it('averages over a trailing 81-day window, ignoring missing values', () => {
        const start = Date.UTC(2024, 0, 1);
        const data = [];
        for (let d = 0; d < 100; d++) {
            const time_tag = new Date(start + d * 86_400_000).toISOString().slice(0, 19);
            // Days 0..18 are outside the window and set to 1000 to detect leakage
            data.push({ time_tag, flux: d < 19 ? 1000 : 100 + (d % 2) * 20 });
        }
        data.push({ time_tag: '2024-03-01T12:00:00', flux: null });
        data.push({ time_tag: '2024-03-02T12:00:00', flux: '' });
        const result = parseF107(data)!;
        expect(result.f107).toBe(120); // day 99 is odd
        expect(result.f107Average).toBeCloseTo(110, 0);
    });

    it('returns null when no valid values', () => {
        expect(parseF107([{ time_tag: 'x', flux: 'n/a' }])).toBeNull();
    });
});

describe('fetchSpaceWeather', () => {
    beforeEach(() => {
        clearSpaceWeatherCache();
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => jest.restoreAllMocks());

    it('marks the result as fallback when fetches fail', async () => {
        global.fetch = jest.fn().mockRejectedValue(new TypeError('offline')) as unknown as typeof fetch;
        const data = await fetchSpaceWeather();
        expect(data.source).toBe('fallback');
        expect(data.isFallback).toBe(true);
        expect(data.f107IsLive).toBe(false);
        expect(data.kpIsLive).toBe(false);
    });

    it('returns live data and caches it for the session', async () => {
        const fetchMock = jest.fn(async (url: string) => url.includes('f107')
            ? jsonResponse([{ time_tag: '2025-01-01T20:00:00', flux: 180 }])
            : jsonResponse([{ time_tag: '2025-01-01T00:00:00', Kp: 5.33 }]));
        global.fetch = fetchMock as unknown as typeof fetch;
        const data = await fetchSpaceWeather();
        expect(data.source).toBe('live');
        expect(data.isFallback).toBe(false);
        expect(data.f107).toBe(180);
        expect(data.kpIndex).toBeCloseTo(5.33);
        expect(data.apIndex).toBe(56);
        await fetchSpaceWeather();
        expect(fetchMock).toHaveBeenCalledTimes(2); // second call served from cache
    });

    it('marks partial failure (Kp HTTP error) as fallback', async () => {
        global.fetch = jest.fn(async (url: string) => url.includes('f107')
            ? jsonResponse([{ time_tag: '2025-01-01T20:00:00', flux: 180 }])
            : jsonResponse(null, 503)) as unknown as typeof fetch;
        const data = await fetchSpaceWeather();
        expect(data.source).toBe('fallback');
        expect(data.f107IsLive).toBe(true);
        expect(data.kpIsLive).toBe(false);
    });
});
