import * as Cesium from "cesium";
import { SatelliteData } from "./tle";

export type SpaceObjectType = 'TLE' | 'EPHEMERIS';

export interface SpaceObject {
    id: string;
    name: string;
    type: SpaceObjectType;
    // TLE Data (Optional)
    tle?: {
        line1: string;
        line2: string;
    };
    // Ephemeris Data (Optional - for deep space)
    ephemeris?: {
        positionProperty: Cesium.SampledPositionProperty;
        modelUrl?: string; // For Module C (True Scale Models)
        description?: string;
    };
    // Common
    category?: string;
    // Professional Metadata
    mass?: number;
    dimensions?: string;
    frequencies?: string[];
}

// Helper to convert legacy SatelliteData to SpaceObject
export const convertToSpaceObject = (sat: SatelliteData): SpaceObject => {
    // Determine category based on TLE
    let category = 'LEO';
    try {
        const line2 = sat.line2;
        const meanMotion = parseFloat(line2.substring(52, 63)); // revs per day
        const eccentricity = parseFloat('0.' + line2.substring(26, 33));
        const name = sat.name.toUpperCase();

        if (name.includes("DEBRIS") || name.includes("ROCKET BODY") || name.includes(" DEB") || name.includes("R/B") || name.includes("OBJECT ")) {
            category = 'DEBRIS';
        } else if (meanMotion > 11.25) {
            category = 'LEO';
        } else if (meanMotion > 0.9 && meanMotion < 1.1 && eccentricity < 0.1) {
            category = 'GEO';
        } else if (eccentricity > 0.25) {
            category = 'HEO'; // High eccentricity (Molniya etc.)
        } else if (meanMotion >= 1.1 && meanMotion <= 11.25) {
            category = 'MEO';
        } else {
            category = 'MEO/HEO';
        }
    } catch (e) {
        category = 'SAT';
    }

    return {
        id: sat.id,
        name: sat.name,
        type: 'TLE',
        tle: {
            line1: sat.line1,
            line2: sat.line2
        },
        category,
        mass: sat.mass,
        dimensions: sat.dimensions,
        frequencies: sat.frequencies
    };
};
