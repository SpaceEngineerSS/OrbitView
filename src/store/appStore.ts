import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SpaceObject } from '@/lib/space-objects';
import type { ObserverGeodetic } from '@/lib/orbit';

export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

export type FilterKey = 'all' | 'stations' | 'starlink' | 'gnss' | 'leo' | 'meo' | 'geo' | 'heo' | 'debris' | 'favorites';

export interface Observer extends ObserverGeodetic {
    /** Free-text label shown in the UI (city or "GPS") */
    label: string;
}

export interface Settings {
    theme: 'system' | 'light' | 'dark';
    /** auto: lighter globe on slow devices; on/off force it */
    batterySaver: 'auto' | 'on' | 'off';
    view: '3d' | '2d';
    /** Ground track length in orbits ahead */
    trackOrbits: number;
    /** Minutes before a pass to notify; 0 = off */
    alertMinutes: number;
    showOrbit: boolean;
    showGroundTrack: boolean;
    showFootprint: boolean;
    showNightShadow: boolean;
    autoRotate: boolean;
    basemap: 'dark' | 'imagery';
    clock: 'utc' | 'local';
    minElevation: number;
}

export const DEFAULT_SETTINGS: Settings = {
    theme: 'system',
    batterySaver: 'auto',
    view: '3d',
    trackOrbits: 1,
    alertMinutes: 0,
    showOrbit: true,
    showGroundTrack: true,
    showFootprint: true,
    showNightShadow: true,
    autoRotate: false,
    basemap: 'imagery',
    clock: 'utc',
    minElevation: 10,
};

interface AppState {
    objects: SpaceObject[];
    byId: Map<string, SpaceObject>;
    catalogStatus: CatalogStatus;
    catalogFetchedAt: number | null;
    catalogStale: boolean;
    catalogError: string | null;

    selectedId: string | null;
    hoveredId: string | null;
    filter: FilterKey;
    /** SATCAT owner code, or null for all countries */
    country: string | null;
    follow: boolean;
    /** Camera riding along with the selected object */
    pov: boolean;

    observer: Observer | null;
    settings: Settings;
    favorites: string[];

    setCatalog: (objects: SpaceObject[], meta: { fetchedAt: number | null; stale: boolean }) => void;
    setCatalogStatus: (status: CatalogStatus, error?: string | null) => void;
    select: (id: string | null) => void;
    hover: (id: string | null) => void;
    setFilter: (f: FilterKey) => void;
    setCountry: (c: string | null) => void;
    setFollow: (on: boolean) => void;
    setPov: (on: boolean) => void;
    setObserver: (o: Observer | null) => void;
    updateSettings: (patch: Partial<Settings>) => void;
    toggleFavorite: (id: string) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            objects: [],
            byId: new Map(),
            catalogStatus: 'idle',
            catalogFetchedAt: null,
            catalogStale: false,
            catalogError: null,

            selectedId: null,
            hoveredId: null,
            filter: 'all',
            country: null,
            follow: false,
            pov: false,

            observer: null,
            settings: DEFAULT_SETTINGS,
            favorites: [],

            setCatalog: (objects, meta) => set({
                objects,
                byId: new Map(objects.map((o) => [o.id, o])),
                catalogStatus: 'ready',
                catalogFetchedAt: meta.fetchedAt,
                catalogStale: meta.stale,
                catalogError: null,
            }),
            setCatalogStatus: (catalogStatus, error = null) => set({ catalogStatus, catalogError: error }),
            select: (selectedId) => set((s) => ({ selectedId, follow: selectedId ? s.follow : false, pov: false })),
            hover: (hoveredId) => set({ hoveredId }),
            setFilter: (filter) => set({ filter }),
            setCountry: (country) => set({ country }),
            setFollow: (follow) => set({ follow, pov: false }),
            setPov: (pov) => set({ pov, follow: false }),
            setObserver: (observer) => set({ observer }),
            updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
            toggleFavorite: (id) => set((s) => ({
                favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
            })),
        }),
        {
            name: 'orbitview-v4',
            version: 1,
            storage: createJSONStorage(() => localStorage),
            // Hydrated explicitly below, only in the browser.
            skipHydration: true,
            // The country filter is not kept: it depends on the satellite
            // catalog, which loads later (or not at all), and a globe that
            // opens with 40 of 30,000 objects looks broken.
            partialize: (s) => ({ observer: s.observer, settings: s.settings, favorites: s.favorites, filter: s.filter }),
            merge: (persisted, current) => {
                const { country: _dropped, ...p } = (persisted ?? {}) as Partial<AppState>;
                void _dropped;
                return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
            },
        }
    )
);

// Read persisted state as soon as the store exists in the browser, before any
// component can write to it (a write before hydration would save the defaults
// over the user's settings). Nothing that depends on it is server-rendered.
if (typeof window !== 'undefined') void useAppStore.persist.rehydrate();

/** The selected object, resolved from the catalog. */
export function useSelectedObject(): SpaceObject | null {
    return useAppStore((s) => (s.selectedId ? s.byId.get(s.selectedId) ?? null : null));
}
