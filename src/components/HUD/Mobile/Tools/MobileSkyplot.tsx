"use client";

import React, { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Compass, Satellite } from "lucide-react";
import { clsx } from "clsx";
import { SpaceObject } from "@/lib/space-objects";
import { TelemetryData } from "@/components/HUD/InfoPanel";

/**
 * MobileSkyplot - Polar plot showing satellite position in sky
 * SVG-based radar view with azimuth/elevation
 */

interface MobileSkyplotProps {
    isOpen: boolean;
    onBack: () => void;
    satellite: SpaceObject | null;
    telemetry?: TelemetryData | null;
    azimuth?: number;  // degrees 0-360
    elevation?: number; // degrees 0-90
}

const MobileSkyplot: React.FC<MobileSkyplotProps> = ({
    isOpen,
    onBack,
    satellite,
    telemetry,
    azimuth = 45,
    elevation = 60,
}) => {
    // Calculate satellite position on polar plot
    const satellitePosition = useMemo(() => {
        // Convert elevation to radius (90° = center, 0° = edge)
        const radius = ((90 - elevation) / 90) * 120; // 120 is the radius in SVG units

        // Convert azimuth to x,y (0° = North = top)
        const azRad = (azimuth - 90) * (Math.PI / 180);
        const x = 150 + radius * Math.cos(azRad);
        const y = 150 + radius * Math.sin(azRad);

        return { x, y, radius };
    }, [azimuth, elevation]);

    // Generate horizon circles (at 30°, 60°, 90° elevation)
    const circles = [
        { elevation: 0, radius: 120, label: '0°' },
        { elevation: 30, radius: 80, label: '30°' },
        { elevation: 60, radius: 40, label: '60°' },
    ];

    // Compass directions
    const directions = [
        { label: 'N', angle: 0 },
        { label: 'E', angle: 90 },
        { label: 'S', angle: 180 },
        { label: 'W', angle: 270 },
    ];

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-safe overflow-y-auto"
            style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}
        >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors tap-target"
                        aria-label="Go back"
                    >
                        <ArrowLeft size={24} strokeWidth={1.5} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-white font-semibold text-lg">Skyplot View</h1>
                        <p className="text-gray-500 text-xs truncate">
                            {satellite?.name || 'No satellite'}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Compass size={20} className="text-violet-400" strokeWidth={1.5} />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4">
                {/* Polar Plot */}
                <div className="relative bg-white/5 rounded-2xl border border-white/5 p-4 aspect-square max-w-[350px] mx-auto">
                    <svg viewBox="0 0 300 300" className="w-full h-full">
                        {/* Background gradient */}
                        <defs>
                            <radialGradient id="skyGradient" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.1)" />
                                <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                            </radialGradient>
                        </defs>
                        <circle cx="150" cy="150" r="120" fill="url(#skyGradient)" />

                        {/* Horizon circles */}
                        {circles.map((circle) => (
                            <circle
                                key={circle.elevation}
                                cx="150"
                                cy="150"
                                r={circle.radius}
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeWidth="1"
                                strokeDasharray={circle.elevation === 0 ? "none" : "4 4"}
                            />
                        ))}

                        {/* Cross lines (N-S, E-W) */}
                        <line x1="150" y1="30" x2="150" y2="270" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                        <line x1="30" y1="150" x2="270" y2="150" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />

                        {/* Diagonal lines (NE-SW, NW-SE) */}
                        <line x1="65" y1="65" x2="235" y2="235" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                        <line x1="235" y1="65" x2="65" y2="235" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />

                        {/* Compass directions */}
                        {directions.map((dir) => {
                            const rad = (dir.angle - 90) * (Math.PI / 180);
                            const x = 150 + 135 * Math.cos(rad);
                            const y = 150 + 135 * Math.sin(rad);
                            return (
                                <text
                                    key={dir.label}
                                    x={x}
                                    y={y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className={clsx(
                                        "text-xs font-bold",
                                        dir.label === 'N' ? "fill-emerald-400" : "fill-gray-500"
                                    )}
                                >
                                    {dir.label}
                                </text>
                            );
                        })}

                        {/* Elevation labels */}
                        {circles.slice(1).map((circle) => (
                            <text
                                key={`label-${circle.elevation}`}
                                x={150}
                                y={150 - circle.radius - 5}
                                textAnchor="middle"
                                className="text-[8px] fill-gray-600"
                            >
                                {circle.label}
                            </text>
                        ))}

                        {/* Zenith (90°) */}
                        <circle cx="150" cy="150" r="3" fill="rgba(255, 255, 255, 0.3)" />
                        <text x="150" y="140" textAnchor="middle" className="text-[8px] fill-gray-600">90°</text>

                        {/* Satellite position */}
                        {satellite && (
                            <>
                                {/* Glow effect */}
                                <circle
                                    cx={satellitePosition.x}
                                    cy={satellitePosition.y}
                                    r="12"
                                    fill="rgba(34, 211, 238, 0.2)"
                                />
                                {/* Satellite dot */}
                                <circle
                                    cx={satellitePosition.x}
                                    cy={satellitePosition.y}
                                    r="6"
                                    fill="#22d3ee"
                                    className="animate-pulse"
                                />
                                {/* Satellite label */}
                                <text
                                    x={satellitePosition.x}
                                    y={satellitePosition.y - 15}
                                    textAnchor="middle"
                                    className="text-[10px] fill-cyan-400 font-medium"
                                >
                                    {satellite.name.substring(0, 10)}
                                </text>
                            </>
                        )}
                    </svg>
                </div>

                {/* Position Info */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-gray-500 text-[10px] uppercase mb-1">Azimuth</p>
                        <p className="text-white font-mono text-lg">{azimuth.toFixed(1)}°</p>
                        <p className="text-gray-500 text-xs">
                            {azimuth >= 315 || azimuth < 45 ? 'N' :
                                azimuth < 135 ? 'E' :
                                    azimuth < 225 ? 'S' : 'W'}
                        </p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-gray-500 text-[10px] uppercase mb-1">Elevation</p>
                        <p className="text-white font-mono text-lg">{elevation.toFixed(1)}°</p>
                        <p className="text-gray-500 text-xs">
                            {elevation < 10 ? 'Low' : elevation < 45 ? 'Medium' : 'High'}
                        </p>
                    </div>
                </div>

                {/* Telemetry Summary */}
                {telemetry && (
                    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Satellite size={16} className="text-cyan-400" />
                            <span className="text-gray-400 text-xs uppercase tracking-wider">Position</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-gray-500 text-[10px]">ALT</p>
                                <p className="text-white font-mono">{telemetry.alt.toFixed(0)} km</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-[10px]">LAT</p>
                                <p className="text-white font-mono">{telemetry.lat.toFixed(2)}°</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-[10px]">LON</p>
                                <p className="text-white font-mono">{telemetry.lon.toFixed(2)}°</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default memo(MobileSkyplot);
