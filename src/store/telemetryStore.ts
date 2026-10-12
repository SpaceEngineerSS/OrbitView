import { create } from 'zustand';

/**
 * Live state of the selected object, refreshed about once a second from the
 * globe. Kept apart from the app store so only the readouts re-render.
 */
export interface Telemetry {
    id: string;
    time: number;
    latitude: number;
    longitude: number;
    altitudeKm: number;
    /** Inertial speed, km/s */
    speedKmS: number;
    sunlit: boolean;
    /** Topocentric look angles from the observer, if one is set */
    look: { azimuthDeg: number; elevationDeg: number; rangeKm: number; rangeRateKmS: number } | null;
}

interface TelemetryState {
    telemetry: Telemetry | null;
    set: (t: Telemetry | null) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
    telemetry: null,
    set: (telemetry) => set({ telemetry }),
}));
