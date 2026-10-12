/**
 * Ground Track & Footprint Calculator
 * 
 * Calculates satellite ground track (subsatellite point trace) and 
 * coverage footprint for visualization on the globe.
 * 
 * @module GroundTrack
 * @see {@link https://celestrak.org/columns/v02n04/} CelesTrak: Ground Tracks
 * 
 * Mathematical Foundation:
 * ========================
 * Subsatellite Point:
 * The point on Earth's surface directly below the satellite.
 * 
 * ECI to ECF Transformation:
 *   r⃗_ECF = R_z(-θ_GMST) × r⃗_ECI
 * 
 * Where θ_GMST is Greenwich Mean Sidereal Time.
 * 
 * ECF to Geodetic Conversion (WGS-84):
 *   λ = atan2(y, x)                    [Longitude]
 *   φ = atan2(z, √(x² + y²))           [Latitude, iterative solution]
 * 
 * Footprint (Coverage Circle):
 * The area on Earth visible from satellite at minimum elevation ε:
 * 
 *   r_footprint = R_E × (arccos(R_E×cos(ε)/(R_E + h)) - ε)
 * 
 * For horizon (ε = 0°):
 *   r_footprint = R_E × arccos(R_E / (R_E + h))
 * 
 * Haversine Distance Formula:
 *   a = sin²(Δφ/2) + cos(φ₁)×cos(φ₂)×sin²(Δλ/2)
 *   d = 2×R_E×atan2(√a, √(1-a))
 * 
 * References:
 * -----------
 * [1] Vallado, D.A. (2013). "Fundamentals of Astrodynamics and Applications"
 *     4th Edition, Chapter 3: Coordinate Systems. ISBN: 978-1881883180
 * 
 * [2] Montenbruck, O. & Gill, E. (2012). "Satellite Orbits: Models, Methods and Applications"
 *     Springer. Chapter 5. ISBN: 978-3642580901
 * 
 * [3] WGS-84 Reference: NIMA Technical Report TR8350.2 (2000)
 *     {@link https://earth-info.nga.mil/GandG/publications/tr8350.2/tr8350_2.html}
 * 
 * Accuracy Notes:
 * - Ground track accuracy inherits SGP4 propagation errors (~1km for LEO)
 * - Footprint assumes spherical Earth; actual coverage varies with terrain
 */

import * as satellite from 'satellite.js';
import { getSatrec, stateAt, elementsFromSatrec, type Vec3 } from './orbit';

export interface GroundTrackPoint {
    latitude: number;
    longitude: number;
    altitude: number;
    time: Date;
}

export interface GroundTrackResult {
    pastTrack: GroundTrackPoint[];
    futureTrack: GroundTrackPoint[];
    currentPosition: GroundTrackPoint;
}

/**
 * Calculate ground track for a satellite given its TLE data
 * 
 * @param tle1 - First line of TLE
 * @param tle2 - Second line of TLE
 * @param startTime - Start time for calculation
 * @param futureMinutes - Future duration to calculate
 * @param pastMinutes - Past duration to calculate
 * @param stepSeconds - Time step between points in seconds
 */
export function calculateGroundTrack(
    tle1: string,
    tle2: string,
    startTime: Date = new Date(),
    futureMinutes: number = 90,
    pastMinutes: number = 45,
    stepSeconds: number = 60
): GroundTrackResult {
    const satrec = getSatrec(tle1, tle2);

    const pastTrack: GroundTrackPoint[] = [];
    const futureTrack: GroundTrackPoint[] = [];

    // Calculate past track
    for (let t = -pastMinutes * 60; t < 0; t += stepSeconds) {
        const time = new Date(startTime.getTime() + t * 1000);
        const point = getSatellitePosition(satrec, time);
        if (point) {
            pastTrack.push(point);
        }
    }

    // Current position
    const currentPosition = getSatellitePosition(satrec, startTime) || {
        latitude: 0,
        longitude: 0,
        altitude: 0,
        time: startTime
    };

    // Calculate future track
    for (let t = stepSeconds; t <= futureMinutes * 60; t += stepSeconds) {
        const time = new Date(startTime.getTime() + t * 1000);
        const point = getSatellitePosition(satrec, time);
        if (point) {
            futureTrack.push(point);
        }
    }

    return { pastTrack, futureTrack, currentPosition };
}

function getSatellitePosition(
    satrec: satellite.SatRec,
    time: Date
): GroundTrackPoint | null {
    const s = stateAt(satrec, time);
    if (!s) return null;
    return { latitude: s.latitudeDeg, longitude: s.longitudeDeg, altitude: s.altitudeKm, time };
}

/**
 * One full revolution, starting at `date`, expressed in the Earth-fixed frame
 * *as it is at `date`* (km). This is the inertial orbit "frozen" at the current
 * Earth orientation, so the satellite sits exactly on the ring. Re-evaluate it
 * every few seconds as the Earth turns underneath.
 */
export function orbitRingEcf(satrec: satellite.SatRec, date: Date, samples = 180): Vec3[] {
    const el = elementsFromSatrec(satrec);
    const periodMs = el.periodMin * 60_000;
    const gmst = satellite.gstime(date);
    const c = Math.cos(gmst), sn = Math.sin(gmst);
    const out: Vec3[] = [];
    for (let i = 0; i <= samples; i++) {
        const st = stateAt(satrec, new Date(date.getTime() + (periodMs * i) / samples));
        if (!st) continue;
        const r = st.positionEci;
        out.push({ x: c * r.x + sn * r.y, y: -sn * r.x + c * r.y, z: r.z });
    }
    return out;
}

/**
 * Calculate satellite footprint (coverage circle)
 * The footprint is the area on Earth that can "see" the satellite
 * 
 * @param altitude - Satellite altitude in km
 * @param minElevation - Minimum elevation angle in degrees (default 0 = horizon)
 */
export function calculateFootprintRadius(
    altitude: number,
    minElevation: number = 0
): number {
    const EARTH_RADIUS_KM = 6371;

    // Earth central angle calculation
    // Using geometry for the coverage cone
    const elevationRad = minElevation * (Math.PI / 180);
    const earthCentralAngle = Math.acos(
        EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitude) * Math.cos(elevationRad)
    ) - elevationRad;

    // Convert to km on Earth's surface
    const footprintRadius = earthCentralAngle * EARTH_RADIUS_KM;

    return footprintRadius;
}

/**
 * Generate footprint circle points for visualization
 * 
 * @param centerLat - Center latitude in degrees
 * @param centerLon - Center longitude in degrees
 * @param radiusKm - Radius in kilometers
 * @param numPoints - Number of points to generate
 */
export function generateFootprintCircle(
    centerLat: number,
    centerLon: number,
    radiusKm: number,
    numPoints: number = 72
): Array<{ latitude: number; longitude: number }> {
    const EARTH_RADIUS_KM = 6371;
    const points: Array<{ latitude: number; longitude: number }> = [];

    const lat1 = centerLat * (Math.PI / 180);
    const lon1 = centerLon * (Math.PI / 180);
    const angularRadius = radiusKm / EARTH_RADIUS_KM;

    for (let i = 0; i <= numPoints; i++) {
        const bearing = (i * 360 / numPoints) * (Math.PI / 180);

        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(angularRadius) +
            Math.cos(lat1) * Math.sin(angularRadius) * Math.cos(bearing)
        );

        const lon2 = lon1 + Math.atan2(
            Math.sin(bearing) * Math.sin(angularRadius) * Math.cos(lat1),
            Math.cos(angularRadius) - Math.sin(lat1) * Math.sin(lat2)
        );

        points.push({
            latitude: lat2 * (180 / Math.PI),
            longitude: ((lon2 * (180 / Math.PI)) + 540) % 360 - 180 // Normalize longitude
        });
    }

    return points;
}

/**
 * Calculate visibility footprint for different elevation angles
 * Returns multiple rings representing different signal quality zones
 */
export function calculateVisibilityZones(
    latitude: number,
    longitude: number,
    altitude: number
): {
    horizon: Array<{ latitude: number; longitude: number }>;
    tenDegree: Array<{ latitude: number; longitude: number }>;
    twentyDegree: Array<{ latitude: number; longitude: number }>;
    thirtyDegree: Array<{ latitude: number; longitude: number }>;
} {
    const radiusHorizon = calculateFootprintRadius(altitude, 0);
    const radius10deg = calculateFootprintRadius(altitude, 10);
    const radius20deg = calculateFootprintRadius(altitude, 20);
    const radius30deg = calculateFootprintRadius(altitude, 30);

    return {
        horizon: generateFootprintCircle(latitude, longitude, radiusHorizon),
        tenDegree: generateFootprintCircle(latitude, longitude, radius10deg),
        twentyDegree: generateFootprintCircle(latitude, longitude, radius20deg),
        thirtyDegree: generateFootprintCircle(latitude, longitude, radius30deg)
    };
}

/**
 * Check if a ground location is within the satellite's footprint
 */
export function isWithinFootprint(
    satLat: number,
    satLon: number,
    satAltitude: number,
    groundLat: number,
    groundLon: number,
    minElevation: number = 0
): boolean {
    const footprintRadius = calculateFootprintRadius(satAltitude, minElevation);
    const distance = haversineDistance(satLat, satLon, groundLat, groundLon);
    return distance <= footprintRadius;
}

/**
 * Calculate distance between two points on Earth using Haversine formula
 */
function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const EARTH_RADIUS_KM = 6371;

    const lat1Rad = lat1 * (Math.PI / 180);
    const lat2Rad = lat2 * (Math.PI / 180);
    const deltaLat = (lat2 - lat1) * (Math.PI / 180);
    const deltaLon = (lon2 - lon1) * (Math.PI / 180);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
}
