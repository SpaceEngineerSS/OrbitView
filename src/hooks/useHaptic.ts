"use client";

import { useCallback } from 'react';

/**
 * useHaptic - Haptic feedback hook for mobile devices
 * Uses the Vibration API (navigator.vibrate) for tactile feedback
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

// Vibration patterns in milliseconds
const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
    light: 10,           // Menu transitions, subtle feedback
    medium: 40,          // Button clicks, selection
    heavy: 70,           // Important actions, deletions
    success: [10, 50, 20], // Success pattern (vibrate-pause-vibrate)
    error: [50, 30, 50],   // Error pattern
    warning: [30, 20, 30], // Warning pattern
};

/**
 * Check if vibration is supported
 */
const isVibrationSupported = (): boolean => {
    return typeof navigator !== 'undefined' &&
        typeof navigator.vibrate === 'function';
};

/**
 * Custom hook for haptic feedback
 * 
 * @example
 * const { trigger } = useHaptic();
 * 
 * // Light feedback for menu transitions
 * trigger('light');
 * 
 * // Medium feedback for button clicks
 * trigger('medium');
 * 
 * // Success pattern for completed actions
 * trigger('success');
 */
export function useHaptic() {
    const trigger = useCallback((type: HapticType = 'medium') => {
        if (!isVibrationSupported()) return false;

        try {
            const pattern = HAPTIC_PATTERNS[type];
            return navigator.vibrate(pattern);
        } catch {
            // Silently fail if vibration is blocked or unavailable
            return false;
        }
    }, []);

    const cancel = useCallback(() => {
        if (!isVibrationSupported()) return;

        try {
            navigator.vibrate(0); // Cancel any ongoing vibration
        } catch {
            // Silently fail
        }
    }, []);

    return {
        trigger,
        cancel,
        isSupported: isVibrationSupported(),
    };
}

export default useHaptic;
