"use client";

import { useEffect, useMemo, useState } from "react";
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

const PASS_WINDOW_MS = 48 * 3600_000;

/**
 * Passes over the observer for the next 48 h of simulation time.
 * Recomputed (in the worker) when the object, observer or elevation mask
 * changes, when sim time jumps, or when the first listed pass has ended.
 */
export function usePasses(obj: SpaceObject | null, observer: Observer | null): AsyncState<SatellitePass[]> {
    const minEl = useAppStore((s) => s.settings.minElevation);
    const bucket = useSimTimeBucket(60_000);
    const [anchor, setAnchor] = useState<number | null>(null);
    const [state, setState] = useState<AsyncState<SatellitePass[]>>({ status: "idle", data: null, error: null });

    // Decide when the list is stale: different inputs, a jump outside the window,
    // or the first pass is over.
    const key = obj && observer ? `${obj.id}|${observer.latitude}|${observer.longitude}|${observer.altitude}|${minEl}` : null;
    const [lastKey, setLastKey] = useState<string | null>(null);

    useEffect(() => {
        if (!key) { setAnchor(null); setLastKey(null); return; }
        const first = state.status === "ready" ? state.data[0] : undefined;
        const outOfWindow = anchor === null || bucket < anchor - 60_000 || bucket > anchor + PASS_WINDOW_MS / 2;
        const firstOver = first ? first.losTime.getTime() < bucket : false;
        if (key !== lastKey || outOfWindow || firstOver) {
            setLastKey(key);
            setAnchor(bucket);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, bucket]);

    useEffect(() => {
        if (!obj || !observer || anchor === null) {
            setState({ status: "idle", data: null, error: null });
            return;
        }
        let cancelled = false;
        setState({ status: "loading", data: null, error: null });
        getEngine()
            .passes(obj.id, observer, new Date(anchor), new Date(anchor + PASS_WINDOW_MS), minEl)
            .then((passes) => { if (!cancelled) setState({ status: "ready", data: passes, error: null }); })
            .catch((e: Error) => { if (!cancelled) setState({ status: "error", data: null, error: e.message }); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchor, lastKey]);

    // Drop passes that have already ended in sim time.
    return useMemo(() => {
        if (state.status !== "ready") return state;
        return { ...state, data: state.data.filter((p) => p.losTime.getTime() >= bucket) };
    }, [state, bucket]);
}
