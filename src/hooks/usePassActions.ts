"use client";

import { useCallback, useEffect, useRef } from "react";
import type { SatellitePass } from "@/lib/PassPrediction";
import { passToIcs } from "@/lib/ics";
import { downloadFile } from "@/lib/Exporter";
import { getEngine } from "@/lib/propagation";
import { useAppStore } from "@/store/appStore";
import { useLocale } from "./useLocale";
import { useFormat } from "./useFormat";

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/** "Add to calendar" for a pass: builds the .ics in the user's language and downloads it. */
export function useAddToCalendar() {
    const { t } = useLocale();
    const f = useFormat();
    const observer = useAppStore((s) => s.observer);
    return useCallback((id: string, name: string, p: SatellitePass) => {
        const dir = (az: number) => t(`compass.${COMPASS[Math.round(az / 45) % 8]}`);
        const ics = passToIcs({
            uid: `${id}-${p.aosTime.getTime()}`,
            start: p.aosTime,
            end: p.losTime,
            summary: t("calendar.summary", { name }),
            description: t("calendar.description", {
                el: f.num(p.maxElevation, 0) ?? "",
                from: dir(p.azimuthAOS),
                to: dir(p.azimuthLOS),
                visible: p.visible ? t("passes.visibleHint") : t("passes.radioOnly"),
            }),
            location: observer?.label,
            alarmMinutes: 10,
        });
        const safe = name.replace(/[^A-Za-z0-9]+/g, "_");
        downloadFile(ics, `${safe}_${p.aosTime.toISOString().slice(0, 16).replace(/[:T]/g, "")}.ics`, "text/calendar;charset=utf-8");
    }, [t, f, observer]);
}

/**
 * Browser notifications N minutes before passes of the selected and starred
 * objects. Works while the app is open (there's no push server), which the
 * settings screen says plainly.
 */
export function usePassAlerts() {
    const { t } = useLocale();
    const f = useFormat();
    const minutes = useAppStore((s) => s.settings.alertMinutes);
    const minEl = useAppStore((s) => s.settings.minElevation);
    const observer = useAppStore((s) => s.observer);
    const favorites = useAppStore((s) => s.favorites);
    const selectedId = useAppStore((s) => s.selectedId);
    const byId = useAppStore((s) => s.byId);
    const schedule = useRef<{ id: string; name: string; pass: SatellitePass }[]>([]);
    const sent = useRef(new Set<string>());

    // Refresh the list of upcoming passes (real time, not simulation time)
    useEffect(() => {
        if (!minutes || !observer || typeof Notification === "undefined" || Notification.permission !== "granted") return;
        const ids = [...new Set([...(selectedId ? [selectedId] : []), ...favorites])].filter((id) => byId.has(id)).slice(0, 20);
        if (!ids.length) { schedule.current = []; return; }
        let cancelled = false;
        const load = async () => {
            const now = new Date();
            const end = new Date(now.getTime() + 12 * 3600_000);
            const out: typeof schedule.current = [];
            for (const id of ids) {
                try {
                    const passes = await getEngine().passes(id, observer, now, end, minEl);
                    for (const pass of passes) out.push({ id, name: byId.get(id)!.name, pass });
                } catch { /* object unknown to the worker; skip */ }
            }
            if (!cancelled) schedule.current = out;
        };
        void load();
        const timer = window.setInterval(load, 15 * 60_000);
        return () => { cancelled = true; window.clearInterval(timer); };
    }, [minutes, observer, favorites, selectedId, byId, minEl]);

    // Fire due alerts
    useEffect(() => {
        if (!minutes || typeof Notification === "undefined") return;
        const check = () => {
            if (Notification.permission !== "granted") return;
            const now = Date.now();
            for (const { id, name, pass } of schedule.current) {
                const key = `${id}|${pass.aosTime.getTime()}`;
                const due = pass.aosTime.getTime() - minutes * 60_000;
                if (now >= due && now < pass.aosTime.getTime() && !sent.current.has(key)) {
                    sent.current.add(key);
                    new Notification(t("alerts.title", { name, min: minutes }), {
                        body: t("alerts.body", {
                            time: f.time(pass.aosTime, false),
                            el: f.num(pass.maxElevation, 0) ?? "",
                            visible: pass.visible ? t("passes.visibleShort") : t("passes.radioOnly"),
                        }),
                        tag: key,
                        icon: "/icon-192x192.png",
                    });
                }
            }
        };
        check();
        const timer = window.setInterval(check, 20_000);
        return () => window.clearInterval(timer);
    }, [minutes, t, f]);
}
