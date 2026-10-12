"use client";

import { useMemo } from "react";
import type { SatRec } from "satellite.js";
import { stateAt, lookAngles, type ObserverGeodetic } from "@/lib/orbit";
import type { SatellitePass } from "@/lib/PassPrediction";

interface SkyplotProps {
    rec: SatRec;
    observer: ObserverGeodetic;
    pass: SatellitePass | null;
    /** Current look angles, drawn as the live marker if above the horizon */
    now?: { azimuthDeg: number; elevationDeg: number } | null;
    labels: { n: string; e: string; s: string; w: string };
    title: string;
}

const R = 100;

/** Polar plot: centre is the zenith, the rim is the horizon, north up. */
function project(az: number, el: number): [number, number] {
    const r = R * (1 - Math.max(0, el) / 90);
    const a = (az * Math.PI) / 180;
    return [r * Math.sin(a), -r * Math.cos(a)];
}

export default function Skyplot({ rec, observer, pass, now, labels, title }: SkyplotProps) {
    const path = useMemo(() => {
        if (!pass) return null;
        const pts: [number, number][] = [];
        const a = pass.aosTime.getTime(), b = pass.losTime.getTime();
        const step = Math.max(5_000, (b - a) / 120);
        for (let t = a; t <= b; t += step) {
            const s = stateAt(rec, new Date(t));
            if (!s) continue;
            const l = lookAngles(s, observer);
            pts.push(project(l.azimuthDeg, l.elevationDeg));
        }
        return pts;
    }, [rec, observer, pass]);

    const live = now && now.elevationDeg > 0 ? project(now.azimuthDeg, now.elevationDeg) : null;
    const maxPt = pass ? project(pass.azimuthMax, pass.maxElevation) : null;

    return (
        <svg viewBox="-118 -118 236 236" className="w-full max-w-[260px] mx-auto block" role="img" aria-label={title}>
            {/* elevation rings at 0, 30, 60° */}
            {[0, 30, 60].map((el) => (
                <circle key={el} r={R * (1 - el / 90)} fill="none" stroke="var(--c-rule-strong)" strokeWidth={el === 0 ? 1 : 0.6}
                    strokeDasharray={el === 0 ? undefined : "2 3"} />
            ))}
            {/* azimuth spokes every 30° with ticks */}
            {Array.from({ length: 12 }, (_, i) => {
                const [x, y] = project(i * 30, 0);
                return <line key={i} x1={0} y1={0} x2={x} y2={y} stroke="var(--c-rule)" strokeWidth={0.5} />;
            })}
            {Array.from({ length: 72 }, (_, i) => {
                const a = (i * 5 * Math.PI) / 180, l = i % 6 === 0 ? 6 : 3;
                return <line key={`t${i}`} x1={R * Math.sin(a)} y1={-R * Math.cos(a)} x2={(R + l) * Math.sin(a)} y2={-(R + l) * Math.cos(a)}
                    stroke="var(--c-rule-strong)" strokeWidth={0.6} />;
            })}
            <g className="num" fontSize="9" fill="var(--c-text-dim)" textAnchor="middle">
                <text x={0} y={-R - 9}>{labels.n}</text>
                <text x={R + 12} y={3}>{labels.e}</text>
                <text x={0} y={R + 15}>{labels.s}</text>
                <text x={-R - 12} y={3}>{labels.w}</text>
                <text x={3} y={-R * (2 / 3) + 9} fontSize="7" textAnchor="start" fill="var(--c-text-faint)">30°</text>
                <text x={3} y={-R * (1 / 3) + 9} fontSize="7" textAnchor="start" fill="var(--c-text-faint)">60°</text>
            </g>

            {path && path.length > 1 && (
                <>
                    <polyline points={path.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--c-accent)" strokeWidth={1.4} />
                    <circle cx={path[0][0]} cy={path[0][1]} r={2.4} fill="var(--c-bg)" stroke="var(--c-accent)" strokeWidth={1} />
                    <rect x={path[path.length - 1][0] - 2.2} y={path[path.length - 1][1] - 2.2} width={4.4} height={4.4}
                        fill="var(--c-accent)" />
                </>
            )}
            {maxPt && <circle cx={maxPt[0]} cy={maxPt[1]} r={1.6} fill="var(--c-accent)" />}
            {live && (
                <g>
                    <circle cx={live[0]} cy={live[1]} r={4.5} fill="none" stroke="var(--c-text)" strokeWidth={1} />
                    <circle cx={live[0]} cy={live[1]} r={1.5} fill="var(--c-text)" />
                </g>
            )}
            <circle r={1.2} fill="var(--c-text-faint)" />
        </svg>
    );
}
