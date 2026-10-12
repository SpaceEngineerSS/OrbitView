import { create } from 'zustand';
import { useEffect } from 'react';
import { parseTLE } from '@/lib/tle';
import { getEngine } from '@/lib/propagation';
import type { TonightPass } from '@/lib/tonight';
import type { TLEInitData } from '@/types/satellite';
import { useAppStore } from './appStore';
import { useSimTimeBucket } from './timelineStore';

/**
 * "Tonight": visible passes of the ~100 brightest objects (CelesTrak
 * "visual" group) during the observer's next dark period. Recomputed when
 * the location or elevation mask changes, or every 30 minutes of
 * simulation time.
 */
interface TonightState {
    status: 'idle' | 'loading' | 'ready' | 'error';
    window: { start: number; end: number } | null;
    passes: TonightPass[];
    key: string | null;
    sats: TLEInitData[] | null;
    refresh: (key: string, run: () => Promise<{ window: { start: number; end: number } | null; passes: TonightPass[] }>) => void;
    loadSats: () => Promise<TLEInitData[]>;
}

export const useTonightStore = create<TonightState>((set, get) => ({
    status: 'idle',
    window: null,
    passes: [],
    key: null,
    sats: null,
    refresh: (key, run) => {
        if (get().key === key) return;
        set({ key, status: get().passes.length ? get().status : 'loading' });
        run().then(
            (r) => { if (get().key === key) set({ status: 'ready', window: r.window, passes: r.passes }); },
            () => { if (get().key === key) set({ status: 'error' }); }
        );
    },
    loadSats: async () => {
        const have = get().sats;
        if (have) return have;
        const res = await fetch('/api/tle?group=visual');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const sats = parseTLE(await res.text()).map((s) => ({ id: s.id, name: s.name, line1: s.line1, line2: s.line2 }));
        set({ sats });
        return sats;
    },
}));

const BUCKET = 30 * 60_000;

/** Keeps the tonight list current for the active observer and sim time. */
export function useTonight() {
    const observer = useAppStore((s) => s.observer);
    const minEl = useAppStore((s) => s.settings.minElevation);
    const bucket = useSimTimeBucket(BUCKET);
    const state = useTonightStore();

    useEffect(() => {
        if (!observer) return;
        const key = `${observer.latitude}|${observer.longitude}|${observer.altitude}|${minEl}|${bucket}`;
        const { refresh, loadSats } = useTonightStore.getState();
        refresh(key, async () => {
            const sats = await loadSats();
            return getEngine().tonight(sats, observer, new Date(bucket), minEl);
        });
    }, [observer, minEl, bucket]);

    return { observer, ...state };
}
