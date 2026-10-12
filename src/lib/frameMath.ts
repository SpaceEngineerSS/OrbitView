/**
 * The frame worker's inner loop, kept here so it can be tested without a
 * worker. See satellite.worker.ts.
 */

import * as satellite from 'satellite.js';

/**
 * Earth-fixed positions (metres) for `list` (indices into `records`) at one
 * instant, written to `out[i*3 .. i*3+2]`. Failures become NaN.
 * The Julian date and sidereal rotation are computed once, not per object.
 * @returns how many objects failed to propagate
 */
export function propagateInto(out: Float32Array, list: ArrayLike<number>, records: satellite.SatRec[], date: Date): number {
    const jd = satellite.jday(date);
    const gmst = satellite.gstime(jd);
    const c = Math.cos(gmst), s = Math.sin(gmst);
    let failed = 0;
    for (let k = 0; k < list.length; k++) {
        const i = list[k];
        const rec = records[i];
        const o = i * 3;
        const pv = rec ? satellite.sgp4(rec, (jd - rec.jdsatepoch) * 1440) : null;
        const p = pv?.position;
        if (!p || rec.error || !(p.x === p.x)) {
            out[o] = NaN; out[o + 1] = NaN; out[o + 2] = NaN;
            failed++;
            continue;
        }
        out[o] = (c * p.x + s * p.y) * 1000;
        out[o + 1] = (-s * p.x + c * p.y) * 1000;
        out[o + 2] = p.z * 1000;
    }
    return failed;
}

export interface FrameRateInput {
    playing: boolean;
    multiplier: number;
    /** Camera height above the ellipsoid, metres */
    cameraHeight: number;
    lowPower: boolean;
}

/**
 * How often to recompute positions, in ms; 0 = only when something changes.
 *
 * Seen from 20,000 km, a LEO satellite at ×1 crosses about 2–3 pixels a
 * second, so two updates a second look continuous. Closer in, or with time
 * running faster, objects move further per second on screen and need more.
 */
export function frameInterval({ playing, multiplier, cameraHeight, lowPower }: FrameRateInput): number {
    if (!playing) return 0;
    const close = cameraHeight < 4_000_000;
    let ms: number;
    if (multiplier >= 60) ms = 66;
    else if (multiplier >= 10) ms = close ? 66 : 150;
    else ms = close ? 100 : 500;
    if (lowPower) ms = Math.max(ms, close || multiplier >= 10 ? 200 : 500);
    return ms;
}
