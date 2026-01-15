"use client";

import React, { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Satellite, Activity, Gauge, MapPin,
    ArrowUp, Clock, Radio, Orbit, Compass,
    TrendingUp, Zap
} from "lucide-react";
import { clsx } from "clsx";
import { SpaceObject } from "@/lib/space-objects";
import { TelemetryData } from "@/components/HUD/InfoPanel";

/**
 * MobileTelemetryView - Full-screen telemetry dashboard for mobile
 * Shows detailed satellite data when Data tab is active
 */

interface MobileTelemetryViewProps {
    isOpen: boolean;
    onClose: () => void;
    satellite: SpaceObject | null;
    telemetry?: TelemetryData | null;
}

interface DataCardProps {
    icon: React.ElementType;
    label: string;
    value: string;
    unit?: string;
    color?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose';
    large?: boolean;
}

const DataCard: React.FC<DataCardProps> = ({
    icon: Icon,
    label,
    value,
    unit,
    color = 'cyan',
    large = false
}) => {
    const colorClasses = {
        cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
        rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    };

    return (
        <div className={clsx(
            "bg-white/5 rounded-xl p-4 border border-white/5",
            large && "col-span-2"
        )}>
            <div className="flex items-center gap-2 mb-2">
                <div className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center border",
                    colorClasses[color]
                )}>
                    <Icon size={16} strokeWidth={1.5} />
                </div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className={clsx(
                    "font-mono font-semibold",
                    large ? "text-3xl" : "text-xl",
                    "text-white"
                )}>
                    {value}
                </span>
                {unit && (
                    <span className="text-gray-500 text-sm">{unit}</span>
                )}
            </div>
        </div>
    );
};

const MobileTelemetryView: React.FC<MobileTelemetryViewProps> = ({
    isOpen,
    onClose,
    satellite,
    telemetry,
}) => {
    // Calculate orbital period (approximate)
    const orbitalPeriod = useMemo(() => {
        if (!telemetry) return null;
        const altitudeKm = telemetry.alt;
        const earthRadius = 6371; // km
        const mu = 398600.4418; // km³/s² (Earth's gravitational parameter)
        const semiMajorAxis = earthRadius + altitudeKm;
        const period = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu);
        return Math.round(period / 60); // Convert to minutes
    }, [telemetry]);

    // Determine satellite type styling
    const isStarlink = satellite?.name.toUpperCase().includes('STARLINK');
    const isISS = satellite?.name.toUpperCase().includes('ISS') || satellite?.name.toUpperCase().includes('ZARYA');
    const accentColor = isStarlink ? 'blue' : isISS ? 'violet' : 'cyan';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-safe overflow-y-auto"
                    style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/5">
                        <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                    <Activity size={20} className="text-cyan-400" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h1 className="text-white font-semibold text-lg">Mission Data</h1>
                                    <p className="text-gray-500 text-xs">Real-time Telemetry</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-white transition-colors tap-target"
                                aria-label="Close telemetry view"
                            >
                                <X size={24} strokeWidth={1.5} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 py-4">
                        {!satellite ? (
                            /* Empty State */
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <Satellite size={40} className="text-gray-600" strokeWidth={1} />
                                </div>
                                <h2 className="text-white text-lg font-medium mb-2">No Satellite Selected</h2>
                                <p className="text-gray-500 text-sm max-w-[250px]">
                                    Search and select a satellite to view real-time telemetry data
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Satellite Header */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Satellite size={20} className={clsx(
                                            isStarlink ? "text-blue-400" :
                                                isISS ? "text-violet-400" : "text-cyan-400"
                                        )} />
                                        <h2 className="text-white font-semibold text-xl truncate">
                                            {satellite.name}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-500 text-sm font-mono">#{satellite.id}</span>
                                        {satellite.category && (
                                            <span className={clsx(
                                                "text-xs px-2 py-0.5 rounded border",
                                                isStarlink ? "text-blue-400 bg-blue-500/10 border-blue-500/20" :
                                                    isISS ? "text-violet-400 bg-violet-500/10 border-violet-500/20" :
                                                        "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                                            )}>
                                                {satellite.category}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1 text-emerald-400 text-xs">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            LIVE
                                        </span>
                                    </div>
                                </div>

                                {/* Telemetry Grid */}
                                {telemetry ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Altitude - Large */}
                                        <DataCard
                                            icon={ArrowUp}
                                            label="Altitude"
                                            value={telemetry.alt.toFixed(1)}
                                            unit="km"
                                            color="cyan"
                                            large
                                        />

                                        {/* Velocity */}
                                        <DataCard
                                            icon={Gauge}
                                            label="Velocity"
                                            value={telemetry.velocity.toFixed(2)}
                                            unit="km/s"
                                            color="emerald"
                                        />

                                        {/* Orbital Period */}
                                        <DataCard
                                            icon={Clock}
                                            label="Orbital Period"
                                            value={orbitalPeriod?.toString() || '---'}
                                            unit="min"
                                            color="amber"
                                        />

                                        {/* Latitude */}
                                        <DataCard
                                            icon={MapPin}
                                            label="Latitude"
                                            value={telemetry.lat.toFixed(4)}
                                            unit="°"
                                            color="violet"
                                        />

                                        {/* Longitude */}
                                        <DataCard
                                            icon={Compass}
                                            label="Longitude"
                                            value={telemetry.lon.toFixed(4)}
                                            unit="°"
                                            color="rose"
                                        />

                                        {/* Speed (km/h) */}
                                        <DataCard
                                            icon={Zap}
                                            label="Speed"
                                            value={(telemetry.velocity * 3600).toFixed(0)}
                                            unit="km/h"
                                            color="cyan"
                                            large
                                        />
                                    </div>
                                ) : (
                                    /* Loading State */
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <Radio size={32} className="text-cyan-400 animate-pulse mb-3" />
                                        <p className="text-gray-500 text-sm">Acquiring signal...</p>
                                    </div>
                                )}

                                {/* TLE Info Section */}
                                {satellite.tle && (
                                    <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/5">
                                        <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Orbit size={12} />
                                            TLE Data
                                        </h3>
                                        <div className="space-y-2 font-mono text-[10px] text-gray-500 break-all">
                                            <p className="text-gray-400">{satellite.tle.line1}</p>
                                            <p className="text-gray-400">{satellite.tle.line2}</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default memo(MobileTelemetryView);
