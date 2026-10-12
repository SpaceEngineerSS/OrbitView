"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue } from "motion/react";

export type Snap = "peek" | "half" | "full";

export interface BottomSheetHandle {
    snapTo: (s: Snap) => void;
    snap: Snap;
}

interface BottomSheetProps {
    /** Height of the area the sheet can use (the full sheet fills it) */
    available: number;
    peek: number;
    header: ReactNode;
    children: ReactNode;
    label: string;
    expandLabel: string;
    collapseLabel: string;
    onSnapChange?: (s: Snap) => void;
}

const ORDER: Snap[] = ["peek", "half", "full"];

/**
 * Apple Maps-style sheet. The header area follows the finger; on release it
 * snaps to the nearest height, or one step in the direction of a flick.
 * Pointer capture keeps the gesture even if the finger leaves the header.
 */
export const BottomSheet = forwardRef<BottomSheetHandle, BottomSheetProps>(function BottomSheet(
    { available, peek, header, children, label, expandLabel, collapseLabel, onSnapChange },
    ref
) {
    const [snap, setSnap] = useState<Snap>("peek");
    const h = useMotionValue(peek);
    const heights: Record<Snap, number> = { peek, half: Math.round(available * 0.52), full: available };
    const drag = useRef<{ id: number; y0: number; h0: number; trail: { y: number; t: number }[] } | null>(null);
    const justDragged = useRef(false);

    const go = (s: Snap) => {
        setSnap(s);
        onSnapChange?.(s);
        animate(h, heights[s], { type: "spring", stiffness: 420, damping: 40 });
    };

    useImperativeHandle(ref, () => ({ snapTo: go, snap }));

    // Keep the current snap valid when the viewport changes
    useEffect(() => { h.set(heights[snap]); }, [available, peek]); // eslint-disable-line react-hooks/exhaustive-deps

    const onPointerDown = (e: React.PointerEvent) => {
        const el = e.target as HTMLElement;
        const btn = el.closest("button, input, a");
        if (btn && !(btn as HTMLElement).dataset.grip) return;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
        drag.current = { id: e.pointerId, y0: e.clientY, h0: h.get(), trail: [{ y: e.clientY, t: e.timeStamp }] };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        h.set(Math.max(peek - 40, Math.min(available, d.h0 - (e.clientY - d.y0))));
        d.trail.push({ y: e.clientY, t: e.timeStamp });
        while (d.trail.length > 2 && e.timeStamp - d.trail[0].t > 80) d.trail.shift();
    };
    const onPointerUp = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        drag.current = null;
        if (Math.abs(e.clientY - d.y0) < 6) return; // a tap
        justDragged.current = true;
        setTimeout(() => { justDragged.current = false; }, 50);
        const first = d.trail[0], last = d.trail[d.trail.length - 1];
        const v = -((last.y - first.y) / Math.max(1, last.t - first.t)) * 1000;
        if (Math.abs(v) > 600) {
            const i = ORDER.indexOf(snap) + (v > 0 ? 1 : -1);
            go(ORDER[Math.max(0, Math.min(2, i))]);
            return;
        }
        const cur = h.get();
        let best: Snap = "peek";
        for (const s of ORDER) if (Math.abs(heights[s] - cur) < Math.abs(heights[best] - cur)) best = s;
        go(best);
    };

    return (
        <motion.section
            aria-label={label}
            className="absolute inset-x-0 bottom-0 flex flex-col bg-card rounded-t-[28px] shadow-pop"
            style={{ height: h, zIndex: "var(--z-sheet)" }}
        >
            <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
                className="touch-none shrink-0 select-none px-4">
                <button type="button" data-grip="1"
                    aria-label={snap === "peek" ? expandLabel : collapseLabel}
                    onClick={() => { if (!justDragged.current) go(snap === "peek" ? "half" : "peek"); }}
                    className="w-full h-6 flex items-center justify-center">
                    <span aria-hidden className="block w-10 h-[5px] rounded-full bg-fill-strong" />
                </button>
                {header}
            </div>
            <div className="flex-1 min-h-0 scroll px-4 pb-[calc(var(--safe-bottom)+16px)]">{children}</div>
        </motion.section>
    );
});
