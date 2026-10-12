import { create } from 'zustand';
import { readSignals, staticTier, measuredTier, type Tier } from '@/lib/deviceTier';
import { useAppStore } from './appStore';

/**
 * Detected device tier. Starts from static signals and can only be lowered
 * by measurements (we never upgrade mid-session, to avoid flapping).
 */
interface PerfState {
    detected: Tier;
    renderMs: number[];
    workerMs: number[];
    init: () => void;
    reportRender: (ms: number) => void;
    reportWorker: (ms: number) => void;
}

const MAX_SAMPLES = 60;

export const usePerfStore = create<PerfState>((set, get) => ({
    detected: 'high',
    renderMs: [],
    workerMs: [],
    init: () => set({ detected: staticTier(readSignals()) }),
    reportRender: (ms) => {
        const s = get();
        if (s.detected === 'low' || s.renderMs.length >= MAX_SAMPLES) return;
        const renderMs = [...s.renderMs, ms];
        set({ renderMs, detected: measuredTier(renderMs, s.workerMs) ?? s.detected });
    },
    reportWorker: (ms) => {
        const s = get();
        if (s.detected === 'low' || s.workerMs.length >= MAX_SAMPLES) return;
        const workerMs = [...s.workerMs, ms];
        set({ workerMs, detected: measuredTier(s.renderMs, workerMs) ?? s.detected });
    },
}));

/** True when the light profile should be used (battery saver on, or a slow device on auto). */
export function useLowPower(): boolean {
    const mode = useAppStore((s) => s.settings.batterySaver);
    const detected = usePerfStore((s) => s.detected);
    return mode === 'on' || (mode === 'auto' && detected === 'low');
}

export function isLowPower(): boolean {
    const mode = useAppStore.getState().settings.batterySaver;
    return mode === 'on' || (mode === 'auto' && usePerfStore.getState().detected === 'low');
}
