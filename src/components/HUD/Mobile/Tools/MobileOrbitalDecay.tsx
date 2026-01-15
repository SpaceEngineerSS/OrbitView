"use client";

import React, { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
    ArrowLeft, TrendingDown, Calendar, AlertTriangle,
    Clock, Activity
} from "lucide-react";
import { clsx } from "clsx";
import { SpaceObject } from "@/lib/space-objects";
import {
    predictOrbitalDecay,
    parseBStar,
    formatLifetime,
    DecayPrediction
} from "@/lib/OrbitalDecay";
import { TelemetryData } from "@/components/HUD/InfoPanel";

/**
 * MobileOrbitalDecay - Orbital decay analysis tool
 * Shows lifetime prediction and altitude history
 */

interface MobileOrbitalDecayProps {
    isOpen: boolean;
    onBack: () => void;
    satellite: SpaceObject | null;
    telemetry?: TelemetryData | null;
}

const MobileOrbitalDecay: React.FC<MobileOrbitalDecayProps> = ({
    isOpen,
    onBack,
    satellite,
    telemetry,
}) => {
    // Calculate decay prediction
    const decayData = useMemo<DecayPrediction | null>(() => {
        if (!satellite?.tle) return null;

        try {
            const bstar = parseBStar(satellite.tle.line1);
            const altitudeKm = telemetry?.alt || 400;
            const semiMajorAxis = altitudeKm + 6371; // Add Earth radius

            return predictOrbitalDecay(semiMajorAxis, 0.001, bstar, new Date());
        } catch {
            return null;
        }
    }, [satellite, telemetry]);

    // Risk level colors
    const getRiskColor = (level: string) => {
        switch (level) {
            case 'critical': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            case 'high': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        }
    };

    // Mini chart - simple SVG line
    const renderMiniChart = () => {
        if (!decayData || decayData.altitudeHistory.length === 0) return null;

        const history = decayData.altitudeHistory;
        const maxAlt = Math.max(...history.map(h => h.altitude));
        const minAlt = Math.min(...history.map(h => h.altitude));
        const range = maxAlt - minAlt || 1;

        const width = 300;
        const height = 100;
        const padding = 10;

        const points = history.map((h, i) => {
            const x = padding + (i / (history.length - 1)) * (width - padding * 2);
            const y = height - padding - ((h.altitude - minAlt) / range) * (height - padding * 2);
            return `${x},${y}`;
        }).join(' ');

        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
                {/* Grid lines */}
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />

                {/* Decay line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke="url(#decayGradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Gradient definition */}
                <defs>
                    <linearGradient id="decayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#f43f5e" />
                    </linearGradient>
                </defs>

                {/* Labels */}
                <text x={padding} y={padding - 2} className="text-[8px] fill-gray-500">
                    {maxAlt.toFixed(0)} km
                </text>
                <text x={width - padding} y={height - 2} className="text-[8px] fill-gray-500 text-right">
                    Future
                </text>
            </svg>
        );
    };

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
                        <h1 className="text-white font-semibold text-lg">Orbital Decay</h1>
                        <p className="text-gray-500 text-xs truncate">
                            {satellite?.name || 'No satellite'}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <TrendingDown size={20} className="text-amber-400" strokeWidth={1.5} />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4 space-y-4">
                {!satellite?.tle ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertTriangle size={40} className="text-amber-400 mb-4" />
                        <p className="text-white text-lg font-medium mb-2">No TLE Data</p>
                        <p className="text-gray-500 text-sm">
                            Orbital decay analysis requires TLE data
                        </p>
                    </div>
                ) : decayData ? (
                    <>
                        {/* Risk Level */}
                        <div className={clsx(
                            "p-4 rounded-xl border",
                            getRiskColor(decayData.riskLevel)
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={18} />
                                <span className="uppercase text-xs font-bold tracking-wider">
                                    {decayData.riskLevel} Risk
                                </span>
                            </div>
                            <p className="text-white text-2xl font-mono font-bold">
                                {formatLifetime(decayData.estimatedLifetimeDays)}
                            </p>
                            <p className="text-white/70 text-sm mt-1">
                                Estimated remaining lifetime
                            </p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Activity size={14} className="text-cyan-400" />
                                    <p className="text-gray-500 text-[10px] uppercase">Current Alt</p>
                                </div>
                                <p className="text-white font-mono text-lg">
                                    {decayData.currentAltitudeKm.toFixed(1)} km
                                </p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingDown size={14} className="text-rose-400" />
                                    <p className="text-gray-500 text-[10px] uppercase">Decay Rate</p>
                                </div>
                                <p className="text-white font-mono text-lg">
                                    {(decayData.decayRateKmPerDay * 1000).toFixed(1)} m/day
                                </p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar size={14} className="text-violet-400" />
                                    <p className="text-gray-500 text-[10px] uppercase">Re-entry Est.</p>
                                </div>
                                <p className="text-white font-mono text-sm">
                                    {decayData.estimatedReentryDate.toLocaleDateString()}
                                </p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock size={14} className="text-amber-400" />
                                    <p className="text-gray-500 text-[10px] uppercase">Days Left</p>
                                </div>
                                <p className="text-white font-mono text-lg">
                                    {Math.round(decayData.estimatedLifetimeDays)}
                                </p>
                            </div>
                        </div>

                        {/* Altitude Chart */}
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
                                Altitude Projection
                            </h3>
                            {renderMiniChart()}
                        </div>

                        {/* Info Note */}
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <p className="text-blue-400 text-xs">
                                ℹ️ Predictions use simplified King-Hele decay model.
                                Actual decay varies with solar activity (±50%).
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Activity size={40} className="text-gray-600 mb-4 animate-pulse" />
                        <p className="text-gray-500 text-sm">Calculating decay prediction...</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default memo(MobileOrbitalDecay);
