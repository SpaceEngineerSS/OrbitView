/**
 * Shared SGP4 helpers.
 *
 * Everything that needs "where is the satellite and how fast is it moving
 * relative to the ground" goes through stateAt(), so the frame conversion
 * (TEME → Earth-fixed, including the ω × r term for velocity) lives in one
 * place.
 */

import * as satellite from 'satellite.js';

export const EARTH_RADIUS_KM = 6378.135;      // WGS-72, as used by SGP4
export const EARTH_ROTATION_RAD_S = 7.292115e-5;
export const MU_KM3_S2 = 398600.8;            // WGS-72

export interface Vec3 { x: number; y: number; z: number }

export interface OrbitState {
    /** TEME position, km */
    positionEci: Vec3;
    /** TEME velocity, km/s */
    velocityEci: Vec3;
    /** Earth-fixed position, km */
    positionEcf: Vec3;
    /** Earth-fixed velocity (relative to rotating Earth), km/s */
    velocityEcf: Vec3;
    latitudeDeg: number;
    longitudeDeg: number;
    altitudeKm: number;
    /** Inertial speed, km/s */
    speedKmS: number;
    gmst: number;
}

const satrecCache = new Map<string, satellite.SatRec>();

/** Parse a TLE once and reuse the record. */
export function getSatrec(line1: string, line2: string): satellite.SatRec {
    const key = line1 + line2;
    let rec = satrecCache.get(key);
    if (!rec) {
        rec = satellite.twoline2satrec(line1, line2);
        if (satrecCache.size > 2000) satrecCache.clear();
        satrecCache.set(key, rec);
    }
    return rec;
}

/**
 * Rotate a TEME state into the Earth-fixed frame.
 * v_ecf = R·v_eci − ω × r_ecf
 */
export function temeToEcf(r: Vec3, v: Vec3, gmst: number): { r: Vec3; v: Vec3 } {
    const c = Math.cos(gmst);
    const s = Math.sin(gmst);
    const rx = c * r.x + s * r.y;
    const ry = -s * r.x + c * r.y;
    return {
        r: { x: rx, y: ry, z: r.z },
        v: {
            x: c * v.x + s * v.y + EARTH_ROTATION_RAD_S * ry,
            y: -s * v.x + c * v.y - EARTH_ROTATION_RAD_S * rx,
            z: v.z,
        },
    };
}

/** Propagate and return the full state, or null if SGP4 fails (decayed, bad TLE). */
export function stateAt(rec: satellite.SatRec, date: Date): OrbitState | null {
    const pv = satellite.propagate(rec, date);
    if (!pv || !pv.position || !pv.velocity || rec.error) return null;
    const r = pv.position as Vec3;
    const v = pv.velocity as Vec3;
    if (!Number.isFinite(r.x) || !Number.isFinite(v.x)) return null;

    const gmst = satellite.gstime(date);
    const ecf = temeToEcf(r, v, gmst);
    const gd = satellite.eciToGeodetic(r as satellite.EciVec3<number>, gmst);

    return {
        positionEci: r,
        velocityEci: v,
        positionEcf: ecf.r,
        velocityEcf: ecf.v,
        latitudeDeg: satellite.degreesLat(gd.latitude),
        longitudeDeg: satellite.degreesLong(gd.longitude),
        altitudeKm: gd.height,
        speedKmS: Math.hypot(v.x, v.y, v.z),
        gmst,
    };
}

export interface OrbitalElements {
    epoch: Date;
    /** Semi-major axis, km (from the SGP4 mean motion, not the instantaneous radius) */
    semiMajorAxisKm: number;
    eccentricity: number;
    inclinationDeg: number;
    raanDeg: number;
    argPerigeeDeg: number;
    meanAnomalyDeg: number;
    meanMotionRevPerDay: number;
    periodMin: number;
    perigeeAltKm: number;
    apogeeAltKm: number;
    /** SGP4 drag term, 1/earth-radii */
    bstar: number;
}

const RAD = 180 / Math.PI;

export function elementsFromSatrec(rec: satellite.SatRec): OrbitalElements {
    // rec.no is the un-Kozai'd mean motion in rad/min; rec.a is in earth radii.
    const periodMin = (2 * Math.PI) / rec.no;
    const a = rec.a * EARTH_RADIUS_KM;
    const epochMs = (rec.jdsatepoch - 2440587.5) * 86_400_000;
    return {
        epoch: new Date(epochMs),
        semiMajorAxisKm: a,
        eccentricity: rec.ecco,
        inclinationDeg: rec.inclo * RAD,
        raanDeg: rec.nodeo * RAD,
        argPerigeeDeg: rec.argpo * RAD,
        meanAnomalyDeg: rec.mo * RAD,
        meanMotionRevPerDay: 1440 / periodMin,
        periodMin,
        perigeeAltKm: a * (1 - rec.ecco) - EARTH_RADIUS_KM,
        apogeeAltKm: a * (1 + rec.ecco) - EARTH_RADIUS_KM,
        bstar: rec.bstar,
    };
}

export function elementsFromTLE(line1: string, line2: string): OrbitalElements {
    return elementsFromSatrec(getSatrec(line1, line2));
}

/** Days between the TLE epoch and `date` (positive = TLE is older). */
export function tleAgeDays(rec: satellite.SatRec, date: Date): number {
    return (date.getTime() - elementsFromSatrec(rec).epoch.getTime()) / 86_400_000;
}

export interface ObserverGeodetic {
    latitude: number;   // deg
    longitude: number;  // deg
    altitude: number;   // m above ellipsoid
}

export interface LookAngles {
    azimuthDeg: number;
    elevationDeg: number;
    rangeKm: number;
    /** Positive = receding, km/s */
    rangeRateKmS: number;
}

export function observerToEcf(obs: ObserverGeodetic): Vec3 {
    return satellite.geodeticToEcf({
        latitude: obs.latitude / RAD,
        longitude: obs.longitude / RAD,
        height: obs.altitude / 1000,
    });
}

/** Topocentric azimuth / elevation / range / range-rate for an Earth-fixed state. */
export function lookAngles(state: Pick<OrbitState, 'positionEcf' | 'velocityEcf'>, obs: ObserverGeodetic): LookAngles {
    const o = observerToEcf(obs);
    const rx = state.positionEcf.x - o.x;
    const ry = state.positionEcf.y - o.y;
    const rz = state.positionEcf.z - o.z;
    const range = Math.hypot(rx, ry, rz);

    const lat = obs.latitude / RAD;
    const lon = obs.longitude / RAD;
    const sLat = Math.sin(lat), cLat = Math.cos(lat);
    const sLon = Math.sin(lon), cLon = Math.cos(lon);
    // South-East-Zenith
    const south = sLat * cLon * rx + sLat * sLon * ry - cLat * rz;
    const east = -sLon * rx + cLon * ry;
    const zenith = cLat * cLon * rx + cLat * sLon * ry + sLat * rz;

    let az = Math.atan2(east, -south) * RAD;
    if (az < 0) az += 360;
    const el = Math.asin(zenith / range) * RAD;

    const v = state.velocityEcf;
    const rangeRate = (rx * v.x + ry * v.y + rz * v.z) / range;

    return { azimuthDeg: az, elevationDeg: el, rangeKm: range, rangeRateKmS: rangeRate };
}
