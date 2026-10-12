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
    showOrbit: true,
    showGroundTrack: true,
    showFootprint: true,
    showNightShadow: true,
    autoRotate: false,
    basemap: 'dark',
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
    follow: boolean;

    observer: Observer | null;
    settings: Settings;
    favorites: string[];

    setCatalog: (objects: SpaceObject[], meta: { fetchedAt: number | null; stale: boolean }) => void;
    setCatalogStatus: (status: CatalogStatus, error?: string | null) => void;
    select: (id: string | null) => void;
    hover: (id: string | null) => void;
    setFilter: (f: FilterKey) => void;
    setFollow: (on: boolean) => void;
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
            follow: false,

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
            select: (selectedId) => set((s) => ({ selectedId, follow: selectedId ? s.follow : false })),
            hover: (hoveredId) => set({ hoveredId }),
            setFilter: (filter) => set({ filter }),
            setFollow: (follow) => set({ follow }),
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
            // Hydrated manually after mount to avoid SSR mismatches.
            skipHydration: true,
            partialize: (s) => ({ observer: s.observer, settings: s.settings, favorites: s.favorites, filter: s.filter }),
            merge: (persisted, current) => {
                const p = (persisted ?? {}) as Partial<AppState>;
                return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
            },
        }
    )
);

/** The selected object, resolved from the catalog. */
export function useSelectedObject(): SpaceObject | null {
    return useAppStore((s) => (s.selectedId ? s.byId.get(s.selectedId) ?? null : null));
}
