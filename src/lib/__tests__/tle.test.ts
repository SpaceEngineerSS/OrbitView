import type { TLECacheEntry, TLECacheMeta } from '../db';

type TleModule = typeof import('../tle');

const ISS = `ISS (ZARYA)
1 25544U 98067A   24355.50000000  .00020000  00000-0  36000-3 0  9999
2 25544  51.6400 200.0000 0007000  90.0000 270.0000 15.50000000400000`;
const HST = `HUBBLE SPACE TELESCOPE
1 20580U 90037B   24355.50000000  .00002000  00000-0  10000-4 0  9999
2 20580  28.4700 100.0000 0002800  50.0000 310.0000 15.09000000500000`;
const SL = `STARLINK-1007
1 44713U 19074A   24355.50000000  .00010000  00000-0  70000-4 0  9999
2 44713  53.0000 150.0000 0001500  80.0000 280.0000 15.06000000200000`;

const dbMock = {
    getTLE: jest.fn<Promise<TLECacheEntry | null>, []>(),
    putTLE: jest.fn<Promise<boolean>, [string, number?, TLECacheMeta?]>(),
    isCacheStale: jest.fn((timestamp: number, maxAgeMs = 3600 * 1000) => Date.now() - timestamp > maxAgeMs),
};

function loadTle(): TleModule {
    let mod!: TleModule;
    jest.isolateModules(() => {
        jest.doMock('../db', () => dbMock);
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        mod = require('../tle');
    });
    return mod;
}

interface FakeReply { status?: number; body?: string; headers?: Record<string, string> }

function fakeResponse({ status = 200, body = '', headers = {} }: FakeReply) {
    const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
        text: async () => body,
    };
}

function routeFetch(replies: Record<string, FakeReply | Error>) {
    return jest.fn(async (url: string) => {
        const group = new URL(url, 'http://localhost').searchParams.get('group')!;
        const reply = replies[group];
        if (reply instanceof Error) throw reply;
        return fakeResponse({ headers: { 'X-Group': group, 'X-Source': `celestrak-${group}` }, ...reply });
    });
}

afterEach(() => jest.restoreAllMocks());

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    dbMock.getTLE.mockReset();
    dbMock.putTLE.mockReset();
    dbMock.putTLE.mockResolvedValue(true);
});

describe('tle catalog loading', () => {
    it('falls back to network when the IndexedDB read fails', async () => {
        dbMock.getTLE.mockRejectedValue(new Error('IDB broken'));
        global.fetch = routeFetch({ stations: { body: ISS }, active: { body: `${ISS}\n${HST}` } }) as unknown as typeof fetch;
        const { fetchActiveSatellites } = loadTle();
        const sats = await fetchActiveSatellites();
        expect(sats.map(s => s.id).sort()).toEqual(['20580', '25544']);
        expect(sats.find(s => s.id === '25544')!.category).toBe('station');
        expect(sats.find(s => s.id === '20580')!.category).toBe('active');
    });

    it('still returns downloaded data when the IndexedDB write fails', async () => {
        dbMock.getTLE.mockResolvedValue(null);
        dbMock.putTLE.mockRejectedValue(new DOMException('quota', 'QuotaExceededError'));
        global.fetch = routeFetch({ stations: { body: ISS }, active: { body: HST } }) as unknown as typeof fetch;
        const { fetchSatelliteCatalog } = loadTle();
        const result = await fetchSatelliteCatalog();
        expect(result.objects).toHaveLength(2);
        expect(result.source).toBe('network');
        expect(dbMock.putTLE).toHaveBeenCalled();
    });

    it('fetches stations and active in parallel and dedupes concurrent calls', async () => {
        dbMock.getTLE.mockResolvedValue(null);
        const fetchMock = routeFetch({ stations: { body: ISS }, active: { body: HST } });
        global.fetch = fetchMock as unknown as typeof fetch;
        const { fetchActiveSatellites } = loadTle();
        const [a, b] = await Promise.all([fetchActiveSatellites(), fetchActiveSatellites()]);
        expect(a).toHaveLength(2);
        expect(b).toHaveLength(2);
        expect(fetchMock).toHaveBeenCalledTimes(2); // one per group, shared by both callers
    });

    it('does not persist a partial refresh (one group failed)', async () => {
        dbMock.getTLE.mockResolvedValue(null);
        global.fetch = routeFetch({ stations: { body: ISS }, active: { status: 502 } }) as unknown as typeof fetch;
        const { fetchSatelliteCatalog } = loadTle();
        const result = await fetchSatelliteCatalog();
        expect(result.objects).toHaveLength(1);
        expect(result.partial).toBe(true);
        expect(dbMock.putTLE).not.toHaveBeenCalled();
    });

    it('partial background refresh never shrinks the cached catalog', async () => {
        const old = Date.now() - 2 * 3600 * 1000;
        dbMock.getTLE.mockResolvedValue({
            timestamp: old, raw: `${ISS}\n${HST}\n${SL}`, count: 3,
            categories: { '25544': 'station' }, defaultCategory: 'active',
        });
        const freshIss = ISS.replace('24355.50000000', '24360.50000000');
        global.fetch = routeFetch({ stations: { body: freshIss }, active: new Error('offline') }) as unknown as typeof fetch;
        const onUpdate = jest.fn();
        const { fetchSatelliteCatalog, getCatalogMeta } = loadTle();

        const initial = await fetchSatelliteCatalog({ onUpdate });
        expect(initial.objects).toHaveLength(3);
        expect(initial.stale).toBe(true);
        expect(initial.fetchedAt).toBe(old);
        expect(initial.objects.find(s => s.id === '25544')!.category).toBe('station');
        expect(initial.objects.find(s => s.id === '44713')!.category).toBe('active');

        await flush();
        await flush();
        expect(dbMock.putTLE).not.toHaveBeenCalled();
        expect(onUpdate).toHaveBeenCalledTimes(1);
        const [updated, meta] = onUpdate.mock.calls[0];
        expect(updated).toHaveLength(3);
        expect(updated.find((s: { id: string }) => s.id === '25544').line1).toContain('24360.5');
        expect(meta.partial).toBe(true);
        expect(getCatalogMeta()!.count).toBe(3);
    });

    it('complete background refresh is persisted and delivered via onUpdate', async () => {
        const old = Date.now() - 2 * 3600 * 1000;
        dbMock.getTLE.mockResolvedValue({ timestamp: old, raw: `${ISS}\n${HST}`, count: 2 });
        global.fetch = routeFetch({ stations: { body: ISS }, active: { body: `${HST}\n${SL}` } }) as unknown as typeof fetch;
        const onUpdate = jest.fn();
        const { fetchSatelliteCatalog } = loadTle();
        await fetchSatelliteCatalog({ onUpdate });
        await flush();
        await flush();
        expect(dbMock.putTLE).toHaveBeenCalledTimes(1);
        const meta = dbMock.putTLE.mock.calls[0][2]!;
        expect(meta.categories).toEqual({ '25544': 'station' });
        expect(meta.defaultCategory).toBe('active');
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onUpdate.mock.calls[0][0]).toHaveLength(3);
        expect(onUpdate.mock.calls[0][1].stale).toBe(false);
    });

    it('never persists stale/embedded fallback data', async () => {
        dbMock.getTLE.mockResolvedValue(null);
        global.fetch = routeFetch({
            stations: { body: ISS, headers: { 'X-Group': 'stations', 'X-Source': 'celestrak-stations', 'X-Stale': '1' } },
            active: { body: HST },
        }) as unknown as typeof fetch;
        const { fetchSatelliteCatalog } = loadTle();
        const result = await fetchSatelliteCatalog();
        expect(result.objects).toHaveLength(2);
        expect(result.stale).toBe(true);
        expect(dbMock.putTLE).not.toHaveBeenCalled();
    });

    it('rejects a response labelled with a different group', async () => {
        dbMock.getTLE.mockResolvedValue(null);
        global.fetch = routeFetch({
            stations: { body: HST, headers: { 'X-Group': 'default', 'X-Source': 'embedded' } },
            active: { body: HST },
        }) as unknown as typeof fetch;
        const { fetchSatelliteCatalog } = loadTle();
        const result = await fetchSatelliteCatalog();
        expect(result.objects).toHaveLength(1);
        expect(result.objects[0].category).toBe('active');
    });

    it('returns an empty catalog with source "none" when everything fails', async () => {
        dbMock.getTLE.mockResolvedValue(null);
        global.fetch = routeFetch({ stations: new Error('x'), active: new Error('y') }) as unknown as typeof fetch;
        const { fetchSatelliteCatalog, fetchActiveSatellites } = loadTle();
        const result = await fetchSatelliteCatalog();
        expect(result.objects).toEqual([]);
        expect(result.source).toBe('none');
        expect(result.fetchedAt).toBeNull();
        await expect(fetchActiveSatellites()).resolves.toEqual([]);
    });
});

describe('parseTLE', () => {
    it('assigns deterministic suffixes to duplicate IDs', () => {
        const { parseTLE } = loadTle();
        const text = `${ISS}\n${ISS}\n${ISS}`;
        const first = parseTLE(text).map(s => s.id);
        const second = parseTLE(text).map(s => s.id);
        expect(first).toEqual(['25544', 'SAT-25544-2', 'SAT-25544-3']);
        expect(second).toEqual(first);
    });

    it('parses 2-line format and keeps the category', () => {
        const { parseTLE } = loadTle();
        const twoLine = HST.split('\n').slice(1).join('\n');
        const [sat] = parseTLE(twoLine, 'cubesat');
        expect(sat).toMatchObject({ id: '20580', name: 'SAT 20580', category: 'cubesat' });
    });
});
