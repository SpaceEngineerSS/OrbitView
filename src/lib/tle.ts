import { getTLE, putTLE, isCacheStale } from './db';

export interface SatelliteData {
  id: string;
  name: string;
  line1: string;
  line2: string;
  category?: 'station' | 'starlink' | 'cubesat' | 'active';
  mass?: number;
  dimensions?: string;
  frequencies?: string[];
}

const CACHE_DURATION = 3600 * 1000; // 1 hour

/**
 * Fetches Global Satellite Catalog with Map-based Deduplication
 * 
 * Strategy: Fetch stations (priority) + active (comprehensive), merge with Map
 * This ensures ISS, Connecta, Turksat, and all active satellites are included
 */
export async function fetchActiveSatellites(): Promise<SatelliteData[]> {
  try {
    // 1. Check IndexedDB cache first
    const cached = await getTLE();

    if (cached && cached.raw) {
      const isStale = isCacheStale(cached.timestamp, CACHE_DURATION);

      if (!isStale) {
        console.log(`[TLE] Using fresh IndexedDB cache`);
        const satellites = parseTLE(cached.raw);
        logVerification(satellites);
        return satellites;
      } else {
        console.log(`[TLE] Cache stale, returning cached + background refresh`);
        refreshCacheInBackground();
        const satellites = parseTLE(cached.raw);
        logVerification(satellites);
        return satellites;
      }
    }

    // 2. No cache - fetch global catalog
    console.log('[TLE] Global katalog indiriliyor...');
    return await fetchGlobalCatalog();

  } catch (error) {
    console.error('[TLE] Fetch error:', error);
    return [];
  }
}

/**
 * Fetches and merges stations + active using Map deduplication
 */
async function fetchGlobalCatalog(): Promise<SatelliteData[]> {
  const satelliteMap = new Map<string, SatelliteData>();

  // Phase 1: Fetch stations (ISS, CSS, etc.) - Priority
  try {
    console.log('[TLE] Fetching stations group (priority)...');
    const stationsData = await fetchGroup('stations');
    const stations = parseTLE(stationsData, 'station');

    stations.forEach(sat => {
      satelliteMap.set(sat.id, sat);
    });
    console.log(`[TLE] Stations loaded: ${stations.length}`);
  } catch (error) {
    console.error('[TLE] Stations fetch failed:', error);
  }

  // Phase 2: Fetch active satellites (comprehensive list)
  try {
    console.log('[TLE] Fetching active group (comprehensive)...');
    const activeData = await fetchGroup('active');
    const active = parseTLE(activeData, 'active');

    // Map overwrites duplicates, keeping latest
    active.forEach(sat => {
      if (!satelliteMap.has(sat.id)) {
        satelliteMap.set(sat.id, sat);
      }
    });
    console.log(`[TLE] Active loaded: ${active.length}`);
  } catch (error) {
    console.error('[TLE] Active fetch failed:', error);
  }

  // Convert Map to Array
  const allSatellites = Array.from(satelliteMap.values());

  // Save merged catalog to IndexedDB
  if (allSatellites.length > 0) {
    const mergedTLE = reconstructTLE(allSatellites);
    await putTLE(mergedTLE);
    console.log(`[TLE] Saved global catalog to IndexedDB: ${allSatellites.length} satellites`);
  }

  // Verification logs
  logVerification(allSatellites);

  return allSatellites;
}

/**
 * Debug verification for critical satellites
 */
function logVerification(satellites: SatelliteData[]): void {
  const issCheck = satellites.find(s =>
    s.name.toUpperCase().includes('ZARYA') ||
    s.name.toUpperCase().includes('ISS')
  );

  const connectaCheck = satellites.filter(s =>
    s.name.toUpperCase().includes('CONNECTA') ||
    s.name.toUpperCase().includes('PLAN-S') ||
    s.name.includes('T1.1')
  );

  const turksatCheck = satellites.filter(s =>
    s.name.toUpperCase().includes('TURKSAT')
  );

  const starlinkCount = satellites.filter(s =>
    s.name.toUpperCase().includes('STARLINK')
  ).length;

  console.warn('═══════════════════════════════════════════════════════');
  console.warn(`[VERİ DENETİMİ] Toplam Uydu: ${satellites.length}`);
  console.warn(`[VERİ DENETİMİ] ISS (Zarya): ${issCheck ? `EVET ✅ (${issCheck.name})` : 'HAYIR ❌'}`);
  console.warn(`[VERİ DENETİMİ] Turksat: ${turksatCheck.length} adet ${turksatCheck.length > 0 ? '✅' : '❌'}`);
  console.warn(`[VERİ DENETİMİ] Connecta/Plan-S: ${connectaCheck.length} adet ${connectaCheck.length > 0 ? '✅' : '❌'}`);
  console.warn(`[VERİ DENETİMİ] Starlink: ${starlinkCount} adet`);
  console.warn('═══════════════════════════════════════════════════════');

  if (connectaCheck.length > 0) {
    console.log('Bulunan Connecta Uyduları:', connectaCheck.map(s => s.name));
  }
  if (turksatCheck.length > 0) {
    console.log('Bulunan Turksat Uyduları:', turksatCheck.map(s => s.name));
  }
}

/**
 * Fetch a specific group from API
 */
async function fetchGroup(group: string): Promise<string> {
  const response = await fetch(`/api/tle?group=${group}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to fetch group ${group}: ${response.status}`);
  }

  const source = response.headers.get('X-Source') || 'Unknown';
  console.log(`[TLE] Fetched ${group} from ${source}`);

  return response.text();
}

/**
 * Background cache refresh
 */
function refreshCacheInBackground(): void {
  setTimeout(async () => {
    try {
      console.log('[TLE] Background refresh started...');
      await fetchGlobalCatalog();
      console.log('[TLE] Background refresh complete');
    } catch (error) {
      console.warn('[TLE] Background refresh failed:', error);
    }
  }, 100);
}

/**
 * Parse TLE text into SatelliteData array
 */
function parseTLE(tleData: string, category?: SatelliteData['category']): SatelliteData[] {
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
      let id = line1.substring(2, 7).trim();

      if (!id || seenIds.has(id)) {
        id = `SAT-${id || i}-${Math.random().toString(36).substr(2, 3)}`;
      }
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
      let id = line1.substring(2, 7).trim();
      const name = id === "25544" ? "ISS (ZARYA)" : `SAT ${id}`;

      if (!id || seenIds.has(id)) {
        id = `SAT-${id || i}-${Math.random().toString(36).substr(2, 3)}`;
      }
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
