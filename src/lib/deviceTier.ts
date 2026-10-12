/**
 * Rough device classification, so weak phones and laptops get a lighter
 * globe without anyone having to find a setting.
 *
 * Static signals are only a first guess; the globe also measures real frame
 * times and the worker's propagation time and downgrades if they are slow.
 */

export type Tier = 'high' | 'low';

export interface DeviceSignals {
    cores?: number;          // navigator.hardwareConcurrency
    memoryGb?: number;       // navigator.deviceMemory (Chromium only)
    coarsePointer?: boolean; // touch-first device
    dpr?: number;            // devicePixelRatio
    saveData?: boolean;      // navigator.connection.saveData
}

export function staticTier(s: DeviceSignals): Tier {
    if (s.saveData) return 'low';
    if (s.cores !== undefined && s.cores <= 4) return 'low';
    if (s.memoryGb !== undefined && s.memoryGb <= 4) return 'low';
    // High-DPI phones push a lot of pixels with a small GPU.
    if (s.coarsePointer && (s.dpr ?? 1) >= 3 && (s.cores ?? 8) <= 6) return 'low';
    return 'high';
}

/** Median of the samples (they're usually few, so a copy-and-sort is fine). */
export function median(xs: number[]): number {
    if (!xs.length) return NaN;
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Slow if the median render takes > 25 ms, or a propagation frame > 300 ms.
 * The worker runs off the main thread, so it only matters once it can't keep
 * up even with the low update rates; the threshold is deliberately loose.
 */
export function measuredTier(renderMs: number[], workerMs: number[]): Tier | null {
    if (renderMs.length < 20 && workerMs.length < 10) return null;
    if (renderMs.length >= 20 && median(renderMs) > 25) return 'low';
    if (workerMs.length >= 10 && median(workerMs) > 300) return 'low';
    return 'high';
}

export function readSignals(): DeviceSignals {
    if (typeof navigator === 'undefined') return {};
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    return {
        cores: nav.hardwareConcurrency || undefined,
        memoryGb: nav.deviceMemory,
        coarsePointer: typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
        dpr: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
        saveData: nav.connection?.saveData,
    };
}
