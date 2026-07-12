import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

export interface SkyplotProps {
    trajectory?: { az: number; el: number }[];
    currentPos?: { az: number; el: number };
    className?: string;
}

const Skyplot: React.FC<SkyplotProps> = ({ trajectory = [], currentPos, className }) => {
    const size = 300;
    const center = size / 2;
    const radius = size / 2 - 20; // Padding

    // Convert Az/El (Deg) to SVG Coords (x,y)
    const polarToCartesian = (az: number, el: number) => {
        // Az: 0=N, 90=E, 180=S, 270=W
        // El: 90=Center, 0=Edge
        const clampedEl = Math.max(0, el);
        const r = radius * ((90 - clampedEl) / 90);
        const azRad = (az * Math.PI) / 180;

        // SVG Coordinate System:
        // x = cx + r * sin(az)  (Sin works because 0 is North/Up which is Y-axis but inverted in SVG? No.)
        // Standard Math: 0 is East (Right). SVG Y is down.
        // Let's derive: 
        // North (Az=0) -> (cx, cy-r). x=cx, y=cy-r.
        // East (Az=90) -> (cx+r, cy). x=cx+r, y=cy.
        // South (Az=180) -> (cx, cy+r). x=cx, y=cy+r.
        // West (Az=270) -> (cx-r, cy). x=cx-r, y=cy.

        // x = cx + r * sin(azRad)
        // sin(0)=0 -> x=cx. sin(90)=1 -> x=cx+r. sin(180)=0 -> x=cx. sin(270)=-1 -> x=cx-r. CORRECT.

        // y = cy - r * cos(azRad)
        // cos(0)=1 -> y=cy-r. cos(90)=0 -> y=cy. cos(180)=-1 -> y=cy+r. cos(270)=0 -> y=cy. CORRECT.

        const x = center + r * Math.sin(azRad);
        const y = center - r * Math.cos(azRad);
        return { x, y };
    };

    const pathData = useMemo(() => {
        if (!trajectory.length) return "";
        const points = trajectory.map(p => polarToCartesian(p.az, p.el));
        const d = points.reduce((acc, p, i) => {
            return acc + `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        }, "");
        return d;
    }, [trajectory]);

    const currentPoint = currentPos ? polarToCartesian(currentPos.az, currentPos.el) : null;

    return (
        <div className={clsx("relative aspect-square w-full h-full max-w-[400px] mx-auto", className)}>
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full pointer-events-none">
                {/* Background Grid */}
                <defs>
                    <radialGradient id="skyGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="rgba(6, 182, 212, 0.05)" />
                        <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
                    </radialGradient>
                </defs>

                <circle cx={center} cy={center} r={radius} fill="url(#skyGradient)" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" className="opacity-50" />
                <circle cx={center} cy={center} r={radius * 0.66} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" className="opacity-30" />
                <circle cx={center} cy={center} r={radius * 0.33} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" className="opacity-30" />

                {/* Degree Indicators (Outer Ring) */}
                {Array.from({ length: 12 }).map((_, i) => {
                    const deg = i * 30;
                    const rad = (deg * Math.PI) / 180;
                    const x1 = center + radius * Math.sin(rad);
                    const y1 = center - radius * Math.cos(rad);
                    const x2 = center + (radius + 5) * Math.sin(rad);
                    const y2 = center - (radius + 5) * Math.cos(rad);
                    return (
                        <g key={deg}>
                            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth="1" />
                            {i % 3 !== 0 && (
                                <text
                                    x={center + (radius + 15) * Math.sin(rad)}
                                    y={center - (radius + 15) * Math.cos(rad)}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill="#475569"
                                    fontSize="8"
                                    fontFamily="monospace"
                                >
                                    {deg}°
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Crosshairs */}
                <line x1={center} y1={center - radius} x2={center} y2={center + radius} stroke="#334155" strokeWidth="1" className="opacity-30" />
                <line x1={center - radius} y1={center} x2={center + radius} y2={center} stroke="#334155" strokeWidth="1" className="opacity-30" />

                {/* Zenith Indicator */}
                <circle cx={center} cy={center} r="2" fill="#94a3b8" />
                <text x={center} y={center + 12} textAnchor="middle" fill="#475569" fontSize="8" fontWeight="bold">ZENITH</text>

                {/* Main Cardinal Labels */}
                <text x={center} y={center - radius - 12} textAnchor="middle" fill="#06b6d4" fontSize="14" fontWeight="black">N</text>
                <text x={center + radius + 15} y={center + 5} textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">E</text>
                <text x={center} y={center + radius + 20} textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">S</text>
                <text x={center - radius - 15} y={center + 5} textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">W</text>

                {/* Elevation Labels */}
                <text x={center + 4} y={center - radius * 0.66 - 2} fill="#475569" fontSize="9" fontWeight="bold">30° EL</text>
                <text x={center + 4} y={center - radius * 0.33 - 2} fill="#475569" fontSize="9" fontWeight="bold">60° EL</text>

                {/* Trajectory */}
                <motion.path
                    d={pathData}
                    fill="none"
                    stroke="#06b6d4" // Cyan-500
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                />

                {/* Shadow for path */}
                <path d={pathData} fill="none" stroke="#06b6d4" strokeWidth="8" className="opacity-20 blur-[4px]" />

                {/* Current Position */}
                {currentPoint && (
                    <g>
                        <motion.circle
                            cx={currentPoint.x}
                            cy={currentPoint.y}
                            r="6"
                            fill="#22d3ee" // Cyan-400
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                        />
                        {/* Ping Effect */}
                        <circle cx={currentPoint.x} cy={currentPoint.y} r="6" fill="none" stroke="#22d3ee" strokeWidth="2" opacity="0.5">
                            <animate attributeName="r" from="6" to="20" dur="1.5s" repeatCount="indefinite" />
                            <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                    </g>
                )}
            </svg>

            {/* Live Indicator Text */}
            {currentPos && (
                <div className="absolute top-2 right-2 text-[10px] font-mono text-cyan-400">
                    <div>AZ: {currentPos.az.toFixed(1)}°</div>
                    <div>EL: {currentPos.el.toFixed(1)}°</div>
                </div>
            )}
        </div>
    );
};

export default Skyplot;
