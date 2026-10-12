import { getTLE, putTLE, isCacheStale, TLECacheEntry } from './db';

export type SatelliteCategory = 'station' | 'starlink' | 'cubesat' | 'active';

export interface SatelliteData {
  id: string;
  name: string;
  line1: string;
  line2: string;
  category?: SatelliteCategory;
  mass?: number;
  dimensions?: string;
  frequencies?: string[];
}

/** Where the returned catalog came from */
export type CatalogSource = 'cache' | 'network' | 'none';

export interface CatalogMeta {
  /** Unix ms timestamp of when the TLE data was downloaded from upstream (null if no data) */
  fetchedAt: number | null;
  /** True if the data is older than TLE_MAX_AGE_MS or came from a stale/embedded fallback */
  stale: boolean;
  /** True if one or more catalog groups are missing */
  partial: boolean;
  source: CatalogSource;
  count: number;
}

export interface CatalogResult extends CatalogMeta {
  objects: SatelliteData[];
}

export interface FetchCatalogOptions {
  /**
   * Called when a background (stale-while-revalidate) refresh produced newer data
   * than what was returned initially.
   */
  onUpdate?: (objects: SatelliteData[], meta: CatalogMeta) => void;
}

/** Cached catalog older than this is returned immediately but refreshed in background. */
export const TLE_MAX_AGE_MS = 3600 * 1000; // 1 hour

const CATALOG_GROUPS: ReadonlyArray<{ group: string; category: SatelliteCategory }> = [
  { group: 'stations', category: 'station' }, // priority: wins on duplicate IDs
  // The server's default chain: Space-Track when configured, else CelesTrak
  // "active", else its own stale copy. Asking for "active" directly would
  // skip Space-Track and fail outright whenever CelesTrak rate-limits us.
  { group: 'default', category: 'active' },
];
const DEFAULT_CATEGORY: SatelliteCategory = 'active';
const VALID_CATEGORIES: ReadonlySet<string> = new Set<SatelliteCategory>(['station', 'starlink', 'cubesat', 'active']);

/** A refresh smaller than this fraction of the cached catalog is not persisted. */
const MIN_PERSIST_RATIO = 0.5;

const isDev = process.env.NODE_ENV !== 'production';
function devLog(...args: unknown[]): void {
  if (isDev) console.log(...args);
}
function devWarn(...args: unknown[]): void {
  if (isDev) console.warn(...args);
}

let lastMeta: CatalogMeta | null = null;
let inFlightRefresh: Promise<RefreshOutcome> | null = null;

/**
 * Metadata (data age, staleness, source) of the most recently delivered catalog.
 * Returns null before the first load completed.
 */
export function getCatalogMeta(): CatalogMeta | null {
  return lastMeta ? { ...lastMeta } : null;
}

/**
 * Fetches the global satellite catalog (backward-compatible API).
 * Never throws; returns [] if nothing could be loaded.
 */
export async function fetchActiveSatellites(options?: FetchCatalogOptions): Promise<SatelliteData[]> {
  try {
    const result = await fetchSatelliteCatalog(options);
    return result.objects;
  } catch (error) {
    devWarn('[TLE] Fetch error:', error);
    return [];
  }
}

/**
 * Fetches the global satellite catalog with metadata.
 *
 * Strategy: IndexedDB cache (stale-while-revalidate) -> network (stations + active in
 * parallel, merged by NORAD ID with stations taking priority).
 */
export async function fetchSatelliteCatalog(options: FetchCatalogOptions = {}): Promise<CatalogResult> {
  let cached: TLECacheEntry | null = null;
  try {
    cached = await getTLE();
  } catch (error) {
    devWarn('[TLE] Cache read failed, falling back to network:', error);
    cached = null;
  }

  if (cached) {
    const cachedObjects = parseCachedEntry(cached);
    if (cachedObjects.length > 0) {
      const stale = isCacheStale(cached.timestamp, TLE_MAX_AGE_MS);
      const result = deliver(cachedObjects, {
        fetchedAt: cached.timestamp,
        stale,
        partial: false,
        source: 'cache',
      });
      devLog(`[TLE] Using IndexedDB cache (${stale ? 'stale, refreshing in background' : 'fresh'})`);
      logVerification(cachedObjects);
      if (stale) startBackgroundRefresh(cached, cachedObjects, options.onUpdate);
      return result;
    }
  }

  devLog('[TLE] Downloading global catalog...');
  const outcome = await refreshCatalog(cached);

  if (outcome.objects.length === 0) {
    return deliver([], { fetchedAt: null, stale: true, partial: true, source: 'none' });
  }

  logVerification(outcome.objects);
  return deliver(outcome.objects, {
    fetchedAt: outcome.fetchedAt,
    stale: outcome.stale,
    partial: !outcome.complete,
    source: 'network',
  });
}

function deliver(objects: SatelliteData[], meta: Omit<CatalogMeta, 'count'>): CatalogResult {
  lastMeta = { ...meta, count: objects.length };
  return { ...lastMeta, objects };
}

function toMeta(result: CatalogResult): CatalogMeta {
  const { fetchedAt, stale, partial, source, count } = result;
  return { fetchedAt, stale, partial, source, count };
}

/* ------------------------------------------------------------------ */
/* Network refresh                                                     */
/* ------------------------------------------------------------------ */

interface GroupPayload {
  group: string;
  category: SatelliteCategory;
  text: string;
  stale: boolean;
  fetchedAt: number;
}

interface RefreshOutcome {
  /** All usable objects (fresh and stale groups), merged */
  objects: SatelliteData[];
  /** Objects from fresh (non-stale) groups only */
  freshObjects: SatelliteData[];
  /** All groups fetched successfully and fresh */
  complete: boolean;
  /** Any delivered group was stale/embedded */
  stale: boolean;
  fetchedAt: number | null;
  persisted: boolean;
}

/**
 * Fetch a specific group from the API. Throws on HTTP errors or a mismatched group.
 */
async function fetchGroup(group: string, category: SatelliteCategory): Promise<GroupPayload> {
  const response = await fetch(`/api/tle?group=${encodeURIComponent(group)}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to fetch group ${group}: HTTP ${response.status}`);
  }

  const servedGroup = response.headers.get('X-Group');
  if (servedGroup && servedGroup !== group) {
    throw new Error(`Group mismatch: requested ${group}, got ${servedGroup}`);
  }

  const source = (response.headers.get('X-Source') || 'unknown').toLowerCase();
  const stale = response.headers.get('X-Stale') === '1' || source.startsWith('embedded');
  const fetchedAtHeader = Date.parse(response.headers.get('X-Fetched-At') || '');
  const fetchedAt = Number.isFinite(fetchedAtHeader) ? fetchedAtHeader : Date.now();

  devLog(`[TLE] Fetched ${group} from ${source}${stale ? ' (stale)' : ''}`);
  return { group, category, text: await response.text(), stale, fetchedAt };
}

/** Shared (deduplicated) network refresh. Concurrent callers get the same promise. */
function refreshCatalog(existing: TLECacheEntry | null): Promise<RefreshOutcome> {
  if (!inFlightRefresh) {
    inFlightRefresh = runRefresh(existing).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

async function runRefresh(existing: TLECacheEntry | null): Promise<RefreshOutcome> {
  const settled = await Promise.allSettled(
    CATALOG_GROUPS.map(({ group, category }) => fetchGroup(group, category)),
  );

  const merged = new Map<string, SatelliteData>();
  const fresh = new Map<string, SatelliteData>();
  const okGroups: string[] = [];
  let anyStale = false;
  let allOk = true;
  let fetchedAt: number | null = null;

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === 'rejected') {
      allOk = false;
      devWarn(`[TLE] ${CATALOG_GROUPS[i].group} fetch failed:`, result.reason);
      continue;
    }
    const payload = result.value;
    const parsed = parseTLE(payload.text, payload.category);
    if (parsed.length === 0) {
      allOk = false;
      continue;
    }
    okGroups.push(payload.group);
    anyStale = anyStale || payload.stale;
    fetchedAt = fetchedAt === null ? payload.fetchedAt : Math.min(fetchedAt, payload.fetchedAt);
    for (const sat of parsed) {
      if (!merged.has(sat.id)) merged.set(sat.id, sat);
      if (!payload.stale && !fresh.has(sat.id)) fresh.set(sat.id, sat);
    }
    devLog(`[TLE] ${payload.group} loaded: ${parsed.length}`);
  }

  const objects = Array.from(merged.values());
  const complete = allOk && !anyStale && objects.length > 0;
  let persisted = false;

  // Only a complete, fresh catalog may replace the persisted one.
  if (complete && fetchedAt !== null) {
    const existingCount = existing ? (existing.count ?? countTLE(existing.raw)) : 0;
    if (objects.length >= existingCount * MIN_PERSIST_RATIO) {
      persisted = await persistCatalog(objects, fetchedAt, okGroups);
    } else {
      devWarn(`[TLE] Refresh returned ${objects.length} objects vs ${existingCount} cached; not persisting`);
    }
  } else if (objects.length > 0) {
    devWarn('[TLE] Partial or stale refresh; cache left untouched');
  }

  return { objects, freshObjects: Array.from(fresh.values()), complete, stale: anyStale, fetchedAt, persisted };
}

async function persistCatalog(objects: SatelliteData[], fetchedAt: number, groups: string[]): Promise<boolean> {
  const categories: Record<string, string> = {};
  for (const sat of objects) {
    if (sat.category && sat.category !== DEFAULT_CATEGORY) categories[sat.id] = sat.category;
  }
  try {
    const ok = await putTLE(reconstructTLE(objects), fetchedAt, {
      count: objects.length,
      groups,
      categories,
      defaultCategory: DEFAULT_CATEGORY,
    });
    if (ok) devLog(`[TLE] Saved global catalog to IndexedDB: ${objects.length} satellites`);
    else devWarn('[TLE] Could not persist catalog (IndexedDB unavailable or quota exceeded)');
    return ok;
  } catch (error) {
    devWarn('[TLE] Persist failed:', error);
    return false;
  }
}

/**
 * Stale-while-revalidate: refresh in background and hand newer data to `onUpdate`.
 */
function startBackgroundRefresh(
  cached: TLECacheEntry,
  cachedObjects: SatelliteData[],
  onUpdate?: FetchCatalogOptions['onUpdate'],
): void {
  refreshCatalog(cached)
    .then((outcome) => {
      if (outcome.complete && outcome.fetchedAt !== null) {
        if (outcome.fetchedAt <= cached.timestamp) return; // nothing newer
        const result = deliver(outcome.objects, {
          fetchedAt: outcome.fetchedAt,
          stale: false,
          partial: false,
          source: 'network',
        });
        onUpdate?.(result.objects, toMeta(result));
        return;
      }

      if (outcome.freshObjects.length > 0) {
        // Partial refresh: overlay the fresh TLEs on the cached full set (never shrink).
        const byId = new Map(cachedObjects.map(sat => [sat.id, sat] as const));
        for (const sat of outcome.freshObjects) {
          const prev = byId.get(sat.id);
          byId.set(sat.id, prev ? { ...prev, line1: sat.line1, line2: sat.line2, name: sat.name } : sat);
        }
        const result = deliver(Array.from(byId.values()), {
          fetchedAt: cached.timestamp, // oldest data in the set
          stale: true,
          partial: true,
          source: 'network',
        });
        onUpdate?.(result.objects, toMeta(result));
      }
    })
    .catch((error) => devWarn('[TLE] Background refresh failed:', error));
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

function parseCachedEntry(entry: TLECacheEntry): SatelliteData[] {
  const satellites = parseTLE(entry.raw);
  const defaultCategory = entry.defaultCategory && VALID_CATEGORIES.has(entry.defaultCategory)
    ? (entry.defaultCategory as SatelliteCategory)
    : undefined;
  for (const sat of satellites) {
    const stored = entry.categories?.[sat.id];
    if (stored && VALID_CATEGORIES.has(stored)) sat.category = stored as SatelliteCategory;
    else if (defaultCategory) sat.category = defaultCategory;
  }
  return satellites;
}

function countTLE(raw: string): number {
  return (raw.match(/(^|\n)1 /g) || []).length;
}

/** Deterministic unique ID: first occurrence keeps the NORAD ID, later ones get -2, -3, ... */
function uniqueId(baseId: string, seen: Set<string>): string {
  if (baseId && !seen.has(baseId)) return baseId;
  const stem = baseId || 'UNKNOWN';
  let n = 2;
  while (seen.has(`SAT-${stem}-${n}`)) n++;
  return `SAT-${stem}-${n}`;
}

/**
 * Parse TLE text (2- or 3-line format) into SatelliteData.
 * Duplicate/missing NORAD IDs get deterministic suffixes (`SAT-<id>-2`, `SAT-<id>-3`, ...).
 */
export function parseTLE(tleData: string, category?: SatelliteCategory): SatelliteData[] {
  const lines = tleData.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const satellites: SatelliteData[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 3-line format (Name/0 Line, Line 1, Line 2)
    if (i + 2 < lines.length &&
      lines[i + 1].startsWith('1 ') &&
      lines[i + 2].startsWith('2 ')) {

      let name = line;
      if (name.startsWith('0 ')) {
        name = name.substring(2).trim();
      }

      const line1 = lines[i + 1];
      const line2 = lines[i + 2];
      const id = uniqueId(line1.substring(2, 7).trim(), seenIds);
      seenIds.add(id);

      satellites.push({ id, name, line1, line2, category });
      i += 2;
      continue;
    }

    // 2-line format (Line 1, Line 2)
    if (i + 1 < lines.length &&
      line.startsWith('1 ') &&
      lines[i + 1].startsWith('2 ')) {

      const line1 = line;
      const line2 = lines[i + 1];
      const noradId = line1.substring(2, 7).trim();
      const name = noradId === '25544' ? 'ISS (ZARYA)' : `SAT ${noradId}`;
      const id = uniqueId(noradId, seenIds);
      seenIds.add(id);

      satellites.push({ id, name, line1, line2, category });
      i += 1;
      continue;
    }
  }
  return satellites;
}

/**
 * Reconstruct TLE text from SatelliteData array (for caching)
 */
function reconstructTLE(satellites: SatelliteData[]): string {
  return satellites.map(sat =>
    `${sat.name}\n${sat.line1}\n${sat.line2}`
  ).join('\n');
}

/**
 * Development-only verification log for key satellites.
 */
function logVerification(satellites: SatelliteData[]): void {
  if (!isDev) return;

  const upper = satellites.map(s => s.name.toUpperCase());
  const iss = satellites.find((_, i) => upper[i].includes('ZARYA') || upper[i].includes('ISS'));
  const connecta = satellites.filter((s, i) =>
    upper[i].includes('CONNECTA') || upper[i].includes('PLAN-S') || s.name.includes('T1.1'));
  const turksat = satellites.filter((_, i) => upper[i].includes('TURKSAT'));
  const starlinkCount = upper.filter(n => n.includes('STARLINK')).length;

  console.log(
    `[TLE] Catalog check: total=${satellites.length}, ISS=${iss ? iss.name : 'missing'}, ` +
    `Turksat=${turksat.length}, Connecta/Plan-S=${connecta.length}, Starlink=${starlinkCount}`,
  );
}
