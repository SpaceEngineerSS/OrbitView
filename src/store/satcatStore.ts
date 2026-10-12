import { create } from 'zustand';
import { rowToInfo, type SatcatInfo, type SatcatPayload } from '@/lib/satcat';

/**
 * Catalog metadata from /api/satcat, loaded once after the globe is up.
 * `owners` is a plain id → owner-code map so filtering stays cheap.
 */
interface SatcatState {
    status: 'idle' | 'loading' | 'ready' | 'error';
    owners: Map<string, string> | null;
    info: Map<string, SatcatInfo>;
    load: () => Promise<void>;
}

export const useSatcatStore = create<SatcatState>((set, get) => ({
    status: 'idle',
    owners: null,
    info: new Map(),
    load: async () => {
        if (get().status === 'loading' || get().status === 'ready') return;
        set({ status: 'loading' });
        try {
            const res = await fetch('/api/satcat');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const payload = (await res.json()) as SatcatPayload;
            const info = new Map<string, SatcatInfo>();
            const owners = new Map<string, string>();
            for (const row of payload.rows) {
                info.set(row[0], rowToInfo(row));
                owners.set(row[0], row[1]);
            }
            set({ status: 'ready', info, owners });
        } catch {
            set({ status: 'error' });
        }
    },
}));

/** Country filter test; with no country chosen everything passes. */
export function matchesCountry(id: string, country: string | null, owners: Map<string, string> | null): boolean {
    if (!country) return true;
    return owners?.get(id) === country;
}

export function countByOwner(ids: string[], owners: Map<string, string> | null): Map<string, number> {
    const out = new Map<string, number>();
    if (!owners) return out;
    for (const id of ids) {
        const o = owners.get(id);
        if (o) out.set(o, (out.get(o) ?? 0) + 1);
    }
    return out;
}
