"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import type { SatellitePass } from "@/lib/PassPrediction";
import type { ObserverGeodetic } from "@/lib/orbit";
import { lookAngles } from "@/lib/orbit";
import { calculateSunPosition } from "@/lib/CoordinateConverter";
import { cx } from "@/components/ui/cx";

/* ------------------------------------------------------------------ */
/* Pass strip: 48 h at a glance                                        */
/* ------------------------------------------------------------------ */

/** Intervals where the sun is more than 6° below the observer's horizon. */
function nightBands(obs: ObserverGeodetic, start: number, end: number): [number, number][] {
    const out: [number, number][] = [];
    const step = 10 * 60_000;
    let open: number | null = null;
    for (let t = start; t <= end; t += step) {
        const sun = calculateSunPosition(new Date(t));
        const dark = lookAngles({ positionEcf: sun, velocityEcf: { x: 0, y: 0, z: 0 } }, obs).elevationDeg < -6;
        if (dark && open === null) open = t;
        if (!dark && open !== null) { out.push([open, t]); open = null; }
    }
    if (open !== null) out.push([open, end]);
    return out;
}

interface PassStripProps {
    passes: SatellitePass[];
    observer: ObserverGeodetic;
    start: number;
    end: number;
    now: number;
    selected?: number;
    onSelect?: (i: number) => void;
    tickLabel: (t: number) => string;
    height?: number;
    label: string;
}

/**
 * Every pass in the window as a bar: position = time, height = maximum
 * elevation, green = visible to the eye. Night is shaded so you can see at a
 * glance which passes happen in the dark.
 */
/** Width of an element in CSS pixels, kept up to date. */
function useWidth<T extends HTMLElement>(fallback = 320) {
    const ref = useRef<T>(null);
    const [w, setW] = useState(fallback);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setW(Math.max(1, Math.round(e.contentRect.width))));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, w] as const;
}

export function PassStrip({ passes, observer, start, end, now, selected, onSelect, tickLabel, height = 72, label }: PassStripProps) {
    const [box, W] = useWidth<HTMLDivElement>();
    const H = height;
    const base = H - 16;
    const x = (t: number) => ((t - start) / (end - start)) * W;
    // Night bands only move with the Sun: key them on a 6 h bucket, not on "now".
    const sixH = 6 * 3600_000;
    const nightFrom = Math.floor(start / sixH) * sixH;
    const nightTo = Math.ceil(end / sixH) * sixH;
    const nights = useMemo(() => nightBands(observer, nightFrom, nightTo), [observer, nightFrom, nightTo]);
    const ticks = useMemo(() => {
        const out: number[] = [];
        const six = 6 * 3600_000;
        for (let t = Math.ceil(start / six) * six; t < end; t += six) out.push(t);
        return out;
    }, [start, end]);

    return (
        <div ref={box} className="w-full">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" role="img" aria-label={label}>
            {nights.map(([a, b]) => (
                <rect key={a} x={x(a)} y={0} width={Math.max(0, x(b) - x(a))} height={base} fill="var(--indigo-soft)" />
            ))}
            <line x1={0} x2={W} y1={base} y2={base} stroke="var(--separator)" strokeWidth={1} />
            {passes.map((p, i) => {
                const a = p.aosTime.getTime(), b = p.losTime.getTime();
                const h = Math.max(4, (p.maxElevation / 90) * (base - 4));
                const w = Math.max(5, x(b) - x(a));
                const past = b < now;
                const color = p.visible ? "var(--green)" : "var(--accent)";
                return (
                    <motion.rect
                        key={a}
                        initial={{ height: 0, y: base }}
                        animate={{ height: h, y: base - h }}
                        transition={{ type: "spring", stiffness: 260, damping: 28, delay: i * 0.02 }}
                        x={x(a) - (w - (x(b) - x(a))) / 2}
                        width={w}
                        rx={2.5}
                        fill={color}
                        opacity={past ? 0.3 : selected === i ? 1 : 0.8}
                        stroke={selected === i ? "var(--text)" : "none"}
                        strokeWidth={selected === i ? 2 : 0}
                       
                        style={{ cursor: onSelect ? "pointer" : undefined }}
                        onClick={onSelect ? () => onSelect(i) : undefined}
                    />
                );
            })}
            {now >= start && now <= end && (
                <line x1={x(now)} x2={x(now)} y1={0} y2={base} stroke="var(--text)" strokeWidth={1.5} />
            )}
            {ticks.map((t) => (
                <text key={t} x={x(t)} y={H - 2} fontSize={11} fill="var(--text-3)" textAnchor="middle" className="select-none">
                    {tickLabel(t)}
                </text>
            ))}
        </svg>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Elevation arc: where in the current pass the satellite is           */
/* ------------------------------------------------------------------ */

export function ElevationArc({ progress, maxElevation, tone = "accent", label }: {
    progress: number;
    maxElevation: number;
    tone?: "accent" | "green";
    label: string;
}) {
    const W = 240, H = 92;
    const peak = 16 + (1 - Math.min(90, maxElevation) / 90) * 46;
    // Quadratic Bézier from (16, H-14) through peak to (W-16, H-14)
    const p0 = { x: 16, y: H - 14 }, p2 = { x: W - 16, y: H - 14 };
    const p1 = { x: W / 2, y: 2 * peak - (p0.y + p2.y) / 2 };
    const t = Math.max(0, Math.min(1, progress));
    const pt = {
        x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x,
        y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y,
    };
    const color = tone === "green" ? "var(--green)" : "var(--accent)";
    const d = `M${p0.x},${p0.y} Q${p1.x},${p1.y} ${p2.x},${p2.y}`;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" role="img" aria-label={label}>
            <line x1={4} x2={W - 4} y1={H - 14} y2={H - 14} stroke="var(--separator)" strokeWidth={1.5} />
            <path d={d} fill="none" stroke="var(--fill-strong)" strokeWidth={3} strokeLinecap="round" />
            <motion.path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: t }} transition={{ type: "spring", stiffness: 120, damping: 24 }} />
            <motion.circle r={7} fill="var(--card)" stroke={color} strokeWidth={3}
                animate={{ cx: pt.x, cy: pt.y }} transition={{ type: "spring", stiffness: 120, damping: 24 }} />
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/* Orbit shape: perigee / apogee to scale                              */
/* ------------------------------------------------------------------ */

export function OrbitShape({ perigeeKm, apogeeKm, inclinationDeg, label }: {
    perigeeKm: number;
    apogeeKm: number;
    inclinationDeg: number;
    label: string;
}) {
    const R = 6378;
    const rp = R + perigeeKm, ra = R + apogeeKm;
    const a = (rp + ra) / 2, c = (ra - rp) / 2, b = Math.sqrt(Math.max(0, a * a - c * c));
    const W = 220, H = 120;
    const s = Math.min((W / 2 - 10) / a, (H / 2 - 10) / b, 1);
    const scale = Math.min(s, (H / 2 - 10) / R);
    const cx0 = W / 2, cy0 = H / 2;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" role="img" aria-label={label}>
            {/* Earth sits at one focus */}
            <circle cx={cx0 + c * scale} cy={cy0} r={R * scale} fill="var(--accent-soft)" stroke="var(--accent)" strokeOpacity={0.35} />
            <ellipse cx={cx0} cy={cy0} rx={a * scale} ry={b * scale} fill="none" stroke="var(--text)" strokeWidth={1.6}
                transform={`rotate(${-Math.min(inclinationDeg, 90) / 6} ${cx0} ${cy0})`} />
            <circle cx={cx0 - a * scale} cy={cy0} r={3.5} fill="var(--orange)" />
            <circle cx={cx0 + a * scale} cy={cy0} r={3.5} fill="var(--green)" />
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/* Range bar: min – estimate – max on a log scale                      */
/* ------------------------------------------------------------------ */

export function RangeBar({ min, value, max, maxScale, label, className }: {
    min: number;
    value: number;
    max: number;
    /** Right edge of the bar, same unit as the values */
    maxScale: number;
    label: string;
    className?: string;
}) {
    const pos = (v: number) => {
        const lo = Math.log10(1), hi = Math.log10(Math.max(2, maxScale));
        const lv = Math.log10(Math.max(1, Math.min(maxScale, Number.isFinite(v) ? v : maxScale)));
        return ((lv - lo) / (hi - lo)) * 100;
    };
    return (
        <div className={cx("relative h-2 rounded-full bg-fill", className)} role="img" aria-label={label}>
            <motion.div
                className="absolute top-0 bottom-0 rounded-full bg-orange-soft"
                initial={{ left: `${pos(value)}%`, right: `${100 - pos(value)}%` }}
                animate={{ left: `${pos(min)}%`, right: `${100 - pos(max)}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 26 }}
            />
            <motion.div
                className="absolute -top-1 h-4 w-4 -ml-2 rounded-full bg-orange border-[3px] border-card"
                initial={{ left: "0%" }}
                animate={{ left: `${pos(value)}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 26 }}
            />
        </div>
    );
}
