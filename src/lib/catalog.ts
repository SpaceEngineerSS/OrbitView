/**
 * Catalog helpers: filters, search and the short "featured" list.
 */

import type { SpaceObject } from './space-objects';
import type { FilterKey } from '@/store/appStore';
import type { ObjectKindCode } from './satcat';

/**
 * GNSS by name. GLONASS satellites are catalogued as "COSMOS 2xxx (7xx)" or
 * "(7xxK)",
 * Galileo as "GSAT0xxx", second-generation NavIC as "NVS-0x".
 */
const GNSS = /\b(NAVSTAR|GPS|GLONASS|GALILEO|BEIDOU|QZS|IRNSS|NAVIC)\b|\bGSAT0\d|^COSMOS \d+ \(7\d\dK?\)|^NVS-\d/;

/**
 * Crewed stations, by the catalog number of their core module. CelesTrak's
 * "stations" group also lists docked modules, visiting vehicles and cubesats
 * released from the ISS — those are not stations.
 */
export const STATION_IDS: ReadonlySet<string> = new Set([
    '25544', // ISS (Zarya)
    '48274', // Tiangong (Tianhe)
]);

export function isStation(o: SpaceObject): boolean {
    return STATION_IDS.has(o.id);
}

/** Object kinds from SATCAT, when loaded (id → PAY / R/B / DEB / UNK). */
export type KindMap = ReadonlyMap<string, ObjectKindCode> | null | undefined;

/** Debris or rocket body: SATCAT's word when it has one, else a guess from the name. */
export function isDebris(o: SpaceObject, kinds?: KindMap): boolean {
    const k = kinds?.get(o.id);
    if (k) return k === 'DEB' || k === 'R/B';
    return o.category === 'DEBRIS';
}

export function matchesFilter(o: SpaceObject, f: FilterKey, favorites: ReadonlySet<string>, kinds?: KindMap): boolean {
    switch (f) {
        case 'all': return true;
        case 'favorites': return favorites.has(o.id);
        case 'stations': return isStation(o);
        case 'starlink': return o.name.toUpperCase().startsWith('STARLINK');
        case 'gnss': return GNSS.test(o.name.toUpperCase());
        case 'debris': return isDebris(o, kinds);
        // Regime chips hold what is left once debris is taken out, so the
        // regimes and debris together add up to the whole catalog.
        case 'leo': return o.regime === 'LEO' && !isDebris(o, kinds);
        case 'meo': return o.regime === 'MEO' && !isDebris(o, kinds);
        case 'geo': return o.regime === 'GEO' && !isDebris(o, kinds);
        case 'heo': return o.regime === 'HEO' && !isDebris(o, kinds);
    }
}

export const FILTERS: FilterKey[] = ['all', 'stations', 'starlink', 'gnss', 'leo', 'meo', 'geo', 'heo', 'debris', 'favorites'];

export function countByFilter(objects: SpaceObject[], favorites: ReadonlySet<string>, kinds?: KindMap): Record<FilterKey, number> {
    const out = Object.fromEntries(FILTERS.map((f) => [f, 0])) as Record<FilterKey, number>;
    // One pass, each name upper-cased once.
    for (const o of objects) {
        out.all++;
        if (favorites.has(o.id)) out.favorites++;
        if (isStation(o)) out.stations++;
        const name = o.name.toUpperCase();
        if (name.startsWith('STARLINK')) out.starlink++;
        if (GNSS.test(name)) out.gnss++;
        if (isDebris(o, kinds)) { out.debris++; continue; }
        switch (o.regime) {
            case 'LEO': out.leo++; break;
            case 'MEO': out.meo++; break;
            case 'GEO': out.geo++; break;
            case 'HEO': out.heo++; break;
        }
    }
    return out;
}

export interface SearchIndex {
    names: string[];   // upper-cased, aligned with objects
    objects: SpaceObject[];
}

export function buildSearchIndex(objects: SpaceObject[]): SearchIndex {
    return { names: objects.map((o) => o.name.toUpperCase()), objects };
}

export interface SearchHit {
    object: SpaceObject;
    /** Index of the match in the name, -1 if matched by NORAD id */
    at: number;
}

/**
 * Plain substring search on name and NORAD id. Prefix matches rank first,
 * then shorter names. No regex, so "ISS (ZARYA)" or "C++" are just text.
 */
export function searchCatalog(index: SearchIndex, query: string, limit = 50): SearchHit[] {
    const q = query.trim().toUpperCase();
    if (!q) return [];
    const hits: (SearchHit & { score: number })[] = [];
    for (let i = 0; i < index.objects.length; i++) {
        const o = index.objects[i];
        const at = index.names[i].indexOf(q);
        if (at >= 0) {
            hits.push({ object: o, at, score: (at === 0 ? 0 : 1000) + index.names[i].length });
        } else if (o.id.startsWith(q)) {
            hits.push({ object: o, at: -1, score: 500 + o.id.length });
        }
    }
    hits.sort((a, b) => a.score - b.score);
    return hits.slice(0, limit).map(({ object, at }) => ({ object, at }));
}

/** Objects worth a first click. Only those present in the loaded catalog are shown. */
export const FEATURED_IDS = [
    '25544', // ISS
    '48274', // Tiangong (Tianhe)
    '20580', // Hubble
    '54234', // NOAA 21
    '43013', // NOAA 20
    '60133', // GOES 19 (GOES-East since 2025)
    '39522', // Türksat 4A
    '40697', // Sentinel-2A
];

export function featured(byId: Map<string, SpaceObject>): SpaceObject[] {
    return FEATURED_IDS.map((id) => byId.get(id)).filter((o): o is SpaceObject => !!o);
}

/** Colour of an object on the globe, by orbit regime. Mirrors the CSS tokens. */
export const REGIME_COLORS: Record<string, string> = {
    station: '#f6c94c',
    LEO: '#4fb6f0',
    MEO: '#2bbfae',
    GEO: '#9d85f6',
    HEO: '#ec6aae',
    DEBRIS: '#8d909b',
};

export function regimeColor(o: SpaceObject): string {
    if (isStation(o)) return REGIME_COLORS.station;
    return REGIME_COLORS[o.category ?? 'LEO'] ?? REGIME_COLORS.LEO;
}
