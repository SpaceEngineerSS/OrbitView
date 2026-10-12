/**
 * Orbital lifetime estimate from the TLE drag term.
 *
 * This is a rough estimate, not a reentry prediction. It answers "weeks,
 * months or decades?" and shows how wide the uncertainty is.
 *
 * Model
 * -----
 * Ballistic coefficient from B* (Hoots & Roehrich 1980, Vallado 2013 §9.7):
 *     B* = ρ₀·B / 2,   ρ₀ = 0.15696615 kg·m⁻²·ER   →   B = C_D·A/m = 2·B* ÷ ρ₀  [m²/kg]
 *
 * Near-circular decay under drag (King-Hele 1987):
 *     da/dt = −B · ρ(h) · √(μ·a)
 *
 * For eccentric orbits drag acts mostly near perigee, so the decay is driven
 * by the perigee altitude. We integrate on h = perigee altitude, which is
 * pessimistic for e > 0.05 (the apogee drops first in reality).
 *
 * Density: exponential atmosphere, Vallado (2013) Table 8-4 (CIRA-72 based),
 * all 28 bands. Solar activity changes thermospheric density by roughly
 * ×0.5–×2 over a cycle, so the result is reported as a range
 * [ρ×2 → short, ρ×0.5 → long] around the nominal value.
 *
 * B* from TLE fitting is noisy and sometimes negative; |B*| is used and a
 * B* below 1e-7 is treated as "drag not measurable".
 */

export const MU_M3_S2 = 3.986004418e14;
const EARTH_RADIUS_KM = 6378.137;
const RHO0_BSTAR = 0.15696615;          // kg·m⁻²·ER (SGP4 reference)
const REENTRY_ALT_KM = 120;
const SECONDS_PER_DAY = 86_400;

/** Simulation horizon. Anything longer is reported as "> 25 years". */
export const DECAY_HORIZON_DAYS = 25 * 365.25;

/** Vallado (2013) Table 8-4: base altitude (km), base density (kg/m³), scale height (km). */
const DENSITY_TABLE: ReadonlyArray<readonly [number, number, number]> = [
    [0, 1.225, 7.249],
    [25, 3.899e-2, 6.349],
    [30, 1.774e-2, 6.682],
    [40, 3.972e-3, 7.554],
    [50, 1.057e-3, 8.382],
    [60, 3.206e-4, 7.714],
    [70, 8.770e-5, 6.549],
    [80, 1.905e-5, 5.799],
    [90, 3.396e-6, 5.382],
    [100, 5.297e-7, 5.877],
    [110, 9.661e-8, 7.263],
    [120, 2.438e-8, 9.473],
    [130, 8.484e-9, 12.636],
    [140, 3.845e-9, 16.149],
    [150, 2.070e-9, 22.523],
    [180, 5.464e-10, 29.740],
    [200, 2.789e-10, 37.105],
    [250, 7.248e-11, 45.546],
    [300, 2.418e-11, 53.628],
    [350, 9.518e-12, 53.298],
    [400, 3.725e-12, 58.515],
    [450, 1.585e-12, 60.828],
    [500, 6.967e-13, 63.822],
    [600, 1.454e-13, 71.835],
    [700, 3.614e-14, 88.667],
    [800, 1.170e-14, 124.64],
    [900, 5.245e-15, 181.05],
    [1000, 3.019e-15, 268.00],
];

/** Atmospheric density, kg/m³. */
export function getAtmosphericDensity(altitudeKm: number): number {
    if (!Number.isFinite(altitudeKm)) return 0;
    if (altitudeKm < 0) return DENSITY_TABLE[0][1];
    let row = DENSITY_TABLE[0];
    for (let i = DENSITY_TABLE.length - 1; i >= 0; i--) {
        if (altitudeKm >= DENSITY_TABLE[i][0]) { row = DENSITY_TABLE[i]; break; }
    }
    const [h0, rho0, H] = row;
    return rho0 * Math.exp(-(altitudeKm - h0) / H);
}

/**
 * Parse B* from TLE line 1, columns 54–61 (assumed-decimal mantissa + exponent).
 * " 34123-4" → 0.34123e-4. Returns 0 for a blank or malformed field.
 */
export function parseBStar(tleLine1: string): number {
    const field = tleLine1.substring(53, 61);
    const m = /^\s*([+-]?)(\d{1,5})\s*([+-])\s*(\d)\s*$/.exec(field);
    if (!m) return 0;
    const mantissa = parseFloat(`0.${m[2].padStart(5, '0')}`) * (m[1] === '-' ? -1 : 1);
    const exponent = parseInt(m[4], 10) * (m[3] === '-' ? -1 : 1);
    return mantissa * Math.pow(10, exponent);
}

/** Ballistic coefficient C_D·A/m in m²/kg from B* (1/ER). */
export function ballisticCoefficientFromBStar(bstar: number): number {
    return (2 * Math.abs(bstar)) / RHO0_BSTAR;
}

export interface DecayPrediction {
    perigeeAltitudeKm: number;
    currentDensity: number;           // kg/m³ at perigee
    ballisticCoefficient: number;     // m²/kg
    decayRateKmPerDay: number;        // nominal, at the current altitude
    /** Nominal lifetime in days; Infinity if beyond the horizon */
    estimatedLifetimeDays: number;
    /** Range from solar activity: ρ×2 (short) … ρ×0.5 (long). Infinity = beyond horizon */
    lifetimeRangeDays: { min: number; max: number };
    estimatedReentryDate: Date | null;
    altitudeHistory: { days: number; altitude: number }[];
    beyondHorizon: boolean;
    /** B* too small or zero: drag is not measurable from this TLE */
    dragUnknown: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

function decayRate(hKm: number, B: number, densityScale: number): number {
    const a = (EARTH_RADIUS_KM + hKm) * 1000;
    const rho = getAtmosphericDensity(hKm) * densityScale;
    return B * rho * Math.sqrt(MU_M3_S2 * a) * SECONDS_PER_DAY / 1000; // km/day
}

/** Integrate h(t) down to the reentry altitude with an adaptive step. */
function integrate(h0: number, B: number, densityScale: number, record: boolean) {
    const history: { days: number; altitude: number }[] = [];
    let h = h0;
    let t = 0;
    let nextRecord = 0;
    while (h > REENTRY_ALT_KM && t < DECAY_HORIZON_DAYS) {
        if (record && t >= nextRecord) {
            history.push({ days: t, altitude: h });
            nextRecord = t + Math.max(1, t / 50);
        }
        const rate = decayRate(h, B, densityScale);
        if (rate <= 0) { t = DECAY_HORIZON_DAYS; break; }
        // Keep each step to ≤0.5 km of altitude loss, ≤ 30 days.
        const dt = Math.min(30, Math.max(1 / 1440, 0.5 / rate));
        h -= rate * dt;
        t += dt;
    }
    if (record) history.push({ days: Math.min(t, DECAY_HORIZON_DAYS), altitude: Math.max(h, REENTRY_ALT_KM) });
    return { days: h <= REENTRY_ALT_KM ? t : Infinity, history };
}

/**
 * @param semiMajorAxisKm  mean semi-major axis (from TLE mean motion)
 * @param eccentricity     mean eccentricity
 * @param bstar            SGP4 B* (1/ER)
 */
export function predictOrbitalDecay(
    semiMajorAxisKm: number,
    eccentricity: number,
    bstar: number,
    currentDate: Date = new Date()
): DecayPrediction {
    const perigee = semiMajorAxisKm * (1 - Math.max(0, eccentricity)) - EARTH_RADIUS_KM;
    const B = ballisticCoefficientFromBStar(bstar);
    const dragUnknown = !(Math.abs(bstar) >= 1e-7);

    if (dragUnknown) {
        return {
            perigeeAltitudeKm: perigee,
            currentDensity: getAtmosphericDensity(perigee),
            ballisticCoefficient: B,
            decayRateKmPerDay: 0,
            estimatedLifetimeDays: Infinity,
            lifetimeRangeDays: { min: Infinity, max: Infinity },
            estimatedReentryDate: null,
            altitudeHistory: [],
            beyondHorizon: true,
            dragUnknown: true,
            riskLevel: 'low',
        };
    }

    const nominal = integrate(perigee, B, 1, true);
    const short = integrate(perigee, B, 2, false);
    const long = integrate(perigee, B, 0.5, false);

    return {
        perigeeAltitudeKm: perigee,
        currentDensity: getAtmosphericDensity(perigee),
        ballisticCoefficient: B,
        decayRateKmPerDay: decayRate(perigee, B, 1),
        estimatedLifetimeDays: nominal.days,
        lifetimeRangeDays: { min: short.days, max: long.days },
        estimatedReentryDate: Number.isFinite(nominal.days)
            ? new Date(currentDate.getTime() + nominal.days * SECONDS_PER_DAY * 1000)
            : null,
        altitudeHistory: nominal.history,
        beyondHorizon: !Number.isFinite(nominal.days),
        dragUnknown: false,
        riskLevel: riskFromLifetime(nominal.days),
    };
}

/** How soon it comes down: weeks, months, years, or not within the horizon. */
export function riskFromLifetime(days: number): DecayPrediction['riskLevel'] {
    if (days < 30) return 'critical';
    if (days < 365) return 'high';
    if (days < 3650) return 'medium';
    return 'low';
}

/** Language-neutral lifetime breakdown; UI formats it with i18n. */
export function lifetimeParts(days: number): { unit: 'day' | 'month' | 'year' | 'beyond'; value: number } {
    if (!Number.isFinite(days)) return { unit: 'beyond', value: DECAY_HORIZON_DAYS / 365.25 };
    if (days < 60) return { unit: 'day', value: Math.max(0, Math.round(days)) };
    if (days < 730) return { unit: 'month', value: Math.round(days / 30.44) };
    return { unit: 'year', value: Math.round((days / 365.25) * 10) / 10 };
}

