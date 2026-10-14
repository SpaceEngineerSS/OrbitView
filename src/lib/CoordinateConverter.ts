/**
 * Coordinate System Converter
 * 
 * Converts between different coordinate reference frames used in astrodynamics:
 * - ECI (Earth-Centered Inertial)
 * - ECF/ECEF (Earth-Centered Earth-Fixed)
 * - Geodetic (Latitude, Longitude, Altitude)
 * 
 * @module CoordinateConverter
 * 
 * References:
 * -----------
 * [1] Vallado, D.A. (2013). "Fundamentals of Astrodynamics and Applications"
 *     4th Edition, Chapter 3: Coordinate Systems. ISBN: 978-1881883180
 */

import * as satellite from 'satellite.js';

// WGS-84 Constants
const WGS84 = {
    a: 6378.137,              // Semi-major axis (km)
    f: 1 / 298.257223563,     // Flattening
    b: 6356.752314245,        // Semi-minor axis (km)
    e2: 0.00669437999014,     // Eccentricity squared
    omega: 7.292115e-5        // Earth rotation rate (rad/s)
};

export interface ECICoordinates {
    x: number;  // km
    y: number;  // km
    z: number;  // km
    vx?: number; // km/s
    vy?: number; // km/s
    vz?: number; // km/s
}

export interface ECFCoordinates {
    x: number;  // km
    y: number;  // km
    z: number;  // km
    vx?: number; // km/s
    vy?: number; // km/s
    vz?: number; // km/s
}

export interface GeodeticCoordinates {
    latitude: number;   // degrees
    longitude: number;  // degrees
    altitude: number;   // km
}

/**
 * Greenwich Mean Sidereal Time.
 *
 * Delegates to satellite.js (IAU-82 model, the same one SGP4 uses) so that
 * every frame conversion in the app agrees with the propagator.
 * @returns GMST in radians, 0..2π
 */
export function calculateGMST(date: Date): number {
    return satellite.gstime(date);
}

function dateToJulianDate(date: Date): number {
    // Unix epoch (1970-01-01T00:00Z) is JD 2440587.5; keeps millisecond precision.
    return date.getTime() / 86_400_000 + 2440587.5;
}

/**
 * Convert ECI to ECF coordinates
 */
export function eciToEcf(eci: ECICoordinates, date: Date): ECFCoordinates {
    const gmst = calculateGMST(date);
    const cosGmst = Math.cos(gmst);
    const sinGmst = Math.sin(gmst);

    // Rotation matrix R_z(gmst)
    const x = cosGmst * eci.x + sinGmst * eci.y;
    const y = -sinGmst * eci.x + cosGmst * eci.y;
    const z = eci.z;

    const result: ECFCoordinates = { x, y, z };

    // Transform velocity if provided
    if (eci.vx !== undefined && eci.vy !== undefined && eci.vz !== undefined) {
        // Include Earth's rotation effect on velocity
        result.vx = cosGmst * eci.vx + sinGmst * eci.vy + WGS84.omega * y;
        result.vy = -sinGmst * eci.vx + cosGmst * eci.vy - WGS84.omega * x;
        result.vz = eci.vz;
    }

    return result;
}

/**
 * Convert ECF to Geodetic coordinates (WGS-84).
 * Iterates on latitude and computes height with a formula that stays
 * well-conditioned at the poles (no division by cos φ).
 */
export function ecfToGeodetic(ecf: ECFCoordinates): GeodeticCoordinates {
    const { x, y, z } = ecf;
    const p = Math.hypot(x, y);
    const longitude = Math.atan2(y, x) * (180 / Math.PI);

    let lat = Math.atan2(z, p * (1 - WGS84.e2));
    let N = WGS84.a;
    for (let i = 0; i < 6; i++) {
        const sinLat = Math.sin(lat);
        N = WGS84.a / Math.sqrt(1 - WGS84.e2 * sinLat * sinLat);
        lat = Math.atan2(z + N * WGS84.e2 * sinLat, p);
    }
    const sinLat = Math.sin(lat);
    const cosLat = Math.cos(lat);
    const altitude = p * cosLat + z * sinLat - WGS84.a * Math.sqrt(1 - WGS84.e2 * sinLat * sinLat);

    return { latitude: lat * (180 / Math.PI), longitude, altitude };
}

/**
 * Convert Geodetic to ECF coordinates
 */
export function geodeticToEcf(geo: GeodeticCoordinates): ECFCoordinates {
    const latRad = geo.latitude * (Math.PI / 180);
    const lonRad = geo.longitude * (Math.PI / 180);

    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const sinLon = Math.sin(lonRad);
    const cosLon = Math.cos(lonRad);

    const N = WGS84.a / Math.sqrt(1 - WGS84.e2 * sinLat * sinLat);

    const x = (N + geo.altitude) * cosLat * cosLon;
    const y = (N + geo.altitude) * cosLat * sinLon;
    const z = (N * (1 - WGS84.e2) + geo.altitude) * sinLat;

    return { x, y, z };
}

/**
 * Calculate Sun's position in ECF coordinates for a given date.
 * Uses a simplified low-precision model suitable for visibility calculations.
 */
export function calculateSunPosition(date: Date): ECFCoordinates {
    const jd = dateToJulianDate(date);
    const n = jd - 2451545.0;

    // Mean longitude of the Sun
    const L = (280.460 + 0.9856474 * n) % 360;
    // Mean anomaly of the Sun
    const g = (357.528 + 0.9856003 * n) % 360;

    const g_rad = g * (Math.PI / 180);

    // Ecliptic longitude
    const lambda = (L + 1.915 * Math.sin(g_rad) + 0.020 * Math.sin(2 * g_rad)) % 360;
    const lambda_rad = lambda * (Math.PI / 180);

    // Obliquity of the ecliptic
    const obli = (23.439 - 0.0000004 * n) * (Math.PI / 180);

    // Distance from Earth to Sun (km)
    const r = (1.00014 - 0.01671 * Math.cos(g_rad) - 0.00014 * Math.cos(2 * g_rad)) * 149597870.7;

    const eci: ECICoordinates = {
        x: r * Math.cos(lambda_rad),
        y: r * Math.sin(lambda_rad) * Math.cos(obli),
        z: r * Math.sin(lambda_rad) * Math.sin(obli)
    };

    return eciToEcf(eci, date);
}

const SUN_RADIUS_KM = 696_000;

export type ShadowState = 'sunlit' | 'penumbra' | 'umbra';

/**
 * Where a satellite is relative to the Earth's shadow: a cone (umbra) inside
 * a wider cone (penumbra), both set by the Sun's and Earth's radii and the
 * Sun's distance. Vallado (2013), Algorithm 34 (SHADOW).
 *
 * The Earth is a sphere of equatorial radius and the atmosphere is not
 * allowed for; at ISS height the umbra edge is placed to within a few
 * seconds of flight.
 *
 * @param satelliteEcf - Satellite position, km (any Earth-centred frame)
 * @param sunEcf - Sun position in the same frame, km
 */
export function shadowState(satelliteEcf: ECFCoordinates, sunEcf: ECFCoordinates): ShadowState {
    const rSun = Math.hypot(sunEcf.x, sunEcf.y, sunEcf.z);
    const rSat = Math.hypot(satelliteEcf.x, satelliteEcf.y, satelliteEcf.z);
    // Component of the satellite position along the Sun direction
    const along = (satelliteEcf.x * sunEcf.x + satelliteEcf.y * sunEcf.y + satelliteEcf.z * sunEcf.z) / rSun;
    if (along >= 0) return 'sunlit'; // day side of the terminator plane

    const behind = -along;                                         // distance behind the Earth, along the shadow axis
    const off = Math.sqrt(Math.max(0, rSat * rSat - along * along)); // distance from the shadow axis

    const re = WGS84.a;
    const alphaPen = Math.asin((SUN_RADIUS_KM + re) / rSun);
    const alphaUmb = Math.asin((SUN_RADIUS_KM - re) / rSun);

    // Penumbra cone widens away from the Sun, its apex on the Sun side of the Earth.
    const penRadius = Math.tan(alphaPen) * (re / Math.sin(alphaPen) + behind);
    if (off > penRadius) return 'sunlit';
    // Umbra cone narrows to an apex ~1.4 million km behind the Earth.
    const umbRadius = Math.tan(alphaUmb) * (re / Math.sin(alphaUmb) - behind);
    return off <= umbRadius ? 'umbra' : 'penumbra';
}

/**
 * True unless the satellite is in the umbra. In the penumbra part of the Sun
 * is still in view and the satellite still shines, so it counts as sunlit.
 */
export function isSatelliteSunlit(satelliteEcf: ECFCoordinates, sunEcf: ECFCoordinates): boolean {
    return shadowState(satelliteEcf, sunEcf) !== 'umbra';
}
