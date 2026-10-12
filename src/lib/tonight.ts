/**
 * "Tonight": the visible passes of bright objects during the observer's next
 * dark period.
 *
 * The night is the interval where the Sun is more than 6° below the horizon
 * (civil twilight has ended). If it is dark now, the window starts now;
 * otherwise it starts at the coming dusk. Edges are found by a 10-minute scan
 * and refined to about 10 s by bisection.
 */

import type { SatRec } from 'satellite.js';
import { lookAngles, type ObserverGeodetic } from './orbit';
import { calculateSunPosition } from './CoordinateConverter';
import { predictPassesForSatrec, type SatellitePass } from './PassPrediction';

const DARK_DEG = -6;
const STEP = 10 * 60_000;
const ZERO = { x: 0, y: 0, z: 0 };

export function sunElevation(obs: ObserverGeodetic, t: number): number {
    return lookAngles({ positionEcf: calculateSunPosition(new Date(t)), velocityEcf: ZERO }, obs).elevationDeg;
}

const isDark = (obs: ObserverGeodetic, t: number) => sunElevation(obs, t) < DARK_DEG;

function edge(obs: ObserverGeodetic, a: number, b: number): number {
    const darkA = isDark(obs, a);
    while (b - a > 10_000) {
        const m = (a + b) / 2;
        if (isDark(obs, m) === darkA) a = m; else b = m;
    }
    return (a + b) / 2;
}

/**
 * Next dark window from `from`, or null if there is none within 36 h
 * (polar summer).
 */
export function nightWindow(obs: ObserverGeodetic, from: number): { start: number; end: number } | null {
    const limit = from + 36 * 3600_000;
    let start: number | null = isDark(obs, from) ? from : null;
    let prev = from;
    for (let t = from + STEP; t <= limit; t += STEP) {
        const dark = isDark(obs, t);
        if (start === null && dark) start = edge(obs, prev, t);
        else if (start !== null && !dark) return { start, end: edge(obs, prev, t) };
        prev = t;
    }
    return start !== null ? { start, end: limit } : null;
}

export interface TonightPass extends SatellitePass {
    id: string;
    name: string;
}

/** Visible passes of the given objects inside the window, in time order. */
export function tonightPasses(
    objects: { id: string; name: string; rec: SatRec }[],
    obs: ObserverGeodetic,
    window: { start: number; end: number },
    minElevation = 10
): TonightPass[] {
    const out: TonightPass[] = [];
    for (const o of objects) {
        const passes = predictPassesForSatrec(o.rec, obs, new Date(window.start), new Date(window.end), minElevation);
        for (const p of passes) if (p.visible) out.push({ ...p, id: o.id, name: o.name });
    }
    return out.sort((a, b) => a.aosTime.getTime() - b.aosTime.getTime());
}
