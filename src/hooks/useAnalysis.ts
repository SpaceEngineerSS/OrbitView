"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { SpaceObject } from "@/lib/space-objects";
import type { SatellitePass } from "@/lib/PassPrediction";
import { getEngine } from "@/lib/propagation";
import { getSatrec, elementsFromSatrec, type OrbitalElements } from "@/lib/orbit";
import { useAppStore, type Observer } from "@/store/appStore";
import { useSimTimeBucket } from "@/store/timelineStore";

export type AsyncState<T> =
    | { status: "idle" | "loading"; data: null; error: null }
    | { status: "ready"; data: T; error: null }
    | { status: "error"; data: null; error: string };

/** Mean elements of an object's TLE, memoised. */
export function useElements(obj: SpaceObject | null): OrbitalElements | null {
    return useMemo(() => (obj?.tle ? elementsFromSatrec(getSatrec(obj.tle.line1, obj.tle.line2)) : null), [obj]);
}

/* ------------------------------------------------------------------ */
/* Shared pass cache                                                   */
/* ------------------------------------------------------------------ */

const WINDOW_MS = 48 * 3600_000;
/** Start a little before "now" so a pass already in progress keeps its real rise time. */
const LOOKBACK_MS = 30 * 60_000;
/** The window is re-anchored every 30 min of simulation time. */
const ANCHOR_MS = 30 * 60_000;
const MAX_ENTRIES = 40;

type PassState = AsyncState<SatellitePass[]>;
const IDLE: PassState = { status: "idle", data: null, error: null };
const LOADING: PassState = { status: "loading", data: null, error: null };

const cache = new Map<string, PassState>();
/** Last finished result per object/observer, shown while a newer window loads. */
const latest = new Map<string, PassState>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Exported for tests: compute once per key, however many components ask. */
export function ensurePasses(key: string, prefix: string, run: () => Promise<SatellitePass[]>) {
    if (cache.has(key)) return;
    cache.set(key, LOADING);
    if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
    run().then(
        (data) => {
            const s: PassState = { status: "ready", data, error: null };
            cache.set(key, s);
            latest.set(prefix, s);
            emit();
        },
        (e: Error) => { cache.set(key, { status: "error", data: null, error: e.message }); emit(); }
    );
    emit();
}

export function passSnapshot(key: string | null, prefix: string | null): PassState {
    if (!key || !prefix) return IDLE;
    const s = cache.get(key);
    if (s && s.status !== "loading") return s;
    return latest.get(prefix) ?? s ?? LOADING;
}

/**
 * Passes over the observer for the next 48 h of simulation time. Every
 * component asking about the same object shares one calculation, done in the
 * analysis worker. Passes that have ended are dropped as time moves on.
 */
export function usePasses(obj: SpaceObject | null, observer: Observer | null): PassState {
    const minEl = useAppStore((s) => s.settings.minElevation);
    const bucket = useSimTimeBucket(60_000);
    const anchor = Math.floor(bucket / ANCHOR_MS) * ANCHOR_MS;

    const prefix = obj && observer ? `${obj.id}|${observer.latitude}|${observer.longitude}|${observer.altitude}|${minEl}` : null;
    const key = prefix ? `${prefix}|${anchor}` : null;

    useEffect(() => {
        if (!key || !prefix || !obj || !observer) return;
        ensurePasses(key, prefix, () =>
            getEngine().passes(obj.id, observer, new Date(anchor - LOOKBACK_MS), new Date(anchor + WINDOW_MS), minEl));
    }, [key, prefix, obj, observer, anchor, minEl]);

    const state = useSyncExternalStore(subscribe, () => passSnapshot(key, prefix), () => IDLE);

    return useMemo(() => {
        if (state.status !== "ready") return state;
        return { ...state, data: state.data.filter((p) => p.losTime.getTime() >= bucket) };
    }, [state, bucket]);
}
