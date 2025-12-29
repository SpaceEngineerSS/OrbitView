"use client";

import React, { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Navigation,
    Gauge,
    MapPin,
    TrendingUp,
    Radio,
    Orbit,
    X
} from "lucide-react";
import { GlassPanel } from "@/components/UI/GlassPanel";
import { SpaceObject } from "@/lib/space-objects";

/**
 * TelemetryDeck - Bottom HUD panel displaying selected satellite telemetry
 * Shows real-time altitude, velocity, coordinates with JetBrains Mono font
 * 
 * @design_reference Aircraft HUD / Cockpit telemetry display aesthetics
 */

interface TelemetryData {
    lat: number;
    lon: number;
    alt: number;
    velocity: number;
}

interface TelemetryDeckProps {
    selectedObject: SpaceObject | null;
    telemetry: TelemetryData | null;
    onClose?: () => void;
}

interface TelemetryCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    unit: string;
    color?: "cyan" | "emerald" | "purple" | "rose";
}

const TelemetryCard: React.FC<TelemetryCardProps> = memo(({
    icon,
    label,
    value,
    unit,
    color = "cyan"
}) => {
    const colorClasses = {
        cyan: "text-cyan-400 border-cyan-500/30",
        emerald: "text-emerald-400 border-emerald-500/30",
        purple: "text-purple-400 border-purple-500/30",
        rose: "text-rose-400 border-rose-500/30",
    };

    return (
        <div className={`flex flex-col items-center p-3 bg-black/40 rounded-lg border ${colorClasses[color]}`}>
            <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <span className="font-heading text-[10px] text-slate-400 tracking-widest uppercase">
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className={`font-data text-xl tracking-wider ${colorClasses[color].split(' ')[0]}`}>
                    {value}
                </span>
                <span className="font-data text-xs text-slate-500">{unit}</span>
            </div>
        </div>
    );
});

TelemetryCard.displayName = "TelemetryCard";

const TelemetryDeck: React.FC<TelemetryDeckProps> = memo(({
    selectedObject,
    telemetry,
    onClose,
}) => {
    const altitudeDisplay = useMemo(() => {
        if (!telemetry) return { value: "---", unit: "km" };
        return {
            value: telemetry.alt.toFixed(1),
            unit: "km"
        };
    }, [telemetry]);

    const velocityDisplay = useMemo(() => {
        if (!telemetry) return { value: "---", unit: "km/s" };
        return {
            value: telemetry.velocity.toFixed(2),
            unit: "km/s"
        };
    }, [telemetry]);

    const latDisplay = useMemo(() => {
        if (!telemetry) return "---";
        const abs = Math.abs(telemetry.lat);
        const dir = telemetry.lat >= 0 ? "N" : "S";
        return `${abs.toFixed(4)}° ${dir}`;
    }, [telemetry]);

    const lonDisplay = useMemo(() => {
        if (!telemetry) return "---";
        const abs = Math.abs(telemetry.lon);
        const dir = telemetry.lon >= 0 ? "E" : "W";
        return `${abs.toFixed(4)}° ${dir}`;
    }, [telemetry]);

    // Calculate approximate orbital period (circular orbit approximation)
    const orbitalPeriod = useMemo(() => {
        if (!telemetry) return "---";
        const earthRadius = 6371; // km
        const altitude = telemetry.alt;
        const semiMajorAxis = earthRadius + altitude;
        // T = 2π√(a³/μ), where μ = 398600.4418 km³/s²
        const mu = 398600.4418;
        const periodSec = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu);
        const minutes = Math.round(periodSec / 60);
        return `${minutes}`;
    }, [telemetry]);

    return (
        <AnimatePresence>
            {selectedObject && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none"
                >
                    <GlassPanel
                        variant="elevated"
                        className="mx-auto max-w-5xl pointer-events-auto"
                        withGlow
                        neonColor="cyan"
                    >
                        <div className="p-4">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Radio size={16} className="text-cyan-500 animate-pulse" />
                                        <span className="font-heading text-xs text-cyan-500 tracking-widest">
                                            TRACKING
                                        </span>
                                    </div>
                                    <div className="h-4 w-px bg-white/20" />
                                    <h2 className="font-heading text-lg text-white tracking-wide">
                                        {selectedObject.name}
                                    </h2>
                                    <span className="font-data text-xs text-slate-500">
                                        #{selectedObject.id}
                                    </span>
                                </div>

                                {onClose && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            onClose();
                                        }}
                                        className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                                        aria-label="Close telemetry panel"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Telemetry Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                <TelemetryCard
                                    icon={<TrendingUp size={14} className="text-cyan-400" />}
                                    label="Altitude"
                                    value={altitudeDisplay.value}
                                    unit={altitudeDisplay.unit}
                                    color="cyan"
                                />

                                <TelemetryCard
                                    icon={<Gauge size={14} className="text-emerald-400" />}
                                    label="Velocity"
                                    value={velocityDisplay.value}
                                    unit={velocityDisplay.unit}
                                    color="emerald"
                                />

                                <TelemetryCard
                                    icon={<MapPin size={14} className="text-purple-400" />}
                                    label="Latitude"
                                    value={latDisplay}
                                    unit=""
                                    color="purple"
                                />

                                <TelemetryCard
                                    icon={<Navigation size={14} className="text-purple-400" />}
                                    label="Longitude"
                                    value={lonDisplay}
                                    unit=""
                                    color="purple"
                                />

                                <TelemetryCard
                                    icon={<Orbit size={14} className="text-rose-400" />}
                                    label="Period"
                                    value={orbitalPeriod}
                                    unit="min"
                                    color="rose"
                                />

                                <div className="flex flex-col items-center justify-center p-3 bg-black/40 rounded-lg border border-cyan-500/30">
                                    <span className="font-heading text-[10px] text-slate-400 tracking-widest uppercase mb-1">
                                        Signal
                                    </span>
                                    <div className="flex items-end gap-0.5 h-6">
                                        {[1, 2, 3, 4, 5].map((bar) => (
                                            <div
                                                key={bar}
                                                className={`w-1.5 rounded-sm transition-all ${telemetry && telemetry.alt < 2000
                                                        ? bar <= 4 ? "bg-cyan-500" : "bg-slate-700"
                                                        : bar <= 3 ? "bg-cyan-500" : "bg-slate-700"
                                                    }`}
                                                style={{ height: `${bar * 4 + 4}px` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassPanel>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

TelemetryDeck.displayName = "TelemetryDeck";

export default TelemetryDeck;
