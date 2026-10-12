"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import type { SpaceObject } from "@/lib/space-objects";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { useTelemetryStore } from "@/store/telemetryStore";
import { InspectorHeader, InspectorTabs, InspectorBody } from "@/components/analysis/Inspector";
import { Readout } from "@/components/ui/Readout";

type Snap = "peek" | "half" | "full";
const PEEK = 148;

function heights(avail: number): Record<Snap, number> {
    return { peek: PEEK, half: Math.round(avail * 0.55), full: avail };
}

/**
 * Bottom sheet for the selected object. The handle area follows the finger;
 * on release it snaps to the nearest of three heights, or jumps one step in
 * the direction of a quick flick.
 */
export default function SelectionSheet({ obj, available }: { obj: SpaceObject; available: number }) {
    const t = useT();
    const f = useFormat();
    const tel = useTelemetryStore((s) => (s.telemetry?.id === obj.id ? s.telemetry : null));
    const [snap, setSnap] = useState<Snap>("peek");
    const h = useMotionValue(PEEK);
    const justDragged = useRef(false);
    const snaps = heights(available);

    const go = (s: Snap) => {
        setSnap(s);
        animate(h, snaps[s], { type: "spring", stiffness: 420, damping: 42 });
    };

    // Keep the current snap valid when the viewport changes (rotation, URL bar)
    useEffect(() => { h.set(heights(available)[snap]); }, [available]); // eslint-disable-line react-hooks/exhaustive-deps
    // New object: back to peek
    useEffect(() => { go("peek"); }, [obj.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Drag on the header. Pointer capture keeps the gesture even when the
    // finger leaves the element; velocity comes from the last ~80 ms.
    const drag = useRef<{ id: number; y0: number; h0: number; trail: { y: number; t: number }[] } | null>(null);

    const onPointerDown = (e: React.PointerEvent) => {
        // Header buttons (star, follow, close) keep working; the grip itself drags.
        const btn = (e.target as HTMLElement).closest("button");
        if (btn && !btn.dataset.grip) return;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
        drag.current = { id: e.pointerId, y0: e.clientY, h0: h.get(), trail: [{ y: e.clientY, t: e.timeStamp }] };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        h.set(Math.max(PEEK - 40, Math.min(available, d.h0 - (e.clientY - d.y0))));
        d.trail.push({ y: e.clientY, t: e.timeStamp });
        while (d.trail.length > 2 && e.timeStamp - d.trail[0].t > 80) d.trail.shift();
    };
    const onPointerUp = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        drag.current = null;
        const first = d.trail[0], last = d.trail[d.trail.length - 1];
        const dt = Math.max(1, last.t - first.t);
        const v = -((last.y - first.y) / dt) * 1000; // px/s, positive = upwards
        const order: Snap[] = ["peek", "half", "full"];
        if (Math.abs(e.clientY - d.y0) < 6) return; // a tap, not a drag
        justDragged.current = true;
        setTimeout(() => { justDragged.current = false; }, 50);
        if (Math.abs(v) > 600) {
            const i = order.indexOf(snap) + (v > 0 ? 1 : -1);
            go(order[Math.max(0, Math.min(2, i))]);
            return;
        }
        const cur = h.get();
        let best: Snap = "peek";
        for (const s of order) if (Math.abs(snaps[s] - cur) < Math.abs(snaps[best] - cur)) best = s;
        go(best);
    };

    return (
        <motion.section
            aria-label={obj.name}
            className="absolute inset-x-0 bottom-0 flex flex-col bg-surface border-t border-rule-strong"
            style={{ height: h, zIndex: "var(--z-sheet)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
        >
            <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="touch-none shrink-0 cursor-grab select-none"
            >
                <button
                    type="button"
                    aria-label={snap === "peek" ? t("sheet.expand") : t("sheet.collapse")}
                    data-grip="1"
                    onClick={() => { if (!justDragged.current) go(snap === "peek" ? "half" : "peek"); }}
                    className="w-full h-5 flex items-center justify-center"
                >
                    <span aria-hidden className="block w-9 h-[3px] bg-rule-strong" />
                </button>
                <InspectorHeader obj={obj} compact />
                <div className="grid grid-cols-3 gap-3 px-3 pb-2.5">
                    <Readout size="sm" label={t("telemetry.altitude")} value={f.num(tel?.altitudeKm, 0)} unit="km" />
                    <Readout size="sm" label={t("telemetry.speed")} value={f.num(tel?.speedKmS, 2)} unit="km/s" />
                    <Readout size="sm" label={t("look.elevation")} value={tel?.look ? f.num(tel.look.elevationDeg, 0) : null} unit="°"
                        tone={tel?.look && tel.look.elevationDeg > 0 ? "accent" : "dim"} />
                </div>
            </div>
            {/* Collapsed: only the header row shows; tabs fade in once there is room */}
            <div className={snap === "peek" ? "opacity-0 pointer-events-none" : ""}>
                <InspectorTabs />
            </div>
            <div className={snap === "peek" ? "hidden" : "flex-1 min-h-0 scroll"}>
                <InspectorBody obj={obj} />
                <div className="h-4" />
            </div>
        </motion.section>
    );
}
