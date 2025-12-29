import { useEffect, useRef, useCallback } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import * as Cesium from 'cesium';

/**
 * Hook to synchronize Cesium Clock with Zustand timeline store
 * 
 * ARCHITECTURE:
 * - Cesium Clock is the MASTER for animation (60fps)
 * - Zustand Store receives THROTTLED updates (100ms) for UI
 * - React components render based on Zustand, not Cesium directly
 * 
 * This prevents React render thrashing while maintaining smooth animations
 */

interface UseCesiumSyncOptions {
    viewer: Cesium.Viewer | null;
    throttleMs?: number;
}

export function useCesiumSync({ viewer, throttleMs = 100 }: UseCesiumSyncOptions) {
    const lastSyncRef = useRef<number>(0);
    const tickListenerRef = useRef<Cesium.Event.RemoveCallback | null>(null);

    const {
        currentTime,
        isPlaying,
        multiplier,
        syncFromCesium,
        setPlaying
    } = useTimelineStore();

    // Sync Cesium clock settings when Zustand state changes
    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return;

        const clock = viewer.clock;

        // Set clock multiplier
        clock.multiplier = multiplier;

        // Set clock animation state
        if (isPlaying) {
            clock.shouldAnimate = true;
        } else {
            clock.shouldAnimate = false;
        }
    }, [viewer, isPlaying, multiplier]);

    // Sync Cesium clock time when user seeks
    const syncToCesium = useCallback((time: Date) => {
        if (!viewer || viewer.isDestroyed()) return;

        try {
            const julianDate = Cesium.JulianDate.fromDate(time);
            viewer.clock.currentTime = julianDate;
        } catch (e) {
            console.warn('Failed to sync time to Cesium:', e);
        }
    }, [viewer]);

    // Subscribe to currentTime changes for seeking
    useEffect(() => {
        // Only sync to Cesium when explicitly seeking (not during playback)
        if (!isPlaying) {
            syncToCesium(currentTime);
        }
    }, [currentTime, isPlaying, syncToCesium]);

    // Listen to Cesium clock ticks and sync to Zustand (throttled)
    useEffect(() => {
        if (!viewer || viewer.isDestroyed()) return;

        const clock = viewer.clock;

        const onTick = () => {
            const now = performance.now();

            // Throttle updates to prevent React render thrashing
            if (now - lastSyncRef.current < throttleMs) return;
            lastSyncRef.current = now;

            try {
                const cesiumTime = Cesium.JulianDate.toDate(clock.currentTime);
                syncFromCesium(cesiumTime);
            } catch (e) {
                // Ignore conversion errors
            }
        };

        tickListenerRef.current = clock.onTick.addEventListener(onTick);

        return () => {
            if (tickListenerRef.current) {
                tickListenerRef.current();
                tickListenerRef.current = null;
            }
        };
    }, [viewer, throttleMs, syncFromCesium]);

    // Handle play/pause from external sources (keyboard shortcuts, etc.)
    const handleTogglePlay = useCallback(() => {
        if (!viewer || viewer.isDestroyed()) return;

        const newState = !isPlaying;
        setPlaying(newState);
        viewer.clock.shouldAnimate = newState;
    }, [viewer, isPlaying, setPlaying]);

    // Handle reset to now
    const handleResetToNow = useCallback(() => {
        if (!viewer || viewer.isDestroyed()) return;

        const now = new Date();
        const { resetToNow } = useTimelineStore.getState();
        resetToNow();

        const julianDate = Cesium.JulianDate.fromDate(now);
        viewer.clock.currentTime = julianDate;
        viewer.clock.multiplier = 1;
        viewer.clock.shouldAnimate = true;
    }, [viewer]);

    return {
        syncToCesium,
        handleTogglePlay,
        handleResetToNow
    };
}

export default useCesiumSync;
