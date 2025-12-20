/**
 * Orbital Decay Calculator
 * 
 * Estimates satellite orbital lifetime based on atmospheric drag.
 * Uses B* (B-Star) drag coefficient from TLE data.
 * 
 * @module OrbitalDecay
 * @see {@link https://celestrak.org/columns/v04n03/} CelesTrak: Orbital Decay
 * 
 * Mathematical Foundation:
 * ========================
 * King-Hele Decay Theory:
 *   da/dt = -(1/2) × ρ × v × (C_D × A/m) × a
 * 
 * Simplified using TLE B* term:
 *   da/dt ≈ -B* × ρ × a × v
 * 
 * Where:
 * - a = Semi-major axis (km)
 * - ρ = Atmospheric density (kg/m³)
 * - v = Orbital velocity (km/s)
 * - C_D = Drag coefficient (~2.2 for satellites)
 * - A/m = Area-to-mass ratio
 * - B* = Modified ballistic coefficient from TLE
 * 
 * Atmospheric Density Model:
 *   ρ(h) = ρ₀ × exp(-(h - h₀) / H)
 * 
 * Where H is the scale height varying with altitude.
 * 
 * References:
 * -----------
 * [1] King-Hele, D.G. (1987). "Satellite Orbits in an Atmosphere: Theory and Applications"
 *     Blackie & Son. ISBN: 978-0216922525
 * 
 * [2] Vallado, D.A. (2013). "Fundamentals of Astrodynamics and Applications"
 *     4th Edition, Chapter 8: Orbit Perturbations. ISBN: 978-1881883180
 * 
 * [3] U.S. Standard Atmosphere (1976). NOAA/NASA/USAF.
 *     {@link https://ntrs.nasa.gov/citations/19770009539}
 * 
 * [4] Hoots, F.R. & Roehrich, R.L. (1980). "Spacetrack Report No. 3"
 *     {@link https://celestrak.org/NORAD/documentation/spacetrk.pdf}
 * 
 * Accuracy Notes:
 * - Atmospheric density varies with solar activity (F10.7, Kp index)
 * - This model uses average conditions; actual decay may vary ±50%
 * - B* encapsulates drag characteristics assuming Cd = 2.2
 */

// Physical constants
const EARTH_RADIUS_KM = 6371;
const EARTH_MU = 398600.4418; // km³/s² - Earth's gravitational parameter
const SECONDS_PER_DAY = 86400;

/**
 * Simplified atmospheric density model (exponential)
 * Based on US Standard Atmosphere 1976
 */
const DENSITY_LAYERS = [
    { h0: 0, rho0: 1.225, H: 8.5 },         // Sea level
    { h0: 100, rho0: 5.297e-7, H: 5.9 },    // 100 km
    { h0: 150, rho0: 2.070e-9, H: 26.8 },   // 150 km
    { h0: 200, rho0: 2.789e-10, H: 37.2 },  // 200 km
    { h0: 250, rho0: 7.248e-11, H: 45.5 },  // 250 km
    { h0: 300, rho0: 2.418e-11, H: 53.6 },  // 300 km
    { h0: 350, rho0: 9.518e-12, H: 53.3 },  // 350 km
    { h0: 400, rho0: 3.725e-12, H: 58.5 },  // 400 km
    { h0: 450, rho0: 1.585e-12, H: 60.8 },  // 450 km
    { h0: 500, rho0: 6.967e-13, H: 63.8 },  // 500 km
    { h0: 600, rho0: 1.454e-13, H: 71.8 },  // 600 km
    { h0: 700, rho0: 3.614e-14, H: 88.7 },  // 700 km
    { h0: 800, rho0: 1.170e-14, H: 124.6 }, // 800 km
    { h0: 900, rho0: 5.245e-15, H: 181.1 }, // 900 km
    { h0: 1000, rho0: 3.019e-15, H: 268.0 },// 1000 km
];

/**
 * Get atmospheric density at given altitude
 * @param altitudeKm - Altitude in kilometers
 * @returns Density in kg/m³
 */
export function getAtmosphericDensity(altitudeKm: number): number {
    if (altitudeKm < 0) return 1.225;
    if (altitudeKm > 1500) return 0; // Negligible drag above 1500 km

    // Find appropriate layer
    let layer = DENSITY_LAYERS[0];
    for (let i = DENSITY_LAYERS.length - 1; i >= 0; i--) {
        if (altitudeKm >= DENSITY_LAYERS[i].h0) {
            layer = DENSITY_LAYERS[i];
            break;
        }
    }

    // Exponential decay: ρ = ρ₀ × exp(-(h - h₀) / H)
    const deltaH = altitudeKm - layer.h0;
    return layer.rho0 * Math.exp(-deltaH / layer.H);
}

/**
 * Parse B* (BSTAR) drag coefficient from TLE Line 1
 * B* is in columns 54-61 of TLE Line 1
 * Format: [sign][5 digits][sign][exponent]
 * Example: " 50906-4" means 0.50906 × 10⁻⁴
 */
export function parseBStar(tleLine1: string): number {
    try {
        const bstarStr = tleLine1.substring(53, 61).trim();
        if (!bstarStr) return 0;

        // Parse mantissa and exponent
        // Format: " 12345-6" or "-12345-6"
        const mantissaStr = bstarStr.substring(0, 6).trim();
        const exponentStr = bstarStr.substring(6).trim();

        let mantissa = parseFloat(`0.${mantissaStr.replace(/[^0-9]/g, '')}`);
        if (mantissaStr.startsWith('-')) mantissa = -mantissa;

        const exponent = parseInt(exponentStr, 10);

        return mantissa * Math.pow(10, exponent);
    } catch {
        return 0;
    }
}

export interface DecayPrediction {
    currentAltitudeKm: number;
    currentDensity: number;
    decayRateKmPerDay: number;
    estimatedLifetimeDays: number;
    estimatedReentryDate: Date;
    altitudeHistory: { days: number; altitude: number }[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Calculate orbital decay prediction
 * 
 * Uses simplified King-Hele decay theory:
 * da/dt = -(1/2) × n × a × B* × ρ/ρ₀
 * 
 * Where:
 * - n = mean motion (rad/s)
 * - a = semi-major axis (km)
 * - B* = ballistic coefficient from TLE
 * - ρ = atmospheric density
 * - ρ₀ = reference density
 */
export function predictOrbitalDecay(
    semiMajorAxisKm: number,
    eccentricity: number,
    bstar: number,
    currentDate: Date = new Date()
): DecayPrediction {
    const altitudeKm = semiMajorAxisKm - EARTH_RADIUS_KM;
    const currentDensity = getAtmosphericDensity(altitudeKm);

    // Orbital period in seconds
    const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxisKm, 3) / EARTH_MU);
    const periodDays = periodSeconds / SECONDS_PER_DAY;

    // Mean motion (rad/s)
    const n = (2 * Math.PI) / periodSeconds;

    // Reference atmospheric density at 120km (for B* normalization)
    const rho0 = getAtmosphericDensity(120);

    // Decay rate calculation using King-Hele approximation
    // da/dt = -(1/2) × n × a × |B*| × (ρ/ρ₀)
    // Simplified: use B* directly as it encapsulates ballistic coefficient

    // For very high orbits (>800km), decay is negligible
    if (altitudeKm > 800) {
        const minDecay = 0.0001; // minimum decay rate km/day
        return {
            currentAltitudeKm: altitudeKm,
            currentDensity,
            decayRateKmPerDay: minDecay,
            estimatedLifetimeDays: 3650,
            estimatedReentryDate: new Date(currentDate.getTime() + 3650 * 24 * 60 * 60 * 1000),
            altitudeHistory: [
                { days: 0, altitude: altitudeKm },
                { days: 3650, altitude: altitudeKm - 0.5 }
            ],
            riskLevel: 'low'
        };
    }

    // Calculate decay rate per day
    // Empirical formula based on atmospheric drag:
    // Δh ≈ 2π × a × (ρ/ρ₀) × B* × (orbits per day)
    const orbitsPerDay = 1 / periodDays;
    const densityRatio = rho0 > 0 ? currentDensity / rho0 : 0;

    // Use absolute value of B*, scale appropriately
    // B* is typically in the range of 1e-5 to 1e-3
    const scaledBstar = Math.abs(bstar);

    // Simplified decay formula (km/day)
    // Lower altitudes = faster decay due to higher density
    let decayRateKmPerDay = 2 * Math.PI * semiMajorAxisKm * densityRatio * scaledBstar * orbitsPerDay;

    // Ensure reasonable bounds (0.0001 to 10 km/day)
    decayRateKmPerDay = Math.max(0.0001, Math.min(10, decayRateKmPerDay));

    // Simulate decay for altitude history
    const altitudeHistory: { days: number; altitude: number }[] = [];
    let simAltitude = altitudeKm;
    let simDays = 0;
    const maxDays = 3650; // 10 years max simulation
    const reentryAltitude = 120; // km - typical reentry altitude

    // Use larger step size for efficiency (simulate every 10 days for long-term orbits)
    const stepSize = altitudeKm > 500 ? 10 : 1;

    while (simAltitude > reentryAltitude && simDays < maxDays) {
        // Only record every 10th point for efficiency
        if (simDays % 10 === 0 || simDays === 0) {
            altitudeHistory.push({ days: simDays, altitude: simAltitude });
        }

        // Calculate decay for this altitude
        const rho = getAtmosphericDensity(simAltitude);
        const simDensityRatio = rho0 > 0 ? rho / rho0 : 0;
        const simSemiMajor = EARTH_RADIUS_KM + simAltitude;
        const simPeriodDays = (2 * Math.PI * Math.sqrt(Math.pow(simSemiMajor, 3) / EARTH_MU)) / SECONDS_PER_DAY;
        const simOrbitsPerDay = 1 / simPeriodDays;

        // Calculate daily decay with same formula
        let dailyDecay = 2 * Math.PI * simSemiMajor * simDensityRatio * scaledBstar * simOrbitsPerDay;
        dailyDecay = Math.max(0.0001, Math.min(10, dailyDecay));

        simAltitude -= dailyDecay * stepSize;
        simDays += stepSize;
    }

    // Add final point
    altitudeHistory.push({ days: simDays, altitude: Math.max(simAltitude, 0) });

    // Estimated reentry date
    const estimatedReentryDate = new Date(currentDate.getTime() + simDays * 24 * 60 * 60 * 1000);

    // Risk level based on altitude
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (altitudeKm < 200) riskLevel = 'critical';
    else if (altitudeKm < 300) riskLevel = 'high';
    else if (altitudeKm < 400) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
        currentAltitudeKm: altitudeKm,
        currentDensity,
        decayRateKmPerDay,
        estimatedLifetimeDays: simDays,
        estimatedReentryDate,
        altitudeHistory,
        riskLevel
    };
}

/**
 * Get altitude risk color
 */
export function getAltitudeColor(altitudeKm: number): string {
    if (altitudeKm < 200) return '#ef4444'; // Red
    if (altitudeKm < 300) return '#f97316'; // Orange
    if (altitudeKm < 400) return '#eab308'; // Yellow
    if (altitudeKm < 500) return '#84cc16'; // Lime
    return '#22c55e'; // Green
}

/**
 * Format remaining lifetime
 */
export function formatLifetime(days: number): string {
    if (days < 1) return '< 1 day';
    if (days < 30) return `${Math.round(days)} days`;
    if (days < 365) return `${Math.round(days / 30)} months`;
    if (days < 3650) return `${(days / 365).toFixed(1)} years`;
    return '> 10 years';
}
