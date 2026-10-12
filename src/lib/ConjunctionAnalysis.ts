/**
 * Close-approach screening for one satellite against the catalog.
 *
 * This is a TLE-based screen, not an operational conjunction assessment:
 * TLE positions carry kilometre-level errors, so a reported miss distance of
 * 2 km means "worth a look", not "will collide". Operators use CDMs from
 * Space-Track/18 SDS with covariance for that.
 *
 * Pipeline
 * --------
 * 1. Apogee/perigee filter (Hoots et al. 1984): two orbits whose radial
 *    shells are further apart than the threshold can never meet.
 * 2. Coarse scan of the separation every `stepSeconds`, tracking local
 *    minima.
 * 3. Each minimum is refined with a golden-section search to ~0.1 s → TCA,
 *    miss distance and relative speed at TCA.
 *
 * References: Hoots, Crawford & Roehrich (1984), "An analytic method to
 * determine future close approaches between satellites", Celestial
 * Mechanics 33; Alfano & Negron (1993).
 */

import type { SatRec } from 'satellite.js';
import { stateAt, elementsFromSatrec, type Vec3 } from './orbit';

export type ObjectKind = 'payload' | 'debris' | 'rocket_body' | 'unknown';

export interface ScreeningObject {
    id: string;
    name: string;
    rec: SatRec;
}

export interface ConjunctionEvent {
    id: string;
    primaryObject: { name: string; noradId: string; type: ObjectKind };
    secondaryObject: { name: string; noradId: string; type: ObjectKind };
    tca: Date;
    minRangeKm: number;
    relativeVelocityKmS: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ScreeningOptions {
    start: Date;
    hours: number;
    thresholdKm: number;
    stepSeconds?: number;
}

export function classifyObject(name: string): ObjectKind {
    const n = name.toUpperCase();
    if (/\bDEB\b|DEBRIS/.test(n)) return 'debris';
    if (/\bR\/B\b|ROCKET BODY/.test(n)) return 'rocket_body';
    if (n.trim().length === 0) return 'unknown';
    return 'payload';
}

export function riskFromMissDistance(km: number): ConjunctionEvent['riskLevel'] {
    if (km < 1) return 'critical';
    if (km < 5) return 'high';
    if (km < 10) return 'medium';
    return 'low';
}

function shells(rec: SatRec) {
    const el = elementsFromSatrec(rec);
    return { perigee: el.perigeeAltKm, apogee: el.apogeeAltKm };
}

/** Apogee/perigee overlap test (both in km altitude). */
export function shellsOverlap(a: SatRec, b: SatRec, thresholdKm: number): boolean {
    const sa = shells(a);
    const sb = shells(b);
    return Math.max(sa.perigee, sb.perigee) - Math.min(sa.apogee, sb.apogee) <= thresholdKm;
}

function sep(a: Vec3, b: Vec3): number {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function separationAt(p: SatRec, s: SatRec, t: number): number {
    const d = new Date(t);
    const a = stateAt(p, d);
    const b = stateAt(s, d);
    if (!a || !b) return Infinity;
    return sep(a.positionEci, b.positionEci);
}

function refine(p: SatRec, s: SatRec, lo: number, hi: number): number {
    const g = (Math.sqrt(5) - 1) / 2;
    let c = hi - g * (hi - lo), d = lo + g * (hi - lo);
    let fc = separationAt(p, s, c), fd = separationAt(p, s, d);
    while (hi - lo > 100) {
        if (fc < fd) { hi = d; d = c; fd = fc; c = hi - g * (hi - lo); fc = separationAt(p, s, c); }
        else { lo = c; c = d; fc = fd; d = lo + g * (hi - lo); fd = separationAt(p, s, d); }
    }
    return (lo + hi) / 2;
}

export function screenConjunctions(
    primary: ScreeningObject,
    catalog: ScreeningObject[],
    opts: ScreeningOptions
): ConjunctionEvent[] {
    const step = (opts.stepSeconds ?? 60) * 1000;
    const t0 = opts.start.getTime();
    const t1 = t0 + opts.hours * 3600_000;
    const events: ConjunctionEvent[] = [];

    // Pre-compute primary positions once.
    const times: number[] = [];
    const prim: (Vec3 | null)[] = [];
    for (let t = t0; t <= t1; t += step) {
        times.push(t);
        prim.push(stateAt(primary.rec, new Date(t))?.positionEci ?? null);
    }

    // A minimum below the threshold can hide between samples; LEO relative
    // speeds reach ~15 km/s, so widen the gate by the distance covered in a step.
    const gate = opts.thresholdKm + 15 * (step / 1000);

    for (const obj of catalog) {
        if (obj.id === primary.id) continue;
        if (!shellsOverlap(primary.rec, obj.rec, opts.thresholdKm)) continue;

        let d2 = Infinity, d1 = Infinity;
        for (let i = 0; i < times.length; i++) {
            const p = prim[i];
            const st = p ? stateAt(obj.rec, new Date(times[i])) : null;
            const d = p && st ? sep(p, st.positionEci) : Infinity;

            // d1 is a local minimum if d2 > d1 <= d
            if (i >= 2 && d1 < d2 && d1 <= d && d1 < gate) {
                const tca = refine(primary.rec, obj.rec, times[i - 2], times[i]);
                const date = new Date(tca);
                const a = stateAt(primary.rec, date);
                const b = stateAt(obj.rec, date);
                if (a && b) {
                    const miss = sep(a.positionEci, b.positionEci);
                    if (miss <= opts.thresholdKm) {
                        events.push({
                            id: `${primary.id}-${obj.id}-${Math.round(tca / 1000)}`,
                            primaryObject: { name: primary.name, noradId: primary.id, type: classifyObject(primary.name) },
                            secondaryObject: { name: obj.name, noradId: obj.id, type: classifyObject(obj.name) },
                            tca: date,
                            minRangeKm: miss,
                            relativeVelocityKmS: sep(a.velocityEci, b.velocityEci),
                            riskLevel: riskFromMissDistance(miss),
                        });
                    }
                }
            }
            d2 = d1;
            d1 = d;
        }
    }

    return events.sort((x, y) => x.minRangeKm - y.minRangeKm);
}

/** Time from `now` to TCA as {hours, minutes}; negative values mean it has passed. */
export function timeToTCA(tca: Date, now: Date): { passed: boolean; days: number; hours: number; minutes: number } {
    const ms = tca.getTime() - now.getTime();
    const abs = Math.abs(ms);
    const totalMin = Math.floor(abs / 60_000);
    return {
        passed: ms < 0,
        days: Math.floor(totalMin / 1440),
        hours: Math.floor((totalMin % 1440) / 60),
        minutes: totalMin % 60,
    };
}

export function getRiskColor(level: ConjunctionEvent['riskLevel']): string {
    switch (level) {
        case 'critical': return '#d9534f';
        case 'high': return '#e07b39';
        case 'medium': return '#f2a33a';
        case 'low': return '#8d9097';
    }
}
