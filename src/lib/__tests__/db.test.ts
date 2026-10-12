import { getTLE, putTLE } from '../db';

/**
 * Minimal manual IndexedDB fake: lets each test decide whether open / get / put fail.
 */
interface FakeOptions {
    openFails?: boolean;
    getFails?: boolean;
    putAborts?: boolean;
    stored?: unknown;
}

function installFakeIndexedDB(opts: FakeOptions) {
    const store = new Map<string, unknown>();
    if (opts.stored !== undefined) store.set('orbitview_global_v10', opts.stored);

    const makeTx = () => {
        const tx: Record<string, unknown> & { error: unknown } = { error: null };
        tx.objectStore = () => ({
            get: (key: string) => {
                const req: Record<string, unknown> = {};
                setTimeout(() => {
                    if (opts.getFails) {
                        req.error = new Error('read failed');
                        (req.onerror as () => void)?.();
                    } else {
                        req.result = store.get(key);
                        (req.onsuccess as () => void)?.();
                    }
                }, 0);
                return req;
            },
            put: (value: unknown, key: string) => {
                const req: Record<string, unknown> = {};
                setTimeout(() => {
                    if (opts.putAborts) {
                        tx.error = new DOMException('quota', 'QuotaExceededError');
                        (tx.onabort as () => void)?.();
                    } else {
                        store.set(key, value);
                        (req.onsuccess as () => void)?.();
                        (tx.oncomplete as () => void)?.();
                    }
                }, 0);
                return req;
            },
        });
        return tx;
    };

    const db = {
        objectStoreNames: { contains: () => true },
        transaction: () => makeTx(),
        close: jest.fn(),
    };

    Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        value: {
            open: () => {
                const req: Record<string, unknown> = {};
                setTimeout(() => {
                    if (opts.openFails) {
                        req.error = new Error('open failed');
                        (req.onerror as () => void)?.();
                    } else {
                        req.result = db;
                        (req.onsuccess as () => void)?.();
                    }
                }, 0);
                return req;
            },
        },
    });
    return { store, db };
}

afterEach(() => {
    delete (window as unknown as { indexedDB?: unknown }).indexedDB;
});

describe('db', () => {
    beforeEach(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => jest.restoreAllMocks());

    it('getTLE resolves null (does not reject) when the read request fails', async () => {
        installFakeIndexedDB({ getFails: true });
        await expect(getTLE()).resolves.toBeNull();
    });

    it('getTLE resolves null when the database cannot be opened', async () => {
        installFakeIndexedDB({ openFails: true });
        await expect(getTLE()).resolves.toBeNull();
    });

    it('getTLE ignores malformed entries', async () => {
        installFakeIndexedDB({ stored: { foo: 1 } });
        await expect(getTLE()).resolves.toBeNull();
    });

    it('putTLE resolves false (does not reject) on a quota abort', async () => {
        installFakeIndexedDB({ putAborts: true });
        await expect(putTLE('raw')).resolves.toBe(false);
    });

    it('round-trips an entry with metadata', async () => {
        const { db } = installFakeIndexedDB({});
        await expect(putTLE('raw', 123, { count: 1, groups: ['stations'] })).resolves.toBe(true);
        await expect(getTLE()).resolves.toEqual({ raw: 'raw', timestamp: 123, count: 1, groups: ['stations'] });
        expect(db.close).toHaveBeenCalled();
    });
});
