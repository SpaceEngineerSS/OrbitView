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

// WGS-84 Constants
const WGS84 = {
    a: 6378.137,              // Semi-major axis (km)
    f: 1 / 298.257223563,     // Flattening
    b: 6356.752314245,        // Semi-minor axis (km)
    e2: 0.00669437999014,     // Eccentricity squared
    omega: 7.292115e-5        // Earth rotation rate (rad/s)
};

export type CoordinateSystem = 'ECI' | 'ECF' | 'Geodetic';

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
 * Calculate Greenwich Mean Sidereal Time (GMST)
 * @param date - UTC date/time
 * @returns GMST in radians
 */
export function calculateGMST(date: Date): number {
    // Julian Date
    const jd = dateToJulianDate(date);

    // Julian centuries from J2000.0
    const T = (jd - 2451545.0) / 36525.0;

    // GMST at 0h UT (degrees)
    const gmst0 = 100.4606184 + 36000.77004 * T + 0.000387933 * T * T - T * T * T / 38710000;

    // Add fraction of day
    const ut1Fraction = ((date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24);
    const gmstDegrees = gmst0 + 360.98564724 * ut1Fraction;

    // Normalize to 0-360 and convert to radians
    return ((gmstDegrees % 360 + 360) % 360) * (Math.PI / 180);
}

function dateToJulianDate(date: Date): number {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    const h = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

    const a = Math.floor((14 - m) / 12);
    const y1 = y + 4800 - a;
    const m1 = m + 12 * a - 3;

    const jd = d + Math.floor((153 * m1 + 2) / 5) + 365 * y1 + Math.floor(y1 / 4)
        - Math.floor(y1 / 100) + Math.floor(y1 / 400) - 32045 + h / 24 - 0.5;

    return jd;
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
 * Convert ECF to ECI coordinates
 */
export function ecfToEci(ecf: ECFCoordinates, date: Date): ECICoordinates {
    const gmst = calculateGMST(date);
    const cosGmst = Math.cos(gmst);
    const sinGmst = Math.sin(gmst);

    // Inverse rotation matrix R_z(-gmst)
    const x = cosGmst * ecf.x - sinGmst * ecf.y;
    const y = sinGmst * ecf.x + cosGmst * ecf.y;
    const z = ecf.z;

    const result: ECICoordinates = { x, y, z };

    if (ecf.vx !== undefined && ecf.vy !== undefined && ecf.vz !== undefined) {
        result.vx = cosGmst * ecf.vx - sinGmst * ecf.vy - WGS84.omega * y;
        result.vy = sinGmst * ecf.vx + cosGmst * ecf.vy + WGS84.omega * x;
        result.vz = ecf.vz;
    }

    return result;
}

/**
 * Convert ECF to Geodetic coordinates
 */
export function ecfToGeodetic(ecf: ECFCoordinates): GeodeticCoordinates {
    const x = ecf.x;
    const y = ecf.y;
    const z = ecf.z;

    const p = Math.sqrt(x * x + y * y);

    // Longitude
    let longitude = Math.atan2(y, x) * (180 / Math.PI);

    // Iterative solution for latitude and altitude
    let lat = Math.atan2(z, p * (1 - WGS84.e2));
    let alt = 0;

    for (let i = 0; i < 10; i++) {
        const sinLat = Math.sin(lat);
        const N = WGS84.a / Math.sqrt(1 - WGS84.e2 * sinLat * sinLat);
        alt = p / Math.cos(lat) - N;
        lat = Math.atan2(z, p * (1 - WGS84.e2 * N / (N + alt)));
    }

    const latitude = lat * (180 / Math.PI);
    const altitude = alt;

    return { latitude, longitude, altitude };
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
 * Format coordinates for display
 */
export function formatCoordinates(
    coords: ECICoordinates | ECFCoordinates | GeodeticCoordinates,
    system: CoordinateSystem
): string[] {
    if (system === 'Geodetic') {
        const geo = coords as GeodeticCoordinates;
        return [
            `Lat: ${geo.latitude.toFixed(4)}°`,
            `Lon: ${geo.longitude.toFixed(4)}°`,
            `Alt: ${geo.altitude.toFixed(2)} km`
        ];
    }

    const xyz = coords as ECICoordinates;
    return [
        `X: ${xyz.x.toFixed(2)} km`,
        `Y: ${xyz.y.toFixed(2)} km`,
        `Z: ${xyz.z.toFixed(2)} km`
    ];
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

/**
 * Get coordinate system description
 */
export function getSystemDescription(system: CoordinateSystem): string {
    switch (system) {
        case 'ECI':
            return 'Earth-Centered Inertial - Fixed in space, X points to vernal equinox';
        case 'ECF':
            return 'Earth-Centered Fixed - Rotates with Earth, X points to prime meridian';
        case 'Geodetic':
            return 'Latitude/Longitude/Altitude - Standard geographic coordinates';
    }
}
/**
 * Determine if a satellite is currently sunlit or in Earth's shadow.
 * Uses a simplified cylindrical shadow model.
 * 
 * @param satelliteEcf - Satellite position in ECF (km)
 * @param sunEcf - Sun position in ECF (km)
 * @returns boolean - True if sunlit, false if in shadow
 */
export function isSatelliteSunlit(satelliteEcf: ECFCoordinates, sunEcf: ECFCoordinates): boolean {
    const rSat = Math.sqrt(satelliteEcf.x ** 2 + satelliteEcf.y ** 2 + satelliteEcf.z ** 2);
    const rSun = Math.sqrt(sunEcf.x ** 2 + sunEcf.y ** 2 + sunEcf.z ** 2);

    // Unit vector towards Sun
    const sunUnit = {
        x: sunEcf.x / rSun,
        y: sunEcf.y / rSun,
        z: sunEcf.z / rSun
    };

    // Projection of satellite position onto Sun vector
    const projection = satelliteEcf.x * sunUnit.x + satelliteEcf.y * sunUnit.y + satelliteEcf.z * sunUnit.z;

    // If projection is positive, the satellite is on the day side of Earth
    if (projection > 0) return true;

    // If projection is negative, it's on the night side.
    // Check if it's within the Earth's shadow cylinder.
    // Distance from Earth-Sun line
    const distanceSq = rSat ** 2 - projection ** 2;
    const earthRadiusSq = WGS84.a ** 2;

    return distanceSq > earthRadiusSq;
}
