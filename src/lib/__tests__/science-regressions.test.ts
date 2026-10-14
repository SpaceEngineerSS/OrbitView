/**
 * Regression tests for the v4 science fixes. Each block pins down a bug that
 * existed in v3 and would have been caught by the check below.
 */
import * as satellite from 'satellite.js';
import { calculateGMST, ecfToGeodetic, geodeticToEcf } from '../CoordinateConverter';
import { computeDoppler } from '../DopplerCalculator';
import { getSatrec, stateAt, lookAngles, elementsFromTLE } from '../orbit';
import { predictPassesForSatrec } from '../PassPrediction';
import { parseBStar, predictOrbitalDecay, riskFromLifetime } from '../OrbitalDecay';
import { calculateSunPosition, isSatelliteSunlit, shadowState } from '../CoordinateConverter';
import { screenConjunctions, shellsOverlap } from '../ConjunctionAnalysis';

const ISS1 = '1 25544U 98067A   23351.58334491  .00016717  00000-0  30142-3 0  9999';
const ISS2 = '2 25544  51.6416 250.7541 0004124 163.7645 282.8447 15.49520176430335';
const EPOCH = new Date('2023-12-17T14:00:00Z');
const ISTANBUL = { latitude: 41.0082, longitude: 28.9784, altitude: 40 };

describe('GMST (v3 counted the time of day twice)', () => {
    it('matches satellite.gstime across a whole UTC day', () => {
        for (let h = 0; h < 24; h += 0.5) {
            const d = new Date(Date.UTC(2026, 9, 12) + h * 3600_000);
            expect(calculateGMST(d)).toBeCloseTo(satellite.gstime(d), 12);
        }
    });
});

describe('Geodetic conversion is stable at the poles', () => {
    it('round-trips at 89.9999° and 90°', () => {
        for (const lat of [89.9999, 90, -90]) {
            const ecf = geodeticToEcf({ latitude: lat, longitude: 10, altitude: 400 });
            const back = ecfToGeodetic(ecf);
            expect(back.altitude).toBeCloseTo(400, 3);
            expect(Math.abs(back.latitude)).toBeCloseTo(Math.abs(lat), 4);
        }
    });
});

describe('Doppler uses the Earth-fixed velocity (v3 omitted ω × r)', () => {
    const rec = getSatrec(ISS1, ISS2);

    it('range rate equals the numerical derivative of the range', () => {
        for (let k = 0; k < 20; k++) {
            const t = EPOCH.getTime() + k * 7 * 60_000;
            const h = 0.5;
            const r = (ms: number) => lookAngles(stateAt(rec, new Date(ms))!, ISTANBUL).rangeKm;
            const numeric = (r(t + h * 1000) - r(t - h * 1000)) / (2 * h); // km/s
            const res = computeDoppler(rec, new Date(t), ISTANBUL, 145_800_000)!;
            expect(res.rangeRateMps / 1000).toBeCloseTo(numeric, 3); // < 1 m/s
        }
    });

    it('a geostationary satellite shows almost no Doppler', () => {
        // Turksat 4A-like GEO element set
        const geo = getSatrec(
            '1 39522U 14007A   23351.50000000  .00000136  00000-0  00000-0 0  9991',
            '2 39522   0.0300  91.5000 0003000 250.0000 200.0000  1.00270000 36001'
        );
        const res = computeDoppler(geo, EPOCH, ISTANBUL, 12_000_000_000)!;
        // Rotating-only velocity would give ~3 km/s → ~100 kHz. Real value: a few m/s.
        expect(Math.abs(res.rangeRateMps)).toBeLessThan(20);
    });

    it('reports elevation and horizon status', () => {
        const res = computeDoppler(rec, EPOCH, ISTANBUL, 145_800_000)!;
        expect(res.elevationDeg).toBeGreaterThanOrEqual(-90);
        expect(res.elevationDeg).toBeLessThanOrEqual(90);
        expect(res.aboveHorizon).toBe(res.elevationDeg > 0);
    });
});

describe('Pass prediction', () => {
    const rec = getSatrec(ISS1, ISS2);
    const start = new Date('2023-12-17T12:00:00Z');
    const end = new Date('2023-12-18T12:00:00Z');
    const passes = predictPassesForSatrec(rec, ISTANBUL, start, end, 10);

    const elAt = (ms: number) => lookAngles(stateAt(rec, new Date(ms))!, ISTANBUL).elevationDeg;

    it('finds passes and AOS/LOS agree with a 1-second brute-force scan to ±2 s', () => {
        expect(passes.length).toBeGreaterThan(0);
        for (const p of passes) {
            if (p.startsBeforeWindow || p.endsAfterWindow) continue;
            let aos = NaN, los = NaN;
            for (let t = p.aosTime.getTime() - 120_000; t <= p.losTime.getTime() + 120_000; t += 1000) {
                const above = elAt(t) >= 10;
                if (above && Number.isNaN(aos)) aos = t;
                if (!above && !Number.isNaN(aos) && Number.isNaN(los)) los = t;
            }
            expect(Math.abs(aos - p.aosTime.getTime())).toBeLessThanOrEqual(2000);
            expect(Math.abs(los - p.losTime.getTime())).toBeLessThanOrEqual(2000);
        }
    });

    it('max elevation is the true culmination (no sample is higher)', () => {
        for (const p of passes) {
            for (let t = p.aosTime.getTime(); t <= p.losTime.getTime(); t += 5000) {
                expect(elAt(t)).toBeLessThanOrEqual(p.maxElevation + 0.01);
            }
        }
    });

    it('flags a pass already in progress at the window start', () => {
        const p = passes.find((x) => !x.startsBeforeWindow)!;
        const mid = new Date((p.aosTime.getTime() + p.losTime.getTime()) / 2);
        const res = predictPassesForSatrec(rec, ISTANBUL, mid, new Date(mid.getTime() + 3600_000), 10);
        expect(res[0].startsBeforeWindow).toBe(true);
        expect(res[0].aosTime.getTime()).toBe(mid.getTime());
    });

    it('follows a pass that is still in progress at the window end to its real LOS', () => {
        const p = passes.find((x) => !x.startsBeforeWindow && !x.endsAfterWindow)!;
        const cut = new Date(p.aosTime.getTime() + 30_000);
        const res = predictPassesForSatrec(rec, ISTANBUL, new Date(p.aosTime.getTime() - 600_000), cut, 10);
        const last = res[res.length - 1];
        expect(last.endsAfterWindow).toBe(true);
        expect(Math.abs(last.losTime.getTime() - p.losTime.getTime())).toBeLessThan(2000);
    });
});

describe('Pass visibility covers the whole pass, not only culmination', () => {
    const rec = getSatrec(ISS1, ISS2);
    const sunlitInDarkSky = (t: number) => {
        const d = new Date(t);
        const s = stateAt(rec, d)!;
        const sun = calculateSunPosition(d);
        const sunEl = lookAngles({ positionEcf: sun, velocityEcf: { x: 0, y: 0, z: 0 } }, ISTANBUL).elevationDeg;
        return isSatelliteSunlit(s.positionEcf, sun) && sunEl < -6;
    };

    it('agrees with a 5-second scan of every pass over three days', () => {
        const passes = predictPassesForSatrec(rec, ISTANBUL, EPOCH, new Date(EPOCH.getTime() + 3 * 86400_000), 10);
        let partial = 0;
        for (const p of passes) {
            const a = p.aosTime.getTime(), b = p.losTime.getTime();
            const flags: boolean[] = [];
            for (let t = a; t <= b; t += 5000) flags.push(sunlitInDarkSky(t));
            const any = flags.some(Boolean);
            // A sunlit stretch shorter than the 30 s step may be missed; nothing else.
            const sunlitSeconds = flags.filter(Boolean).length * 5;
            if (sunlitSeconds > 30) expect(p.visible).toBe(true);
            if (p.visible) expect(any).toBe(true);
            if (any && !sunlitInDarkSky(p.maxElevationTime.getTime())) partial++;
        }
        // The case v4.0 missed: sunlit part of the pass, but not at the peak.
        expect(partial).toBeGreaterThan(0);
    });
});

describe('Earth shadow is a cone with a penumbra (v4.0 used a cylinder)', () => {
    const sun = calculateSunPosition(new Date('2026-03-20T12:00:00Z'));
    const rs = Math.hypot(sun.x, sun.y, sun.z);
    const u = { x: sun.x / rs, y: sun.y / rs, z: sun.z / rs };
    // A unit vector perpendicular to the Sun direction
    const n0 = Math.hypot(u.y, u.x);
    const perp = { x: -u.y / n0, y: u.x / n0, z: 0 };
    const at = (behindKm: number, offKm: number) => ({
        x: -u.x * behindKm + perp.x * offKm, y: -u.y * behindKm + perp.y * offKm, z: -u.z * behindKm + perp.z * offKm,
    });

    it('classifies day side, umbra and penumbra', () => {
        expect(shadowState({ x: u.x * 6800, y: u.y * 6800, z: u.z * 6800 }, sun)).toBe('sunlit');
        expect(shadowState(at(6800, 0), sun)).toBe('umbra');
        // Behind the Earth the umbra narrows and the penumbra widens: at GEO
        // distance their radii are about 6,184 and 6,576 km (Earth: 6,378).
        expect(shadowState(at(42164, 6378.137 - 100), sun)).toBe('penumbra');
        expect(shadowState(at(42164, 6378.137 + 100), sun)).toBe('penumbra');
        expect(shadowState(at(42164, 6378.137 - 250), sun)).toBe('umbra');
        expect(shadowState(at(42164, 6378.137 + 250), sun)).toBe('sunlit');
    });

    it('gives the ISS the expected umbra: a few seconds shorter than the cylinder', () => {
        const rec = getSatrec(ISS1, ISS2);
        let inUmbra = 0, inCylinder = 0;
        for (let t = EPOCH.getTime(); t < EPOCH.getTime() + 93 * 60_000; t += 1000) {
            const d = new Date(t);
            const p = stateAt(rec, d)!.positionEcf;
            const s = calculateSunPosition(d);
            if (shadowState(p, s) === 'umbra') inUmbra++;
            const sr = Math.hypot(s.x, s.y, s.z), along = (p.x * s.x + p.y * s.y + p.z * s.z) / sr;
            if (along < 0 && p.x ** 2 + p.y ** 2 + p.z ** 2 - along ** 2 <= 6378.137 ** 2) inCylinder++;
        }
        expect(inUmbra).toBeGreaterThan(30 * 60);          // ~35 min of an orbit
        expect(inCylinder - inUmbra).toBeGreaterThan(2);
        expect(inCylinder - inUmbra).toBeLessThan(20);
        expect(isSatelliteSunlit(at(6800, 6378.137 - 3), sun)).toBe(true); // penumbra counts as lit
    });

    it('eclipses a geostationary satellite for about 70 minutes at equinox', () => {
        // Equatorial GEO, followed for a day around the March equinox
        let minutes = 0;
        for (let t = Date.UTC(2026, 2, 20); t < Date.UTC(2026, 2, 21); t += 60_000) {
            const d = new Date(t);
            const s = calculateSunPosition(d);
            // Fixed Earth-fixed point on the equator at GEO radius, longitude 0
            if (shadowState({ x: 42164, y: 0, z: 0 }, s) === 'umbra') minutes++;
        }
        expect(minutes).toBeGreaterThan(60);
        expect(minutes).toBeLessThan(75);
    });
});

describe('Short passes between two scan samples are found', () => {
    it('finds every pass a 2-second scan finds (ISS, 20° mask, 2 days, any scan phase)', () => {
        const rec = getSatrec(ISS1, ISS2);
        const t0 = EPOCH.getTime(), t1 = t0 + 2 * 86_400_000, mask = 20;
        const brute: number[] = [];
        let above = false, rise = 0;
        for (let t = t0; t <= t1; t += 2000) {
            const s = stateAt(rec, new Date(t));
            const el = s ? lookAngles(s, ISTANBUL).elevationDeg : -90;
            if (el >= mask && !above) { above = true; rise = t; }
            if (el < mask && above) { above = false; if (t - rise >= 4000) brute.push(rise); }
        }
        expect(brute.length).toBeGreaterThan(5);
        // The scan starts at different phases, so a short pass can't hide
        // behind a lucky alignment of the 60 s samples.
        for (const offset of [0, 15_000, 30_000, 45_000]) {
            const passes = predictPassesForSatrec(rec, ISTANBUL, new Date(t0 + offset), new Date(t1), mask);
            for (const r of brute.filter((b) => b > t0 + offset + 120_000)) {
                expect(passes.some((p) => Math.abs(p.aosTime.getTime() - r) <= 3000)).toBe(true);
            }
        }
    });
});

describe('Orbital elements come from the mean motion, not the instantaneous radius', () => {
    it('ISS period and inclination', () => {
        const el = elementsFromTLE(ISS1, ISS2);
        expect(el.periodMin).toBeCloseTo(1440 / 15.4952, 1);
        expect(el.inclinationDeg).toBeCloseTo(51.6416, 3);
        expect(el.perigeeAltKm).toBeGreaterThan(400);
        expect(el.apogeeAltKm).toBeLessThan(440);
        expect(el.epoch.toISOString().startsWith('2023-12-17')).toBe(true);
    });
});

describe('Orbital lifetime', () => {
    it('parses B* exactly', () => {
        expect(parseBStar(ISS1)).toBeCloseTo(0.30142e-3, 10);
        expect(parseBStar('1 00000U 00000A   00000.00000000  .00000000  00000-0 -11606-4 0  0000')).toBeCloseTo(-0.11606e-4, 12);
        expect(parseBStar('1 00000U 00000A   00000.00000000  .00000000  00000-0  garbage 0  0000')).toBe(0);
    });

    it('ISS-like orbit decays in months to a few years, with a range around it', () => {
        const el = elementsFromTLE(ISS1, ISS2);
        const d = predictOrbitalDecay(el.semiMajorAxisKm, el.eccentricity, el.bstar, EPOCH);
        expect(d.estimatedLifetimeDays).toBeGreaterThan(60);
        expect(d.estimatedLifetimeDays).toBeLessThan(5 * 365);
        expect(d.lifetimeRangeDays.min).toBeLessThan(d.estimatedLifetimeDays);
        expect(d.lifetimeRangeDays.max).toBeGreaterThan(d.estimatedLifetimeDays);
    });

    it('lower perigee → shorter life; negligible B* → drag unknown; high orbit → beyond horizon', () => {
        const low = predictOrbitalDecay(6378 + 250, 0.001, 3e-4);
        const high = predictOrbitalDecay(6378 + 400, 0.001, 3e-4);
        expect(low.estimatedLifetimeDays).toBeLessThan(high.estimatedLifetimeDays);
        expect(predictOrbitalDecay(6378 + 400, 0, 0).dragUnknown).toBe(true);
        expect(predictOrbitalDecay(6378 + 1200, 0, 1e-5).beyondHorizon).toBe(true);
    });
});

describe('Lifetime badge follows the lifetime, not the perigee height', () => {
    it('maps weeks, months, years and long-lived', () => {
        expect(riskFromLifetime(10)).toBe('critical');
        expect(riskFromLifetime(200)).toBe('high');
        expect(riskFromLifetime(5 * 365)).toBe('medium');
        expect(riskFromLifetime(Infinity)).toBe('low');
    });
});

describe('Conjunction screening', () => {
    const rec = getSatrec(ISS1, ISS2);
    // Same orbit, 0.01° behind in mean anomaly → a constant ~1.2 km separation.
    const twin = getSatrec(
        '1 99999U 98067A   23351.58334491  .00016717  00000-0  30142-3 0  9999',
        '2 99999  51.6416 250.7541 0004124 163.7645 282.8347 15.49520176430335'
    );
    const geo = getSatrec(
        '1 39522U 14007A   23351.50000000  .00000136  00000-0  00000-0 0  9991',
        '2 39522   0.0300  91.5000 0003000 250.0000 200.0000  1.00270000 36001'
    );

    it('apogee/perigee filter rejects orbits that can never meet', () => {
        expect(shellsOverlap(rec, geo, 10)).toBe(false);
        expect(shellsOverlap(rec, twin, 10)).toBe(true);
    });

    it('finds the close neighbour with a refined miss distance under the threshold', () => {
        const events = screenConjunctions(
            { id: '25544', name: 'ISS (ZARYA)', rec },
            [{ id: '99999', name: 'TWIN', rec: twin }, { id: '39522', name: 'GEO', rec: geo }],
            { start: EPOCH, hours: 3, thresholdKm: 5 }
        );
        expect(events.length).toBeGreaterThan(0);
        for (const e of events) {
            expect(e.secondaryObject.noradId).toBe('99999');
            expect(e.minRangeKm).toBeLessThan(5);
        }
    });
});
