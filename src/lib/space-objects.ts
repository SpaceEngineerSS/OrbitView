import { SatelliteData, SatelliteCategory } from "./tle";

export type SpaceObjectType = 'TLE';

/** Orbit regime from the mean elements; every object gets exactly one. */
export type OrbitRegime = 'LEO' | 'MEO' | 'GEO' | 'HEO';

export interface SpaceObject {
    id: string;
    name: string;
    type: SpaceObjectType;
    // TLE Data (Optional)
    tle?: {
        line1: string;
        line2: string;
    };
    // Common
    /** Display category: the orbit regime, or DEBRIS when the name says so */
    category?: string;
    /** Orbit regime, independent of what the object is */
    regime?: OrbitRegime;
    /** Catalog group assigned at load time in tle.ts (station, starlink, cubesat, active) */
    group?: SatelliteCategory;
    // Professional Metadata
    mass?: number;
    dimensions?: string;
    frequencies?: string[];
}

/**
 * Regime from line 2 of a TLE. GEO means geostationary: one rev per sidereal
 * day, nearly circular and nearly equatorial. Inclined geosynchronous orbits
 * (BeiDou/NavIC IGSO, QZSS) are not geostationary and count as MEO here.
 */
export function orbitRegime(line2: string): OrbitRegime {
    const n = parseFloat(line2.substring(52, 63));     // revs per day
    const e = parseFloat('0.' + line2.substring(26, 33).trim());
    const i = parseFloat(line2.substring(8, 16));       // degrees
    if (!Number.isFinite(n) || !Number.isFinite(e)) return 'MEO';
    if (n > 11.25) return 'LEO';
    if (e > 0.25) return 'HEO';                         // Molniya, Tundra, GTO
    if (n > 0.9 && n < 1.1 && e < 0.1 && Number.isFinite(i) && i < 5) return 'GEO';
    return 'MEO';
}

/**
 * Debris guessed from the name, used until SATCAT's object type is loaded.
 * "OBJECT A" etc. are new, not yet identified launches — usually payloads.
 */
export function debrisByName(name: string): boolean {
    const u = name.toUpperCase();
    return u.includes(' DEB') || u.includes('R/B') || u.includes('ROCKET BODY') || u.includes('DEBRIS');
}

// Helper to convert legacy SatelliteData to SpaceObject
export const convertToSpaceObject = (sat: SatelliteData): SpaceObject => {
    const regime = orbitRegime(sat.line2);
    return {
        id: sat.id,
        name: sat.name,
        type: 'TLE',
        tle: {
            line1: sat.line1,
            line2: sat.line2
        },
        category: debrisByName(sat.name) ? 'DEBRIS' : regime,
        regime,
        // Preserve the catalog category from tle.ts instead of discarding it
        group: sat.category,
        mass: sat.mass,
        dimensions: sat.dimensions,
        frequencies: sat.frequencies
    };
};
