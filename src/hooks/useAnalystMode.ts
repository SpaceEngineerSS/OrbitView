import { useState, useEffect, useCallback } from 'react';

export type AppMode = 'observer' | 'analyst';

const STORAGE_KEY = 'orbitview_mode';

export interface UseAnalystModeReturn {
    mode: AppMode;
    isAnalystMode: boolean;
    toggleMode: () => void;
    setMode: (mode: AppMode) => void;
}

export function useAnalystMode(): UseAnalystModeReturn {
    const [mode, setModeState] = useState<AppMode>('observer');

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'analyst' || stored === 'observer') {
                setModeState(stored);
            }
        } catch (error) {
            console.error('Failed to load mode preference:', error);
        }
    }, []);

    // Save to localStorage when mode changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch (error) {
            console.error('Failed to save mode preference:', error);
        }
    }, [mode]);

    const toggleMode = useCallback(() => {
        setModeState(prev => prev === 'observer' ? 'analyst' : 'observer');
    }, []);

    const setMode = useCallback((newMode: AppMode) => {
        setModeState(newMode);
    }, []);

    return {
        mode,
        isAnalystMode: mode === 'analyst',
        toggleMode,
        setMode
    };
}
