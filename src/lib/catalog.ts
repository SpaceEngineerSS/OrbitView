/**
 * Catalog helpers: filters, search and the short "featured" list.
 */

import type { SpaceObject } from './space-objects';
import type { FilterKey } from '@/store/appStore';

const GNSS = /\b(NAVSTAR|GPS|GLONASS|GALILEO|GSAT0|BEIDOU|QZS|IRNSS|NAVIC)\b/;

export function matchesFilter(o: SpaceObject, f: FilterKey, favorites: ReadonlySet<string>): boolean {
    switch (f) {
        case 'all': return true;
        case 'favorites': return favorites.has(o.id);
        case 'stations': return o.group === 'station';
        case 'starlink': return o.name.toUpperCase().startsWith('STARLINK');
        case 'gnss': return GNSS.test(o.name.toUpperCase());
        case 'leo': return o.category === 'LEO';
        case 'meo': return o.category === 'MEO';
        case 'geo': return o.category === 'GEO';
        case 'heo': return o.category === 'HEO';
        case 'debris': return o.category === 'DEBRIS';
    }
}

export const FILTERS: FilterKey[] = ['all', 'stations', 'starlink', 'gnss', 'leo', 'meo', 'geo', 'heo', 'debris', 'favorites'];

export function countByFilter(objects: SpaceObject[], favorites: ReadonlySet<string>): Record<FilterKey, number> {
    const out = Object.fromEntries(FILTERS.map((f) => [f, 0])) as Record<FilterKey, number>;
    // One pass, each name upper-cased once.
    for (const o of objects) {
        out.all++;
        if (favorites.has(o.id)) out.favorites++;
        if (o.group === 'station') out.stations++;
        const name = o.name.toUpperCase();
        if (name.startsWith('STARLINK')) out.starlink++;
        if (GNSS.test(name)) out.gnss++;
        switch (o.category) {
            case 'LEO': out.leo++; break;
            case 'MEO': out.meo++; break;
            case 'GEO': out.geo++; break;
            case 'HEO': out.heo++; break;
            case 'DEBRIS': out.debris++; break;
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
    '33591', // NOAA 19
    '43013', // NOAA 20
    '41866', // GOES 16
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
    if (o.group === 'station') return REGIME_COLORS.station;
    return REGIME_COLORS[o.category ?? 'LEO'] ?? REGIME_COLORS.LEO;
}
