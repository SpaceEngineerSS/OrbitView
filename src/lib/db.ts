/**
 * Native IndexedDB Wrapper for OrbitView TLE Caching
 * 
 * @description Zero-dependency IndexedDB implementation for client-side TLE storage.
 * Provides unlimited storage capacity (vs localStorage's 5MB limit).
 * 
 * @architecture
 * - Database: OrbitViewDB
 * - Object Store: tle_store (key-value pairs)
 * - Primary Key: 'active_satellites'
 * 
 * @error_handling
 * - Graceful degradation if IndexedDB unavailable
 * - All operations return Promise for async/await usage
 */

const DB_NAME = 'OrbitViewDB';
const DB_VERSION = 1;
const STORE_NAME = 'tle_store';
const CACHE_KEY = 'orbitview_global_v10';

export interface TLECacheEntry {
    timestamp: number;
    raw: string;
}

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
 * @throws Error if IndexedDB is not available
 */
export function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!isIndexedDBAvailable()) {
            reject(new Error('IndexedDB not available'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('[DB] Failed to open IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create object store if it doesn't exist
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
                console.log('[DB] Created object store:', STORE_NAME);
            }
        };
    });
}

/**
 * Retrieves cached TLE data from IndexedDB
 * 
 * @returns Promise<TLECacheEntry | null> - Cached entry or null if not found
 */
export async function getTLE(): Promise<TLECacheEntry | null> {
    if (!isIndexedDBAvailable()) {
        console.warn('[DB] IndexedDB not available, skipping cache read');
        return null;
    }

    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(CACHE_KEY);

            request.onerror = () => {
                console.error('[DB] Failed to get TLE:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                const result = request.result as TLECacheEntry | undefined;
                resolve(result || null);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('[DB] getTLE error:', error);
        return null;
    }
}

/**
 * Stores TLE data in IndexedDB cache
 * 
 * @param raw - Raw TLE string data
 * @param timestamp - Unix timestamp of when data was fetched (defaults to now)
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function putTLE(raw: string, timestamp?: number): Promise<boolean> {
    if (!isIndexedDBAvailable()) {
        console.warn('[DB] IndexedDB not available, skipping cache write');
        return false;
    }

    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const entry: TLECacheEntry = {
                timestamp: timestamp || Date.now(),
                raw
            };

            const request = store.put(entry, CACHE_KEY);

            request.onerror = () => {
                console.error('[DB] Failed to put TLE:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                console.log('[DB] TLE cache updated successfully');
                resolve(true);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('[DB] putTLE error:', error);
        return false;
    }
}

/**
 * Clears all cached TLE data
 * Useful for forcing a fresh fetch
 * 
 * @returns Promise<boolean> - true if successful
 */
export async function clearTLECache(): Promise<boolean> {
    if (!isIndexedDBAvailable()) {
        return false;
    }

    try {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(CACHE_KEY);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);

            transaction.oncomplete = () => db.close();
        });
    } catch (error) {
        console.error('[DB] clearTLECache error:', error);
        return false;
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
