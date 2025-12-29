import { create } from 'zustand';

/**
 * Timeline Store - Zustand state management for simulation time
 * 
 * IMPORTANT: Cesium's viewer.clock is the MASTER clock for animations.
 * This store syncs with Cesium clock via THROTTLED updates (100ms) to prevent
 * React render thrashing. Animation flow does NOT depend on React state.
 * 
 * @architecture
 * - Cesium Clock → Master (drives animation at 60fps)
 * - Zustand Store → UI Sync (throttled 100ms updates)
 * - React Components → Display only (no animation dependency)
 */

export interface TimelineState {
    // Core time state
    currentTime: Date;
    isPlaying: boolean;
    multiplier: number;

    // Scrubber position (0-1 normalized)
    timelinePosition: number;

    // Time range for scrubber (default: ±24 hours from now)
    timeRangeStart: Date;
    timeRangeEnd: Date;

    // Actions
    setTime: (time: Date) => void;
    setPlaying: (playing: boolean) => void;
    togglePlay: () => void;
    setMultiplier: (multiplier: number) => void;
    seekTo: (position: number) => void;
    resetToNow: () => void;
    setTimeRange: (start: Date, end: Date) => void;

    // Throttled sync from Cesium (call this from Cesium clock tick)
    syncFromCesium: (time: Date) => void;
}

// Calculate default time range (±24 hours)
const getDefaultTimeRange = () => {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h ago
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);   // 24h future
    return { start, end };
};

// Calculate position from time
const timeToPosition = (time: Date, start: Date, end: Date): number => {
    const range = end.getTime() - start.getTime();
    if (range <= 0) return 0.5;
    const position = (time.getTime() - start.getTime()) / range;
    return Math.max(0, Math.min(1, position));
};

// Calculate time from position
const positionToTime = (position: number, start: Date, end: Date): Date => {
    const range = end.getTime() - start.getTime();
    const time = start.getTime() + position * range;
    return new Date(time);
};

const defaultRange = getDefaultTimeRange();

export const useTimelineStore = create<TimelineState>((set, get) => ({
    // Initial state
    currentTime: new Date(),
    isPlaying: true,
    multiplier: 1,
    timelinePosition: 0.5, // Start at "now" (center of ±24h range)
    timeRangeStart: defaultRange.start,
    timeRangeEnd: defaultRange.end,

    // Actions
    setTime: (time: Date) => {
        const state = get();
        const position = timeToPosition(time, state.timeRangeStart, state.timeRangeEnd);
        set({ currentTime: time, timelinePosition: position });
    },

    setPlaying: (playing: boolean) => set({ isPlaying: playing }),

    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

    setMultiplier: (multiplier: number) => set({ multiplier }),

    seekTo: (position: number) => {
        const state = get();
        const clampedPosition = Math.max(0, Math.min(1, position));
        const newTime = positionToTime(clampedPosition, state.timeRangeStart, state.timeRangeEnd);
        set({
            timelinePosition: clampedPosition,
            currentTime: newTime,
            isPlaying: false // Pause when seeking
        });
    },

    resetToNow: () => {
        const now = new Date();
        const newRange = getDefaultTimeRange();
        set({
            currentTime: now,
            timelinePosition: 0.5,
            timeRangeStart: newRange.start,
            timeRangeEnd: newRange.end,
            isPlaying: true,
            multiplier: 1
        });
    },

    setTimeRange: (start: Date, end: Date) => {
        const state = get();
        const position = timeToPosition(state.currentTime, start, end);
        set({
            timeRangeStart: start,
            timeRangeEnd: end,
            timelinePosition: position
        });
    },

    // Throttled sync from Cesium - called at most every 100ms
    syncFromCesium: (time: Date) => {
        const state = get();
        if (!state.isPlaying) return; // Don't sync if paused

        const position = timeToPosition(time, state.timeRangeStart, state.timeRangeEnd);
        set({ currentTime: time, timelinePosition: position });
    }
}));

export default useTimelineStore;
