"use client";

import React, { useMemo, useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { Flame, Calendar, TrendingDown, AlertTriangle, Shield, Clock, Sun, Activity } from "lucide-react";
import { clsx } from "clsx";
import {
    predictOrbitalDecay,
    parseBStar,
    getAltitudeColor,
    formatLifetime,
    DecayPrediction
} from "@/lib/OrbitalDecay";
import {
    fetchSpaceWeather,
    SpaceWeatherData,
    getKpColor,
    formatKpIndex,
    getDensityCorrectionFactor
} from "@/lib/SpaceWeather";

interface DecayPanelProps {
    tleLine1: string | null;
    altitudeKm: number | null;
    eccentricity?: number;
    satelliteName?: string;
}

const DecayPanel: React.FC<DecayPanelProps> = ({
    tleLine1,
    altitudeKm,
    eccentricity = 0.001,
    satelliteName = "Unknown"
}) => {
    const [spaceWeather, setSpaceWeather] = useState<SpaceWeatherData | null>(null);
    const [weatherLoading, setWeatherLoading] = useState(true);

    // Fetch space weather data
    useEffect(() => {
        fetchSpaceWeather()
            .then(data => setSpaceWeather(data))
            .catch(console.error)
            .finally(() => setWeatherLoading(false));
    }, []);

    // Calculate decay prediction with space weather correction
    const prediction = useMemo<DecayPrediction | null>(() => {
        if (!tleLine1 || !altitudeKm || altitudeKm < 0) return null;

        const bstar = parseBStar(tleLine1);
        const semiMajorAxis = 6371 + altitudeKm;

        // Apply space weather correction if available
        const densityFactor = spaceWeather ? getDensityCorrectionFactor(spaceWeather) : 1.0;
        const adjustedBstar = bstar * densityFactor;

        return predictOrbitalDecay(semiMajorAxis, eccentricity, adjustedBstar);
    }, [tleLine1, altitudeKm, eccentricity, spaceWeather]);

    if (!prediction) {
        return (
            <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-4">
                    <Flame size={18} />
                    <span className="text-sm font-bold">Orbital Decay</span>
                </div>
                <div className="h-32 flex flex-col items-center justify-center text-center">
                    <TrendingDown size={32} className="text-slate-700 mb-2" />
                    <span className="text-xs text-slate-600">Select a satellite to analyze decay</span>
                </div>
            </div>
        );
    }

    const riskColors = {
        low: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400' },
        medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400' },
        high: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-400' },
        critical: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400' }
    };

    const colors = riskColors[prediction.riskLevel];

    // Calculate chart dimensions
    const chartHeight = 80;
    const maxAlt = Math.max(...prediction.altitudeHistory.map(p => p.altitude), prediction.currentAltitudeKm);
    const maxDays = prediction.altitudeHistory[prediction.altitudeHistory.length - 1]?.days || 1;

    // Generate SVG path
    const pathPoints = prediction.altitudeHistory.map((point, i) => {
        const x = (point.days / maxDays) * 100;
        const y = chartHeight - (point.altitude / maxAlt) * chartHeight;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx("bg-slate-950/80 backdrop-blur-xl border rounded-xl overflow-hidden", colors.border)}
        >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={clsx("p-2 rounded-lg border", colors.bg, colors.border)}>
                        <Flame size={16} className={colors.text} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Orbital Decay</h3>
                        <span className="text-[10px] text-slate-500 font-mono">{satelliteName}</span>
                    </div>
                </div>
                <div className={clsx("flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase", colors.bg, colors.text)}>
                    {prediction.riskLevel === 'critical' && <AlertTriangle size={12} />}
                    {prediction.riskLevel === 'low' && <Shield size={12} />}
                    {prediction.riskLevel}
                </div>
            </div>

            {/* Main Content */}
            <div className="p-4 space-y-4">
                {/* Current Status */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                        <div className="text-[10px] text-slate-500 mb-1 font-bold tracking-wider flex items-center gap-1">
                            <TrendingDown size={10} /> ALTITUDE
                        </div>
                        <div className="font-mono text-lg font-bold" style={{ color: getAltitudeColor(prediction.currentAltitudeKm) }}>
                            {prediction.currentAltitudeKm.toFixed(1)} km
                        </div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                        <div className="text-[10px] text-slate-500 mb-1 font-bold tracking-wider flex items-center gap-1">
                            <Clock size={10} /> LIFETIME
                        </div>
                        <div className={clsx("font-mono text-lg font-bold", colors.text)}>
                            {formatLifetime(prediction.estimatedLifetimeDays)}
                        </div>
                    </div>
                </div>

                {/* Decay Rate */}
                <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-slate-500 font-bold tracking-wider">DECAY RATE</span>
                        <span className="text-xs font-mono text-slate-400">
                            {prediction.decayRateKmPerDay < 0.01
                                ? `${(prediction.decayRateKmPerDay * 1000).toFixed(2)} m/day`
                                : `${prediction.decayRateKmPerDay.toFixed(3)} km/day`
                            }
                        </span>
                    </div>
                    {/* Progress bar showing how much has decayed vs total */}
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (1 - prediction.currentAltitudeKm / 800) * 100)}%` }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${getAltitudeColor(400)}, ${getAltitudeColor(prediction.currentAltitudeKm)})` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-[8px] text-slate-600">
                        <span>800 km</span>
                        <span>120 km (reentry)</span>
                    </div>
                </div>

                {/* Altitude History Chart */}
                <div>
                    <div className="text-[10px] text-slate-500 font-bold tracking-wider mb-2">
                        ALTITUDE PROJECTION
                    </div>
                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                        <svg width="100%" height={chartHeight} className="overflow-visible">
                            {/* Grid lines */}
                            <line x1="0" y1={chartHeight} x2="100%" y2={chartHeight} stroke="#334155" strokeWidth="0.5" />
                            <line x1="0" y1={chartHeight / 2} x2="100%" y2={chartHeight / 2} stroke="#334155" strokeWidth="0.5" strokeDasharray="4" />
                            <line x1="0" y1="0" x2="100%" y2="0" stroke="#334155" strokeWidth="0.5" strokeDasharray="4" />

                            {/* Reentry line */}
                            <line
                                x1="0"
                                y1={chartHeight - (120 / maxAlt) * chartHeight}
                                x2="100%"
                                y2={chartHeight - (120 / maxAlt) * chartHeight}
                                stroke="#ef4444"
                                strokeWidth="1"
                                strokeDasharray="4"
                            />

                            {/* Decay curve */}
                            <path
                                d={pathPoints}
                                fill="none"
                                stroke="url(#decayGradient)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            {/* Gradient definition */}
                            <defs>
                                <linearGradient id="decayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#22c55e" />
                                    <stop offset="50%" stopColor="#eab308" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Labels */}
                        <div className="flex justify-between mt-2 text-[8px] text-slate-600">
                            <span>Now</span>
                            <span>{formatLifetime(maxDays)}</span>
                        </div>
                    </div>
                </div>

                {/* Space Weather Conditions */}
                {spaceWeather && (
                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-slate-500 font-bold tracking-wider flex items-center gap-1">
                                <Sun size={10} /> SPACE WEATHER
                            </span>
                            <span className={clsx(
                                "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase",
                                spaceWeather.condition === 'quiet' && "bg-green-500/20 text-green-400",
                                spaceWeather.condition === 'moderate' && "bg-yellow-500/20 text-yellow-400",
                                spaceWeather.condition === 'active' && "bg-orange-500/20 text-orange-400",
                                spaceWeather.condition === 'storm' && "bg-red-500/20 text-red-400"
                            )}>
                                {spaceWeather.condition}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="text-center">
                                <div className="text-[9px] text-slate-600">F10.7 Solar Flux</div>
                                <div className="font-mono text-sm text-amber-400">{spaceWeather.f107.toFixed(0)} SFU</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[9px] text-slate-600">Kp Index</div>
                                <div className="font-mono text-sm" style={{ color: getKpColor(spaceWeather.kpIndex) }}>
                                    {formatKpIndex(spaceWeather.kpIndex)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reentry Date */}
                <div className={clsx("rounded-lg p-3 border", colors.bg, colors.border)}>
                    <div className="flex items-center gap-2 mb-1">
                        <Calendar size={14} className={colors.text} />
                        <span className={clsx("text-xs font-bold uppercase", colors.text)}>
                            ESTIMATED REENTRY
                        </span>
                    </div>
                    <div className="font-mono text-lg text-white">
                        {prediction.estimatedLifetimeDays > 3650
                            ? 'Beyond 2035'
                            : prediction.estimatedReentryDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })
                        }
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                        Atmospheric density: {prediction.currentDensity.toExponential(2)} kg/m³
                        {spaceWeather && <span className="ml-2">(corrected)</span>}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default memo(DecayPanel);
