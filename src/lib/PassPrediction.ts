/**
 * Satellite pass prediction.
 *
 * A pass is the interval during which the satellite is above `minElevation`
 * for a ground observer.
 *
 * Method
 * ------
 * 1. Scan the window with a coarse step (default 60 s; LEO passes last
 *    several minutes, so none is skipped above ~10°).
 * 2. When the sign of (elevation − minElevation) changes between two samples,
 *    bisect that interval down to 0.5 s to get AOS / LOS.
 * 3. Find the culmination with a golden-section search between AOS and LOS.
 *
 * A pass already in progress at `startTime` is reported with
 * `startsBeforeWindow = true`; one still in progress at `endTime` is followed
 * to its real LOS (up to 6 h past the window). An object that never sets
 * (e.g. a GEO satellite in view) is reported as a single pass covering the
 * window with both flags set.
 *
 * Visibility (optical): the satellite is sunlit and the observer's sun
 * elevation is below −6° (civil twilight) at culmination.
 *
 * References: Vallado (2013) ch. 11; Kelso, "Predicting Satellite Visibility",
 * Satellite Times 2(6), 1996. Refraction is not modelled.
 */

import type { SatRec } from 'satellite.js';
import { getSatrec, stateAt, lookAngles, type ObserverGeodetic } from './orbit';
import { calculateSunPosition, isSatelliteSunlit } from './CoordinateConverter';

export interface SatellitePass {
    aosTime: Date;
    losTime: Date;
    maxElevationTime: Date;
    maxElevation: number;   // deg
    duration: number;       // s
    azimuthAOS: number;     // deg
    azimuthLOS: number;     // deg
    azimuthMax: number;     // deg
    visible: boolean;       // sunlit satellite + dark sky at culmination
    startsBeforeWindow: boolean;
    endsAfterWindow: boolean;
}

/** Altitude in metres above the ellipsoid. */
export type ObserverLocation = ObserverGeodetic;

interface Sample { el: number; az: number }

function sample(rec: SatRec, obs: ObserverLocation, t: number): Sample | null {
    const s = stateAt(rec, new Date(t));
    if (!s) return null;
    const look = lookAngles(s, obs);
    return { el: look.elevationDeg, az: look.azimuthDeg };
}

/** Bisect between t0 (state a) and t1 (state !a) to the threshold crossing. */
function bisect(rec: SatRec, obs: ObserverLocation, t0: number, t1: number, minEl: number): number {
    const above0 = (sample(rec, obs, t0)?.el ?? -90) >= minEl;
    let lo = t0, hi = t1;
    while (hi - lo > 500) {
        const mid = (lo + hi) / 2;
        const aboveMid = (sample(rec, obs, mid)?.el ?? -90) >= minEl;
        if (aboveMid === above0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
}

/** Golden-section search for the elevation maximum on [a, b]. */
function culminate(rec: SatRec, obs: ObserverLocation, a: number, b: number): number {
    const g = (Math.sqrt(5) - 1) / 2;
    let c = b - g * (b - a);
    let d = a + g * (b - a);
    let fc = sample(rec, obs, c)?.el ?? -90;
    let fd = sample(rec, obs, d)?.el ?? -90;
    while (b - a > 500) {
        if (fc > fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = sample(rec, obs, c)?.el ?? -90; }
        else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = sample(rec, obs, d)?.el ?? -90; }
    }
    return (a + b) / 2;
}

function isVisibleAt(rec: SatRec, obs: ObserverLocation, t: number): boolean {
    const date = new Date(t);
    const s = stateAt(rec, date);
    if (!s) return false;
    const sunEcf = calculateSunPosition(date);
    const sunlit = isSatelliteSunlit(s.positionEcf, sunEcf);
    const sunLook = lookAngles({ positionEcf: sunEcf, velocityEcf: { x: 0, y: 0, z: 0 } }, obs);
    return sunlit && sunLook.elevationDeg < -6;
}

const MAX_OVERRUN_MS = 6 * 3600_000;

export function predictPassesForSatrec(
    rec: SatRec,
    observer: ObserverLocation,
    startTime: Date,
    endTime: Date,
    minElevation = 10,
    stepSeconds = 60
): SatellitePass[] {
    const passes: SatellitePass[] = [];
    const start = startTime.getTime();
    const end = endTime.getTime();
    const step = stepSeconds * 1000;

    let prevT = start;
    let prev = sample(rec, observer, start);
    let aos: number | null = prev && prev.el >= minElevation ? start : null;
    const startsBefore = aos !== null;

    const close = (los: number, endsAfter: boolean) => {
        const a = aos!;
        const tMax = culminate(rec, observer, a, los);
        const atAos = sample(rec, observer, a);
        const atLos = sample(rec, observer, los);
        const atMax = sample(rec, observer, tMax);
        passes.push({
            aosTime: new Date(a),
            losTime: new Date(los),
            maxElevationTime: new Date(tMax),
            maxElevation: atMax?.el ?? minElevation,
            duration: (los - a) / 1000,
            azimuthAOS: atAos?.az ?? 0,
            azimuthLOS: atLos?.az ?? 0,
            azimuthMax: atMax?.az ?? 0,
            visible: isVisibleAt(rec, observer, tMax),
            startsBeforeWindow: a === start && startsBefore && passes.length === 0,
            endsAfterWindow: endsAfter,
        });
        aos = null;
    };

    for (let t = start + step; ; t += step) {
        // Once the previous sample is past the window we only keep stepping
        // to finish a pass that is in progress.
        if (prevT >= end && (aos === null || t > end + MAX_OVERRUN_MS)) break;

        const cur = sample(rec, observer, t);
        if (cur && prev) {
            const wasAbove = prev.el >= minElevation;
            const isAbove = cur.el >= minElevation;
            if (!wasAbove && isAbove) {
                const rise = bisect(rec, observer, prevT, t, minElevation);
                if (rise <= end) aos = rise;
            } else if (wasAbove && !isAbove && aos !== null) {
                const set = bisect(rec, observer, prevT, t, minElevation);
                close(set, set > end);
            }
        }
        prev = cur;
        prevT = t;
    }

    // Never set within window + overrun: geostationary-like.
    if (aos !== null) close(Math.min(prevT, end + MAX_OVERRUN_MS), true);

    return passes;
}

/** Convenience wrapper taking TLE lines. */
export function predictPasses(
    satData: { line1: string; line2: string },
    observer: ObserverLocation,
    startTime: Date,
    endTime: Date,
    minElevation = 10
): SatellitePass[] {
    return predictPassesForSatrec(getSatrec(satData.line1, satData.line2), observer, startTime, endTime, minElevation);
}

/** Current azimuth / elevation / range for a satellite. Altitude of observer in metres. */
export function getLookAngles(
    satData: { line1: string; line2: string },
    observer: ObserverLocation,
    time: Date
): { azimuth: number; elevation: number; range: number } | null {
    const s = stateAt(getSatrec(satData.line1, satData.line2), time);
    if (!s) return null;
    const look = lookAngles(s, observer);
    return { azimuth: look.azimuthDeg, elevation: look.elevationDeg, range: look.rangeKm };
}
