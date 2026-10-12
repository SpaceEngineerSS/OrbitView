/**
 * Native IndexedDB Wrapper for OrbitView TLE Caching
 *
 * @description Zero-dependency IndexedDB implementation for client-side TLE storage.
 *
 * @architecture
 * - Database: OrbitViewDB
 * - Object Store: tle_store (key-value pairs)
 *
 * @error_handling
 * - Never throws: read failures resolve to `null`, write failures resolve to `false`,
 *   so callers can fall through to the network / keep downloaded data.
 */

const DB_NAME = 'OrbitViewDB';
const DB_VERSION = 1;
const STORE_NAME = 'tle_store';
const CACHE_KEY = 'orbitview_global_v10';

const isDev = process.env.NODE_ENV !== 'production';
function devWarn(...args: unknown[]): void {
    if (isDev) console.warn(...args);
}

export interface TLECacheEntry {
    /** Unix ms timestamp of when the data was downloaded */
    timestamp: number;
    /** Raw 3-line TLE text */
    raw: string;
    /** Number of objects in `raw` (absent in entries written by older versions) */
    count?: number;
    /** Groups that were successfully fetched for this entry */
    groups?: string[];
    /** Category per satellite id, for ids whose category is not `defaultCategory` */
    categories?: Record<string, string>;
    /** Category for ids not listed in `categories` */
    defaultCategory?: string;
}

/** Optional metadata stored alongside the raw TLE text */
export type TLECacheMeta = Omit<TLECacheEntry, 'timestamp' | 'raw'>;

/**
 * Check if IndexedDB is available in the current environment
 */
function isIndexedDBAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    if (typeof indexedDB === 'undefined') return false;
    return true;
}

/**
 * Opens the OrbitView IndexedDB database
 * Creates the database and object store if they don't exist
 *
 * @returns Promise<IDBDatabase> - The opened database instance
 * @throws Error if IndexedDB is not available or cannot be opened
 */
export function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!isIndexedDBAvailable()) {
            reject(new Error('IndexedDB not available'));
            return;
        }

        let request: IDBOpenDBRequest;
        try {
            request = indexedDB.open(DB_NAME, DB_VERSION);
        } catch (error) {
            reject(error);
            return;
        }

        request.onerror = () => {
            reject(request.error ?? new Error('Failed to open IndexedDB'));
        };

        request.onblocked = () => {
            reject(new Error('IndexedDB open blocked'));
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

function closeQuietly(db: IDBDatabase | null): void {
    try {
        db?.close();
    } catch {
        // ignore
    }
}

/**
 * Retrieves cached TLE data from IndexedDB
 *
 * @returns Cached entry, or null if not found / unavailable / any error occurred
 */
export async function getTLE(): Promise<TLECacheEntry | null> {
    if (!isIndexedDBAvailable()) return null;

    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        const database = db;
        const result = await new Promise<unknown>((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readonly');
            const request = transaction.objectStore(STORE_NAME).get(CACHE_KEY);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error('IndexedDB get failed'));
            transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB read aborted'));
        });

        if (
            result && typeof result === 'object' &&
            typeof (result as TLECacheEntry).raw === 'string' &&
            typeof (result as TLECacheEntry).timestamp === 'number'
        ) {
            return result as TLECacheEntry;
        }
        return null;
    } catch (error) {
        devWarn('[DB] getTLE failed:', error);
        return null;
    } finally {
        closeQuietly(db);
    }
}

/**
 * Stores TLE data in IndexedDB cache. Resolves only after the transaction commits.
 *
 * @param raw - Raw TLE string data
 * @param timestamp - Unix timestamp of when data was fetched (defaults to now)
 * @param meta - Optional metadata (count, groups, categories)
 * @returns true if committed, false on any failure (e.g. QuotaExceededError)
 */
export async function putTLE(raw: string, timestamp?: number, meta?: TLECacheMeta): Promise<boolean> {
    if (!isIndexedDBAvailable()) return false;

    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        const database = db;
        const entry: TLECacheEntry = { ...meta, timestamp: timestamp ?? Date.now(), raw };

        return await new Promise<boolean>((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const request = transaction.objectStore(STORE_NAME).put(entry, CACHE_KEY);
            request.onerror = () => reject(request.error ?? new Error('IndexedDB put failed'));
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed'));
            transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB write aborted'));
        });
    } catch (error) {
        devWarn('[DB] putTLE failed:', error);
        return false;
    } finally {
        closeQuietly(db);
    }
}

/**
 * Clears all cached TLE data
 *
 * @returns true if successful, false otherwise
 */
export async function clearTLECache(): Promise<boolean> {
    if (!isIndexedDBAvailable()) return false;

    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        const database = db;
        return await new Promise<boolean>((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            transaction.objectStore(STORE_NAME).delete(CACHE_KEY);
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB delete failed'));
            transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB delete aborted'));
        });
    } catch (error) {
        devWarn('[DB] clearTLECache failed:', error);
        return false;
    } finally {
        closeQuietly(db);
    }
}

/**
 * Checks if cached data is stale (older than maxAge)
 *
 * @param timestamp - Cache entry timestamp
 * @param maxAgeMs - Maximum age in milliseconds (default: 1 hour)
 * @returns boolean - true if cache is stale
 */
export function isCacheStale(timestamp: number, maxAgeMs: number = 3600 * 1000): boolean {
    return Date.now() - timestamp > maxAgeMs;
}
