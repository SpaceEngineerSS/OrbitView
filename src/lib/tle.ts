export interface SatelliteData {
  id: string;
  name: string;
  line1: string;
  line2: string;
  // Metadata enrichment
  mass?: number; // kg
  dimensions?: string; // e.g. "2.2 x 2.4 x 1.2 m"
  frequencies?: string[]; // e.g. ["437.500 MHz", "145.900 MHz"]
}

const CACHE_KEY = 'orbitview_tle_cache_v7';
const CACHE_DURATION = 3600 * 1000; // 1 hour in ms

export async function fetchActiveSatellites(): Promise<SatelliteData[]> {
  try {
    // 1. Check client-side cache first
    const cached = typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (cached) {
      const { timestamp, raw } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < CACHE_DURATION && raw) {
        console.log(`[TLE] Using fresh client-side cache (Age: ${Math.round(age / 1000)}s)`);
        return parseTLE(raw);
      }
    }

    console.log('[TLE] Fetching satellites via API proxy...');
    const response = await fetch('/api/tle', { cache: 'no-store' });

    const source = response.headers.get('X-Source') || 'Unknown';
    console.log(`[TLE] Response source: ${source}`);

    if (!response.ok) {
      if (cached) {
        const { raw } = JSON.parse(cached);
        return parseTLE(raw);
      }
      throw new Error(`API proxy failed: ${response.status}`);
    }

    const text = await response.text();
    const satellites = parseTLE(text);
    console.log('[TLE] Parsed satellites count:', satellites.length);

    // 2. Save COMPACTly to client-side cache (avoid LocalStorage 5MB limit)
    if (typeof window !== 'undefined' && satellites.length > 0) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          raw: text // Store raw TLE string (more compact than JSON objects)
        }));
      } catch (e) {
        console.warn('[TLE] LocalStorage full, skipping cache');
      }
    }

    return satellites;
  } catch (error) {
    console.error('[TLE] Fetch error:', error);
    return [];
  }
}

function parseTLE(tleData: string): SatelliteData[] {
  const lines = tleData.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const satellites: SatelliteData[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Priority 1: Check for 3-line format (Name/0 Line, Line 1, Line 2)
    if (i + 2 < lines.length &&
      lines[i + 1].startsWith('1 ') &&
      lines[i + 2].startsWith('2 ')) {

      let name = line;
      if (name.startsWith('0 ')) {
        name = name.substring(2).trim(); // Strip "0 " from Space-Track 3le/name lines
      }

      const line1 = lines[i + 1];
      const line2 = lines[i + 2];
      let id = line1.substring(2, 7).trim();

      if (!id || seenIds.has(id)) {
        id = `SAT-${id || i}-${Math.random().toString(36).substr(2, 3)}`;
      }
      seenIds.add(id);

      satellites.push({ id, name, line1, line2 });
      i += 2;
      continue;
    }

    // Priority 2: Check for 2-line format (Line 1, Line 2)
    if (i + 1 < lines.length &&
      line.startsWith('1 ') &&
      lines[i + 1].startsWith('2 ')) {

      const line1 = line;
      const line2 = lines[i + 1];
      let id = line1.substring(2, 7).trim();

      // Fallback name generation if Line 0 was missing
      const name = id === "25544" ? "ISS (ZARYA)" : `SAT ${id}`;

      if (!id || seenIds.has(id)) {
        id = `SAT-${id || i}-${Math.random().toString(36).substr(2, 3)}`;
      }
      seenIds.add(id);

      satellites.push({ id, name, line1, line2 });
      i += 1;
      continue;
    }
  }
  return satellites;
}
