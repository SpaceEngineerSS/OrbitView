"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { useTimelineStore } from "@/store/timelineStore";
import { fetchSatelliteCatalog } from "@/lib/tle";
import { convertToSpaceObject } from "@/lib/space-objects";
import { getEngine } from "@/lib/propagation";

/**
 * Start-up work for the page:
 *  - restore persisted settings/observer/favourites
 *  - load the catalog (cached first, then refreshed in the background)
 *  - keep ?sat=<NORAD id> in the URL in sync with the selection; ?t= sets the start time
 *  - global keyboard shortcuts
 */
export function useAppBoot() {
    // Persisted state
    useEffect(() => {
        void useAppStore.persist.rehydrate();
    }, []);

    // Theme: no attribute = follow the system (handled in CSS)
    useEffect(() => {
        const apply = (theme: string) => {
            const root = document.documentElement;
            if (theme === "light" || theme === "dark") root.dataset.theme = theme;
            else delete root.dataset.theme;
        };
        apply(useAppStore.getState().settings.theme);
        return useAppStore.subscribe((s, prev) => {
            if (s.settings.theme !== prev.settings.theme) apply(s.settings.theme);
        });
    }, []);

    // Hand every new catalog to the propagation worker immediately (store
    // listeners run synchronously), so it is loaded before any component
    // effect can ask the worker about an object.
    useEffect(() => {
        return useAppStore.subscribe((s, prev) => {
            if (s.objects !== prev.objects) getEngine().load(s.objects);
        });
    }, []);

    // Catalog
    useEffect(() => {
        let cancelled = false;
        const { setCatalog, setCatalogStatus } = useAppStore.getState();
        setCatalogStatus("loading");
        fetchSatelliteCatalog({
            onUpdate: (objects, meta) => {
                if (cancelled) return;
                setCatalog(objects.map(convertToSpaceObject), { fetchedAt: meta.fetchedAt, stale: meta.stale || meta.partial });
            },
        }).then((res) => {
            if (cancelled) return;
            if (res.objects.length === 0) {
                setCatalogStatus("error", "empty");
                return;
            }
            setCatalog(res.objects.map(convertToSpaceObject), { fetchedAt: res.fetchedAt, stale: res.stale || res.partial });
        }).catch((err: unknown) => {
            if (!cancelled) setCatalogStatus("error", err instanceof Error ? err.message : String(err));
        });
        return () => { cancelled = true; };
    }, []);

    // Deep link: ?t=<ISO time> starts the simulation at that moment
    useEffect(() => {
        const t = new URLSearchParams(location.search).get("t");
        const ms = t ? Date.parse(t) : NaN;
        if (Number.isFinite(ms)) useTimelineStore.getState().seek(new Date(ms));
    }, []);

    // Deep link: select ?sat= once the catalog is in, then mirror the selection into the URL
    useEffect(() => {
        const wanted = new URLSearchParams(location.search).get("sat");
        let applied = !wanted;
        return useAppStore.subscribe((s, prev) => {
            if (!applied && s.catalogStatus === "ready") {
                applied = true;
                if (wanted && s.byId.has(wanted)) s.select(wanted);
                return;
            }
            if (s.selectedId !== prev.selectedId && applied) {
                const url = new URL(location.href);
                if (s.selectedId) url.searchParams.set("sat", s.selectedId);
                else url.searchParams.delete("sat");
                history.replaceState(history.state, "", url);
            }
        });
    }, []);

    // Keyboard
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const time = useTimelineStore.getState();
            switch (e.key) {
                case " ":
                    if (target?.tagName === "BUTTON") return;
                    e.preventDefault();
                    time.togglePlay();
                    break;
                case "ArrowRight":
                    time.jump(e.shiftKey ? 86_400_000 : 3_600_000);
                    break;
                case "ArrowLeft":
                    time.jump(e.shiftKey ? -86_400_000 : -3_600_000);
                    break;
                case "]":
                    time.stepSpeed(1);
                    break;
                case "[":
                    time.stepSpeed(-1);
                    break;
                case "n":
                case "N":
                    time.now();
                    break;
                case "f":
                case "F": {
                    const app = useAppStore.getState();
                    if (app.selectedId) app.setFollow(!app.follow);
                    break;
                }
                case "Escape":
                    useAppStore.getState().select(null);
                    break;
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);
}

/** Whether we're on a phone-sized screen. Null until mounted. */
export function useIsMobile(): boolean | null {
    const [mobile, setMobile] = useState<boolean | null>(null);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        const update = () => setMobile(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, [setMobile]);
    return mobile;
}
