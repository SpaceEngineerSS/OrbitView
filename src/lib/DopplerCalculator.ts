/**
 * Doppler Shift Calculator
 * 
 * Calculates the frequency shift due to relative motion between
 * a satellite and a ground observer.
 * 
 * @module DopplerCalculator
 * @see {@link https://celestrak.org/columns/v02n02/} CelesTrak: Doppler Tracking
 * 
 * Mathematical Foundation:
 * ========================
 * Classical Doppler Formula: Δf = (v_r / c) × f_0
 * 
 * Where:
 * - v_r = Radial velocity (range rate) in m/s
 * - c = Speed of light (299,792,458 m/s)  
 * - f_0 = Base/transmitted frequency in Hz
 * 
 * Range Rate Calculation: v_r = v⃗_sat · r̂
 * - v⃗_sat = Satellite velocity vector (ECF frame)
 * - r̂ = Unit range vector from observer to satellite
 * 
 * Sign Convention:
 * - v_r < 0: Satellite approaching → Positive frequency shift (blueshift)
 * - v_r > 0: Satellite receding → Negative frequency shift (redshift)
 * 
 * References:
 * -----------
 * [1] Vallado, D.A. (2013). "Fundamentals of Astrodynamics and Applications"
 *     4th Edition, Microcosm Press. Chapter 4: Observations. ISBN: 978-1881883180
 * 
 * [2] Einstein, A. (1905). "On the Electrodynamics of Moving Bodies"
 *     Annalen der Physik, 17(10), 891-921. DOI: 10.1002/andp.19053221004
 * 
 * [3] NIST Reference: Speed of Light c = 299,792,458 m/s (exact, SI definition)
 * 
 * Accuracy Notes:
 * - This implementation uses classical (non-relativistic) Doppler
 * - Relativistic effects are negligible for LEO satellites (v << c)
 * - For GPS satellites, relativistic corrections are applied separately
 */

// Speed of light in m/s
const SPEED_OF_LIGHT = 299_792_458;

// Earth radius in meters
const EARTH_RADIUS = 6_371_000;

export interface ObserverPosition {
    latitude: number;   // degrees
    longitude: number;  // degrees
    altitude: number;   // meters above sea level
}

export interface SatelliteState {
    position: { x: number; y: number; z: number };  // ECF in meters
    velocity: { x: number; y: number; z: number };  // ECF in m/s
}

export interface DopplerResult {
    rangeKm: number;           // Distance to satellite in km
    rangeRateMps: number;      // Range rate in m/s (positive = moving away)
    dopplerShiftHz: number;    // Frequency shift in Hz
    receivedFreqHz: number;    // Received frequency in Hz
    shiftPpm: number;          // Shift in parts per million
    isApproaching: boolean;    // true if satellite is approaching
}

/**
 * Convert geodetic coordinates (lat, lon, alt) to ECF (Earth-Centered Fixed)
 */
export function geodeticToECF(lat: number, lon: number, alt: number): { x: number; y: number; z: number } {
    const latRad = lat * (Math.PI / 180);
    const lonRad = lon * (Math.PI / 180);

    // WGS84 ellipsoid constants
    const a = 6_378_137;        // Semi-major axis
    const f = 1 / 298.257223563; // Flattening
    const e2 = 2 * f - f * f;    // Eccentricity squared

    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const sinLon = Math.sin(lonRad);
    const cosLon = Math.cos(lonRad);

    // Radius of curvature in the prime vertical
    const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);

    const x = (N + alt) * cosLat * cosLon;
    const y = (N + alt) * cosLat * sinLon;
    const z = (N * (1 - e2) + alt) * sinLat;

    return { x, y, z };
}

/**
 * Calculate the dot product of two 3D vectors
 */
function dot(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Calculate the magnitude of a 3D vector
 */
function magnitude(v: { x: number; y: number; z: number }): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Subtract two 3D vectors
 */
function subtract(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/**
 * Calculate Doppler shift for a satellite as seen by a ground observer
 * 
 * @param satellite - Satellite position and velocity in ECF coordinates (meters, m/s)
 * @param observer - Observer geodetic position
 * @param baseFrequencyHz - Base/transmitted frequency in Hz
 * @returns DopplerResult with all calculated values
 */
export function calculateDopplerShift(
    satellite: SatelliteState,
    observer: ObserverPosition,
    baseFrequencyHz: number
): DopplerResult {
    // Convert observer position to ECF
    const observerECF = geodeticToECF(observer.latitude, observer.longitude, observer.altitude);

    // Calculate range vector (satellite - observer)
    const rangeVector = subtract(satellite.position, observerECF);

    // Calculate range (distance)
    const range = magnitude(rangeVector);
    const rangeKm = range / 1000;

    // Calculate unit range vector
    const rangeUnit = {
        x: rangeVector.x / range,
        y: rangeVector.y / range,
        z: rangeVector.z / range
    };

    // Calculate range rate (radial velocity)
    // Range rate = velocity dot unit_range_vector
    // Positive = moving away, Negative = approaching
    const rangeRate = dot(satellite.velocity, rangeUnit);

    // Calculate Doppler shift
    // Δf = -(v_r / c) × f_0
    // Negative because approaching (negative range rate) causes positive shift
    const dopplerShiftHz = -(rangeRate / SPEED_OF_LIGHT) * baseFrequencyHz;

    // Calculate received frequency
    const receivedFreqHz = baseFrequencyHz + dopplerShiftHz;

    // Calculate shift in parts per million
    const shiftPpm = (dopplerShiftHz / baseFrequencyHz) * 1_000_000;

    return {
        rangeKm,
        rangeRateMps: rangeRate,
        dopplerShiftHz,
        receivedFreqHz,
        shiftPpm,
        isApproaching: rangeRate < 0
    };
}

/**
 * Common satellite frequencies (in Hz)
 */
export const COMMON_FREQUENCIES = {
    ISS_VOICE: 145_800_000,        // ISS Voice Downlink - 145.800 MHz
    ISS_PACKET: 145_825_000,       // ISS APRS - 145.825 MHz
    NOAA_APT: 137_100_000,         // NOAA Weather Satellites - 137.1 MHz
    METEOR_LRPT: 137_900_000,      // Meteor-M2 - 137.9 MHz
    STARLINK_KU: 12_000_000_000,   // Starlink Ku-band - ~12 GHz
    GPS_L1: 1_575_420_000,         // GPS L1 - 1575.42 MHz
    IRIDIUM: 1_626_000_000,        // Iridium - 1626 MHz
};

/**
 * Format frequency for display
 */
export function formatFrequency(freqHz: number): string {
    if (freqHz >= 1_000_000_000) {
        return `${(freqHz / 1_000_000_000).toFixed(6)} GHz`;
    } else if (freqHz >= 1_000_000) {
        return `${(freqHz / 1_000_000).toFixed(6)} MHz`;
    } else if (freqHz >= 1_000) {
        return `${(freqHz / 1_000).toFixed(3)} kHz`;
    }
    return `${freqHz.toFixed(1)} Hz`;
}

/**
 * Format Doppler shift for display
 */
export function formatDopplerShift(shiftHz: number): string {
    const absShift = Math.abs(shiftHz);
    const sign = shiftHz >= 0 ? '+' : '-';

    if (absShift >= 1_000_000) {
        return `${sign}${(absShift / 1_000_000).toFixed(3)} MHz`;
    } else if (absShift >= 1_000) {
        return `${sign}${(absShift / 1_000).toFixed(3)} kHz`;
    }
    return `${sign}${absShift.toFixed(1)} Hz`;
}
