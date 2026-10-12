import { create } from 'zustand';
import { useEffect } from 'react';
import { parseTLE } from '@/lib/tle';
import { getEngine } from '@/lib/propagation';
import type { TonightPass } from '@/lib/tonight';
import type { TLEInitData } from '@/types/satellite';
import { useAppStore } from './appStore';
import { useSimTimeBucket } from './timelineStore';
import { VISUAL_IDS } from '@/lib/visualIds';
import type { SpaceObject } from '@/lib/space-objects';

/**
 * "Tonight": visible passes of the ~150 brightest objects (CelesTrak's
 * "visual" list) during the observer's next dark period. Recomputed when
 * the location or elevation mask changes, or every 30 minutes of
 * simulation time.
 */
interface TonightState {
    status: 'idle' | 'loading' | 'ready' | 'error';
    window: { start: number; end: number } | null;
    passes: TonightPass[];
    key: string | null;
    sats: { from: SpaceObject[]; list: TLEInitData[] } | null;
    refresh: (key: string, run: () => Promise<{ window: { start: number; end: number } | null; passes: TonightPass[] }>) => void;
    loadSats: (catalog: SpaceObject[]) => Promise<TLEInitData[]>;
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
    /**
     * The bright objects from the catalog already in memory. Only a catalog
     * that lacks most of them (CelesTrak "active" has no rocket bodies) makes
     * us ask for the list itself, and a failure there keeps what we have.
     */
    loadSats: async (catalog) => {
        const have = get().sats;
        if (have?.from === catalog) return have.list;
        const byId = new Map(catalog.map((o) => [o.id, o]));
        let list: TLEInitData[] = [];
        for (const id of VISUAL_IDS) {
            const o = byId.get(id);
            if (o?.tle) list.push({ id: o.id, name: o.name, line1: o.tle.line1, line2: o.tle.line2 });
        }
        if (list.length < 50) {
            try {
                const res = await fetch('/api/tle?group=visual');
                if (res.ok) list = parseTLE(await res.text()).map((s) => ({ id: s.id, name: s.name, line1: s.line1, line2: s.line2 }));
            } catch { /* keep the catalog subset */ }
        }
        set({ sats: { from: catalog, list } });
        return list;
    },
}));

const BUCKET = 30 * 60_000;

/** Keeps the tonight list current for the active observer and sim time. */
export function useTonight() {
    const observer = useAppStore((s) => s.observer);
    const minEl = useAppStore((s) => s.settings.minElevation);
    const catalog = useAppStore((s) => s.objects);
    const bucket = useSimTimeBucket(BUCKET);
    const state = useTonightStore();

    useEffect(() => {
        if (!observer || !catalog.length) return;
        const key = `${observer.latitude}|${observer.longitude}|${observer.altitude}|${minEl}|${bucket}|${catalog.length}`;
        const { refresh, loadSats } = useTonightStore.getState();
        refresh(key, async () => {
            const sats = await loadSats(catalog);
            return getEngine().tonight(sats, observer, new Date(bucket), minEl);
        });
    }, [observer, minEl, bucket, catalog]);

    return { observer, ...state };
}
