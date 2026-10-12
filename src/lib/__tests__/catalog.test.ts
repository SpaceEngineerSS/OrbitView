import { buildSearchIndex, searchCatalog, matchesFilter, countByFilter } from '../catalog';
import type { SpaceObject } from '../space-objects';

const obj = (id: string, name: string, category = 'LEO', group?: SpaceObject['group']): SpaceObject =>
    ({ id, name, type: 'TLE', category, group });

const catalog = [
    obj('25544', 'ISS (ZARYA)', 'LEO', 'station'),
    obj('20580', 'HST'),
    obj('44713', 'STARLINK-1007'),
    obj('39522', 'TURKSAT 4A', 'GEO'),
    obj('28474', 'NAVSTAR 57 (USA 182)', 'MEO'),
    obj('99001', 'COSMOS 1408 DEB', 'DEBRIS'),
];

describe('searchCatalog', () => {
    const index = buildSearchIndex(catalog);

    it('treats regex characters as plain text (v3 crashed on "(")', () => {
        expect(() => searchCatalog(index, 'ISS (')).not.toThrow();
        expect(searchCatalog(index, 'ISS (')[0].object.id).toBe('25544');
        expect(searchCatalog(index, '[')).toEqual([]);
    });

    it('matches NORAD ids and ranks prefix matches first', () => {
        expect(searchCatalog(index, '3952')[0].object.id).toBe('39522');
        const hits = searchCatalog(index, 'S');
        expect(hits[0].at).toBe(0);
    });

    it('is case-insensitive and ignores surrounding spaces', () => {
        expect(searchCatalog(index, '  turksat ')[0].object.id).toBe('39522');
    });
});

describe('filters', () => {
    const favs = new Set(['20580']);
    it('selects by group, name and regime', () => {
        expect(catalog.filter((o) => matchesFilter(o, 'stations', favs)).map((o) => o.id)).toEqual(['25544']);
        expect(catalog.filter((o) => matchesFilter(o, 'gnss', favs)).map((o) => o.id)).toEqual(['28474']);
        expect(catalog.filter((o) => matchesFilter(o, 'favorites', favs)).map((o) => o.id)).toEqual(['20580']);
    });

    it('counts every filter', () => {
        const c = countByFilter(catalog, favs);
        expect(c.all).toBe(6);
        expect(c.debris).toBe(1);
        expect(c.starlink).toBe(1);
    });
});
