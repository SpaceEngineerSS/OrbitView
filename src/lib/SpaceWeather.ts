/**
 * Space Weather Service
 * 
 * Fetches real-time space weather data for accurate orbital decay predictions.
 * Solar activity significantly affects atmospheric density and satellite drag.
 * 
 * @module SpaceWeather
 * 
 * Data Sources:
 * - NOAA Space Weather Prediction Center (SWPC)
 * - F10.7 Solar Radio Flux (10.7 cm wavelength)
 * - Kp Geomagnetic Index
 * 
 * References:
 * -----------
 * [1] Bowman, B.R. et al. (2008). "A New Empirical Thermospheric Density Model JB2008"
 *     AIAA 2008-6438. DOI: 10.2514/6.2008-6438
 * 
 * [2] NOAA SWPC: https://www.swpc.noaa.gov/products
 */

export interface SpaceWeatherData {
    f107: number;           // 10.7cm solar radio flux (SFU)
    f107Average: number;    // 81-day average F10.7
    kpIndex: number;        // Planetary K-index (0-9)
    apIndex: number;        // Daily Ap index
    timestamp: Date;
    solarWindSpeed?: number; // km/s
    solarWindDensity?: number; // p/cm³
    condition: 'quiet' | 'moderate' | 'active' | 'storm';
}

// API endpoints
const NOAA_F107_URL = 'https://services.swpc.noaa.gov/json/f107_cm_flux.json';
const NOAA_KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const NOAA_SOLAR_WIND_URL = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json';

/**
 * Fetch current F10.7 solar flux
 */
async function fetchF107(): Promise<{ f107: number; f107Average: number }> {
    try {
        const response = await fetch(NOAA_F107_URL, {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error('Failed to fetch F10.7 data');
        }

        const data = await response.json();

        // Get most recent value
        if (Array.isArray(data) && data.length > 0) {
            const recent = data[data.length - 1];
            const f107 = parseFloat(recent.flux) || 150;

            // Calculate 81-day average from available data
            const last81Days = data.slice(-81);
            const f107Average = last81Days.reduce((sum: number, d: { flux: string }) =>
                sum + (parseFloat(d.flux) || 0), 0) / last81Days.length;

            return { f107, f107Average };
        }

        return { f107: 150, f107Average: 150 }; // Default moderate activity
    } catch (error) {
        console.warn('[SpaceWeather] F10.7 fetch failed, using defaults:', error);
        return { f107: 150, f107Average: 150 };
    }
}

/**
 * Fetch current Kp index
 */
async function fetchKpIndex(): Promise<{ kp: number; ap: number }> {
    try {
        const response = await fetch(NOAA_KP_URL, {
            next: { revalidate: 900 } // Cache for 15 minutes
        });

        if (!response.ok) {
            throw new Error('Failed to fetch Kp data');
        }

        const data = await response.json();

        // Skip header row, get most recent
        if (Array.isArray(data) && data.length > 1) {
            const recent = data[data.length - 1];
            // Format: [time_tag, Kp, Kp_fraction, a_running, ...]
            const kpStr = recent[1];
            const kp = parseFloat(kpStr) || 2;

            // Estimate Ap from Kp using standard conversion
            const ap = kpToAp(kp);

            return { kp, ap };
        }

        return { kp: 2, ap: 7 }; // Default quiet conditions
    } catch (error) {
        console.warn('[SpaceWeather] Kp fetch failed, using defaults:', error);
        return { kp: 2, ap: 7 };
    }
}

/**
 * Convert Kp to Ap index (standard table)
 */
function kpToAp(kp: number): number {
    const kpValues = [0, 0.33, 0.67, 1, 1.33, 1.67, 2, 2.33, 2.67, 3, 3.33, 3.67, 4, 4.33, 4.67, 5, 5.33, 5.67, 6, 6.33, 6.67, 7, 7.33, 7.67, 8, 8.33, 8.67, 9];
    const apValues = [0, 2, 3, 4, 5, 6, 7, 9, 12, 15, 18, 22, 27, 32, 39, 48, 56, 67, 80, 94, 111, 132, 154, 179, 207, 236, 300, 400];

    // Find closest Kp value
    let idx = 0;
    for (let i = 0; i < kpValues.length; i++) {
        if (kpValues[i] <= kp) idx = i;
    }

    return apValues[idx] || 7;
}

/**
 * Determine space weather condition from indices
 */
function getCondition(kp: number, f107: number): 'quiet' | 'moderate' | 'active' | 'storm' {
    if (kp >= 7 || f107 >= 200) return 'storm';
    if (kp >= 5 || f107 >= 150) return 'active';
    if (kp >= 3 || f107 >= 100) return 'moderate';
    return 'quiet';
}

/**
 * Fetch complete space weather data
 */
export async function fetchSpaceWeather(): Promise<SpaceWeatherData> {
    const [f107Data, kpData] = await Promise.all([
        fetchF107(),
        fetchKpIndex()
    ]);

    const condition = getCondition(kpData.kp, f107Data.f107);

    return {
        f107: f107Data.f107,
        f107Average: f107Data.f107Average,
        kpIndex: kpData.kp,
        apIndex: kpData.ap,
        timestamp: new Date(),
        condition
    };
}

/**
 * Get atmospheric density correction factor based on space weather
 * Higher solar activity = higher atmospheric density = faster decay
 */
export function getDensityCorrectionFactor(weather: SpaceWeatherData): number {
    // Empirical correction based on F10.7
    // Base density at F10.7 = 150 SFU
    const f107Factor = weather.f107 / 150;

    // Geomagnetic correction based on Ap
    // Ap > 15 indicates elevated activity
    const apFactor = 1 + (weather.apIndex - 7) * 0.02;

    // Combined factor (typically 0.5 to 2.0)
    return Math.max(0.5, Math.min(2.0, f107Factor * apFactor));
}

/**
 * Format Kp index for display
 */
export function formatKpIndex(kp: number): string {
    const fraction = kp % 1;
    const integer = Math.floor(kp);

    if (fraction >= 0.5) return `${integer}+`;
    if (fraction > 0.1) return `${integer}o`;
    if (integer > 0 && fraction < 0.1) return `${integer}-`;
    return `${integer}`;
}

/**
 * Get Kp color for visualization
 */
export function getKpColor(kp: number): string {
    if (kp < 4) return '#22c55e';  // Green - Quiet
    if (kp < 5) return '#84cc16';  // Lime - Unsettled
    if (kp < 6) return '#eab308';  // Yellow - Active
    if (kp < 7) return '#f97316';  // Orange - Minor Storm
    if (kp < 8) return '#ef4444';  // Red - Moderate Storm
    return '#dc2626';              // Dark Red - Strong Storm
}
