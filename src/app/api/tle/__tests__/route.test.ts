/**
 * @jest-environment ./test/jest-node-environment.js
 */
import type { NextRequest } from 'next/server';

type RouteModule = typeof import('../route');

const STATIONS_TLE = `ISS (ZARYA)
1 25544U 98067A   24355.50000000  .00020000  00000-0  36000-3 0  9999
2 25544  51.6400 200.0000 0007000  90.0000 270.0000 15.50000000400000`;

const ACTIVE_TLE = `HUBBLE SPACE TELESCOPE
1 20580U 90037B   24355.50000000  .00002000  00000-0  10000-4 0  9999
2 20580  28.4700 100.0000 0002800  50.0000 310.0000 15.09000000500000`;

function loadRoute(): RouteModule {
    let mod!: RouteModule;
    jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        mod = require('../route');
    });
    return mod;
}

function req(query: string): NextRequest {
    return new Request(`http://localhost/api/tle${query}`) as unknown as NextRequest;
}

const fetchMock = jest.fn();

beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    delete process.env.SPACETRACK_USER;
    delete process.env.SPACETRACK_PASS;
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('GET /api/tle', () => {
    it('returns 400 for an unknown group without hitting upstream', async () => {
        const { GET } = loadRoute();
        const res = await GET(req('?group=nope'));
        expect(res.status).toBe(400);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns 400 for prototype keys like __proto__ / toString', async () => {
        const { GET } = loadRoute();
        expect((await GET(req('?group=toString'))).status).toBe(400);
        expect((await GET(req('?group=__proto__'))).status).toBe(400);
    });

    it('serves a known group with matching X-Group and fresh caching', async () => {
        fetchMock.mockResolvedValue(new Response(STATIONS_TLE, { status: 200 }));
        const { GET } = loadRoute();
        const res = await GET(req('?group=stations'));
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Group')).toBe('stations');
        expect(res.headers.get('X-Stale')).toBeNull();
        expect(await res.text()).toContain('25544');
        // fetch got a timeout signal
        expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    });

    it('upstream failure for a group returns 502 JSON, never another catalog', async () => {
        fetchMock.mockImplementation(async (url: string) =>
            url.includes('GROUP=active')
                ? new Response(ACTIVE_TLE, { status: 200 })
                : new Response('Forbidden', { status: 403 }));
        const { GET } = loadRoute();
        const res = await GET(req('?group=stations'));
        expect(res.status).toBe(502);
        expect(res.headers.get('Content-Type')).toContain('application/json');
        expect(res.headers.get('Cache-Control')).toBe('no-store');
        const body = await res.json();
        expect(body.group).toBe('stations');
        // Only the requested group's URL was fetched
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toContain('GROUP=stations');
    });

    it('negatively caches a failed group (no repeated upstream hits) and returns 503', async () => {
        fetchMock.mockResolvedValue(new Response('Forbidden', { status: 403 }));
        const { GET } = loadRoute();
        expect((await GET(req('?group=starlink'))).status).toBe(502);
        const second = await GET(req('?group=starlink'));
        expect(second.status).toBe(503);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('serves stale data of the same group with X-Stale and short s-maxage', async () => {
        const nowSpy = jest.spyOn(Date, 'now');
        const t0 = 1_700_000_000_000;
        nowSpy.mockReturnValue(t0);
        fetchMock.mockResolvedValueOnce(new Response(STATIONS_TLE, { status: 200 }));
        const { GET } = loadRoute();
        expect((await GET(req('?group=stations'))).status).toBe(200);

        // 3h later the cache is expired and upstream fails
        nowSpy.mockReturnValue(t0 + 3 * 3600 * 1000);
        fetchMock.mockResolvedValueOnce(new Response('err', { status: 500 }));
        const res = await GET(req('?group=stations'));
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Stale')).toBe('1');
        expect(res.headers.get('X-Group')).toBe('stations');
        expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60');
        expect(await res.text()).toContain('25544');
    });

    it('treats a timed-out upstream fetch as a failure', async () => {
        const timeoutSpy = jest.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(new DOMException('timed out', 'TimeoutError')), 5);
            return controller.signal;
        });
        fetchMock.mockImplementation((_url: string, init: RequestInit) =>
            new Promise((_resolve, reject) => {
                init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
            }));
        const { GET } = loadRoute();
        const res = await GET(req('?group=cubesat'));
        expect(res.status).toBe(502);
        expect(timeoutSpy).toHaveBeenCalledWith(10_000);
        expect((await res.json()).reason).toContain('TimeoutError');
    });

    it('default group falls back to embedded data marked stale and no-store', async () => {
        fetchMock.mockRejectedValue(new TypeError('network down'));
        const { GET } = loadRoute();
        const res = await GET(req(''));
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Source')).toBe('embedded');
        expect(res.headers.get('X-Stale')).toBe('1');
        expect(res.headers.get('Cache-Control')).toBe('no-store');
    });

    it('Space-Track: form-encodes credentials, queries newest-first without low limit, logs out', async () => {
        process.env.SPACETRACK_USER = 'user@example.com';
        process.env.SPACETRACK_PASS = 'p&ss=word';
        fetchMock.mockImplementation(async (url: string) => {
            if (url.endsWith('/ajaxauth/login')) {
                return new Response('', { status: 200, headers: { 'set-cookie': 'chocolatechip=abc; path=/' } });
            }
            if (url.includes('/basicspacedata/')) return new Response(`0 ${ACTIVE_TLE}`, { status: 200 });
            return new Response('', { status: 200 });
        });
        const { GET } = loadRoute();
        const res = await GET(req('?group=default'));
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Source')).toBe('space-track');

        const login = fetchMock.mock.calls.find(c => String(c[0]).endsWith('/login'))!;
        expect(login[1].body).toBe('identity=user%40example.com&password=p%26ss%3Dword');
        const query = String(fetchMock.mock.calls.find(c => String(c[0]).includes('/basicspacedata/'))![0]);
        expect(query).toContain('norad_cat_id%20desc');
        expect(query).not.toContain('/limit/');
        expect(fetchMock.mock.calls.some(c => String(c[0]).endsWith('/logout'))).toBe(true);
        expect(timeoutUsed(fetchMock)).toBe(true);
    });
});

function timeoutUsed(mock: jest.Mock): boolean {
    return mock.mock.calls.every(c => c[1]?.signal instanceof AbortSignal);
}
