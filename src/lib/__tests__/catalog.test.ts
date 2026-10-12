import { buildSearchIndex, searchCatalog, matchesFilter, countByFilter, FILTERS } from '../catalog';
import { orbitRegime, debrisByName, type SpaceObject, type OrbitRegime } from '../space-objects';
import type { ObjectKindCode } from '../satcat';

const obj = (id: string, name: string, category = 'LEO', group?: SpaceObject['group']): SpaceObject =>
    ({ id, name, type: 'TLE', category, regime: (category === 'DEBRIS' ? 'LEO' : category) as OrbitRegime, group });

/** Line 2 with just the fields the classifier reads, in their TLE columns. */
const line2 = (inc: number, ecc: number, n: number) =>
    `2 99999 ${inc.toFixed(4).padStart(8)} 100.0000 ${ecc.toFixed(7).slice(2)} 100.0000 100.0000 ${n.toFixed(8).padStart(11)}    10`;

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

describe('stations are the crewed stations, not the whole CelesTrak group', () => {
    const group = [
        obj('25544', 'ISS (ZARYA)', 'LEO', 'station'),
        obj('48274', 'CSS (TIANHE)', 'LEO', 'station'),
        obj('49044', 'ISS (NAUKA)', 'LEO', 'station'),
        obj('99010', 'PROGRESS-MS 34', 'LEO', 'station'),
        obj('99011', 'KNACKSAT-2', 'LEO', 'station'),
        obj('99012', 'ISS DEB', 'DEBRIS', 'station'),
    ];
    it('counts two', () => {
        expect(countByFilter(group, new Set()).stations).toBe(2);
        expect(group.filter((o) => matchesFilter(o, 'stations', new Set())).map((o) => o.id)).toEqual(['25544', '48274']);
    });
});

describe('orbit regime', () => {
    it('separates geostationary from inclined geosynchronous', () => {
        expect(orbitRegime(line2(0.05, 0.0002, 1.0027))).toBe('GEO');
        expect(orbitRegime(line2(55.1, 0.002, 1.0027))).toBe('MEO');   // BeiDou IGSO
        expect(orbitRegime(line2(41.0, 0.075, 1.0027))).toBe('MEO');   // QZSS
        expect(orbitRegime(line2(63.4, 0.70, 2.006))).toBe('HEO');     // Molniya
        expect(orbitRegime(line2(51.6, 0.0004, 15.5))).toBe('LEO');
        expect(orbitRegime(line2(55.0, 0.005, 2.0056))).toBe('MEO');   // GPS
        expect(orbitRegime('2 99999 garbage')).toBe('MEO');
    });

    it('does not call unidentified new objects debris', () => {
        expect(debrisByName('OBJECT A')).toBe(false);
        expect(debrisByName('COSMOS 1408 DEB')).toBe(true);
        expect(debrisByName('CZ-4C R/B')).toBe(true);
    });
});

describe('regimes and debris add up to the whole catalog', () => {
    const kinds = new Map<string, ObjectKindCode>([['20580', 'PAY'], ['99001', 'DEB'], ['44713', 'R/B']]);
    for (const k of [undefined, kinds]) {
        it(k ? 'with SATCAT object types' : 'with names only', () => {
            const c = countByFilter(catalog, new Set(), k);
            expect(c.leo + c.meo + c.geo + c.heo + c.debris).toBe(c.all);
            const viaFilter = (f: (typeof FILTERS)[number]) => catalog.filter((o) => matchesFilter(o, f, new Set(), k)).length;
            for (const f of ['leo', 'meo', 'geo', 'heo', 'debris'] as const) expect(viaFilter(f)).toBe(c[f]);
        });
    }
    it('prefers the SATCAT type over the name', () => {
        const kinds = new Map<string, ObjectKindCode>([['44713', 'R/B'], ['99001', 'PAY']]);
        expect(catalog.filter((o) => matchesFilter(o, 'debris', new Set(), kinds)).map((o) => o.id)).toEqual(['44713']);
    });
});

describe('GNSS names as catalogued', () => {
    it.each(['NAVSTAR 81 (USA 319)', 'COSMOS 2433 (720)', 'COSMOS 2547 (705K)', 'GSAT0101 (GALILEO-PFM)',
        'BEIDOU-3 M1 (C19)', 'QZS-1R', 'IRNSS-1B', 'NVS-01 (IRNSS-1J)'])('%s', (name) => {
        expect(matchesFilter(obj('1', name), 'gnss', new Set())).toBe(true);
    });
    it.each(['COSMOS 2558', 'GSAT-15 (GAGAN/PRN 139)', 'STARLINK-1007'])('not %s', (name) => {
        expect(matchesFilter(obj('1', name), 'gnss', new Set())).toBe(false);
    });
});
