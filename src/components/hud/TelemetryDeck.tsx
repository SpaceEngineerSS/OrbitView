"use client";

import React, { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Navigation,
    Gauge,
    MapPin,
    TrendingUp,
    Orbit,
    X,
    Signal
} from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";
import { SpaceObject } from "@/lib/space-objects";

/**
 * TelemetryDeck - Bottom telemetry panel
 * ORBITAL GLASS 2.0 - Clean data visualization
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
}

const TelemetryCard: React.FC<TelemetryCardProps> = memo(({
    icon,
    label,
    value,
    unit,
}) => (
    <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl border border-white/5">
        <div className="flex items-center gap-1.5 mb-1">
            {icon}
            <span className="font-heading text-[9px] text-slate-400 tracking-widest uppercase">
                {label}
            </span>
        </div>
        <div className="flex items-baseline gap-1">
            <span className="font-data text-lg text-white tracking-wider">
                {value}
            </span>
            {unit && <span className="font-data text-xs text-slate-500">{unit}</span>}
        </div>
    </div>
));

TelemetryCard.displayName = "TelemetryCard";

const TelemetryDeck: React.FC<TelemetryDeckProps> = memo(({
    selectedObject,
    telemetry,
    onClose,
}) => {
    const altitudeDisplay = useMemo(() => {
        if (!telemetry) return { value: "---", unit: "km" };
        return { value: telemetry.alt.toFixed(1), unit: "km" };
    }, [telemetry]);

    const velocityDisplay = useMemo(() => {
        if (!telemetry) return { value: "---", unit: "km/s" };
        return { value: telemetry.velocity.toFixed(2), unit: "km/s" };
    }, [telemetry]);

    const latDisplay = useMemo(() => {
        if (!telemetry) return "---";
        const abs = Math.abs(telemetry.lat);
        const dir = telemetry.lat >= 0 ? "N" : "S";
        return `${abs.toFixed(3)}°${dir}`;
    }, [telemetry]);

    const lonDisplay = useMemo(() => {
        if (!telemetry) return "---";
        const abs = Math.abs(telemetry.lon);
        const dir = telemetry.lon >= 0 ? "E" : "W";
        return `${abs.toFixed(3)}°${dir}`;
    }, [telemetry]);

    const orbitalPeriod = useMemo(() => {
        if (!telemetry) return "---";
        const earthRadius = 6371;
        const altitude = telemetry.alt;
        const semiMajorAxis = earthRadius + altitude;
        const mu = 398600.4418;
        const periodSec = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu);
        const minutes = Math.round(periodSec / 60);
        return `${minutes}`;
    }, [telemetry]);

    return (
        <AnimatePresence>
            {selectedObject && (
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="fixed bottom-4 left-4 right-4 z-30 pointer-events-none"
                >
                    <GlassPanel
                        intensity="medium"
                        borderGlow={true}
                        className="mx-auto max-w-5xl pointer-events-auto"
                    >
                        <div className="p-4">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-live-dot absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
                                        </span>
                                        <span className="font-heading text-[10px] text-sky-400 tracking-widest">
                                            TRACKING
                                        </span>
                                    </div>
                                    <div className="h-4 w-px bg-white/10" />
                                    <h2 className="font-heading text-base text-white tracking-wide">
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
                                        className="p-2 rounded-lg glass-button text-slate-400 hover:text-white"
                                        aria-label="Close telemetry panel"
                                    >
                                        <X size={16} strokeWidth={1.5} />
                                    </button>
                                )}
                            </div>

                            {/* Telemetry Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                <TelemetryCard
                                    icon={<TrendingUp size={12} className="text-sky-400" strokeWidth={1.5} />}
                                    label="Altitude"
                                    value={altitudeDisplay.value}
                                    unit={altitudeDisplay.unit}
                                />

                                <TelemetryCard
                                    icon={<Gauge size={12} className="text-emerald-400" strokeWidth={1.5} />}
                                    label="Velocity"
                                    value={velocityDisplay.value}
                                    unit={velocityDisplay.unit}
                                />

                                <TelemetryCard
                                    icon={<MapPin size={12} className="text-violet-400" strokeWidth={1.5} />}
                                    label="Latitude"
                                    value={latDisplay}
                                    unit=""
                                />

                                <TelemetryCard
                                    icon={<Navigation size={12} className="text-violet-400" strokeWidth={1.5} />}
                                    label="Longitude"
                                    value={lonDisplay}
                                    unit=""
                                />

                                <TelemetryCard
                                    icon={<Orbit size={12} className="text-rose-400" strokeWidth={1.5} />}
                                    label="Period"
                                    value={orbitalPeriod}
                                    unit="min"
                                />

                                <div className="flex flex-col items-center justify-center p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Signal size={12} className="text-emerald-400" strokeWidth={1.5} />
                                        <span className="font-heading text-[9px] text-slate-400 tracking-widest uppercase">
                                            Signal
                                        </span>
                                    </div>
                                    <div className="flex items-end gap-0.5 h-5">
                                        {[1, 2, 3, 4, 5].map((bar) => (
                                            <div
                                                key={bar}
                                                className={`w-1 rounded-sm ${telemetry && telemetry.alt < 2000
                                                    ? bar <= 4 ? "bg-emerald-400" : "bg-white/10"
                                                    : bar <= 3 ? "bg-emerald-400" : "bg-white/10"
                                                    }`}
                                                style={{ height: `${bar * 3 + 4}px` }}
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
