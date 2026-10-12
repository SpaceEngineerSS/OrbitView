import { create } from 'zustand';

/**
 * Simulation clock.
 *
 * Cesium's clock is the source of truth while the globe is running; it calls
 * `syncFromCesium` a few times per second. User actions (seek, jump, now,
 * play/pause, speed) don't touch Cesium directly: they bump `seekRequest`,
 * and the globe applies it. That way the two clocks never fight.
 *
 * Subscribe with a selector. `currentTime` changes several times a second,
 * so only components that display the time should read it.
 */

export const SPEEDS = [1, 10, 60, 300, 1000] as const;

interface TimelineState {
    currentTime: Date;
    isPlaying: boolean;
    multiplier: number;
    /** Incremented on every user seek; the globe watches `seekRequest.seq`. */
    seekRequest: { seq: number; time: Date };

    syncFromCesium: (time: Date) => void;
    seek: (time: Date) => void;
    jump: (ms: number) => void;
    now: () => void;
    togglePlay: () => void;
    setPlaying: (playing: boolean) => void;
    setMultiplier: (m: number) => void;
    stepSpeed: (dir: 1 | -1) => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
    currentTime: new Date(),
    isPlaying: true,
    multiplier: 1,
    seekRequest: { seq: 0, time: new Date() },

    syncFromCesium: (time) => set({ currentTime: time }),

    seek: (time) => set((s) => ({ currentTime: time, seekRequest: { seq: s.seekRequest.seq + 1, time } })),

    jump: (ms) => get().seek(new Date(get().currentTime.getTime() + ms)),

    now: () => {
        const t = new Date();
        set((s) => ({ currentTime: t, multiplier: 1, isPlaying: true, seekRequest: { seq: s.seekRequest.seq + 1, time: t } }));
    },

    togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
    setPlaying: (isPlaying) => set({ isPlaying }),
    setMultiplier: (multiplier) => set({ multiplier }),

    stepSpeed: (dir) => {
        const i = SPEEDS.indexOf(get().multiplier as (typeof SPEEDS)[number]);
        const next = SPEEDS[Math.min(SPEEDS.length - 1, Math.max(0, (i < 0 ? 0 : i) + dir))];
        set({ multiplier: next });
    },
}));

/**
 * Simulation time rounded down to `stepMs`. Use it for analyses that only need
 * to refresh occasionally (pass lists, Doppler tables) so they don't
 * re-render on every clock sync.
 */
export function useSimTimeBucket(stepMs: number): number {
    return useTimelineStore((s) => Math.floor(s.currentTime.getTime() / stepMs) * stepMs);
}
