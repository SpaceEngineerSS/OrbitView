"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, ArrowUp, ArrowDown, Eye, RefreshCw, AlertTriangle } from "lucide-react";
import { SatelliteData } from "@/lib/tle";
import { ObserverLocation, predictPasses, SatellitePass, getLookAngles } from "@/lib/PassPrediction";
import Skyplot from "./Skyplot";
import { clsx } from "clsx";

interface PassPredictionPanelProps {
    satellite: SatelliteData;
    observer: ObserverLocation;
}

const PassPredictionPanel: React.FC<PassPredictionPanelProps> = ({ satellite, observer }) => {
    const [passes, setPasses] = useState<SatellitePass[]>([]);
    const [selectedPassIndex, setSelectedPassIndex] = useState<number>(0);
    const [calculating, setCalculating] = useState(true);
    const [currentPos, setCurrentPos] = useState<{ az: number, el: number } | undefined>(undefined);

    // Calculate passes on mount or when satellite changes
    useEffect(() => {
        setCalculating(true);
        // Defer calculation to avoid blocking UI
        const timer = setTimeout(() => {
            const now = new Date();
            const end = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours
            const results = predictPasses(satellite, observer, now, end, 10); // Min el 10 deg
            setPasses(results);
            setSelectedPassIndex(0);
            setCalculating(false);
        }, 100);
        return () => clearTimeout(timer);
    }, [satellite, observer]);

    // Calculate current position ONCE on mount (no interval loop)
    useEffect(() => {
        const now = new Date();
        const angles = getLookAngles(satellite, observer, now);
        if (angles && angles.elevation > 0) {
            setCurrentPos({ az: angles.azimuth, el: angles.elevation });
        } else {
            setCurrentPos(undefined);
        }
    }, [satellite, observer]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}m ${s}s`;
    };

    const selectedPass = passes[selectedPassIndex];

    // Calculate trajectory points for the selected pass
    const trajectory = useMemo(() => {
        if (!selectedPass) return [];
        const points: { az: number, el: number }[] = [];
        const start = selectedPass.aosTime.getTime();
        const end = selectedPass.losTime.getTime();
        const duration = (end - start);
        const step = Math.max(1000, duration / 50); // 50 points

        for (let t = start; t <= end; t += step) {
            const date = new Date(t);
            const angles = getLookAngles(satellite, observer, date);
            if (angles) {
                points.push({ az: angles.azimuth, el: angles.elevation });
            }
        }
        return points;
    }, [selectedPass, satellite, observer]);

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 p-2">
            {/* Left Column: Pass Info & List */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                            <Calendar size={18} />
                            Upcoming Passes
                        </h3>
                        <p className="text-xs text-slate-500">Next 24 Hours • Min El 10°</p>
                    </div>
                    {calculating && <RefreshCw className="animate-spin text-cyan-500" size={16} />}
                </div>

                {/* Selected Pass Details */}
                {!calculating && selectedPass ? (
                    <div className="bg-slate-900/50 border border-cyan-500/20 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <div className={clsx(
                                    "px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1",
                                    selectedPass.visible ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30" : "bg-slate-500/10 text-slate-500 border border-white/5"
                                )}>
                                    <Eye size={10} />
                                    {selectedPass.visible ? "OPTICALLY VISIBLE" : "RADIO ONLY"}
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Details</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider">AOS (Rise)</div>
                                <div className="text-xl font-mono text-emerald-400">{formatTime(selectedPass.aosTime)}</div>
                                <div className="text-xs text-slate-400 font-mono">AZ: {selectedPass.azimuthAOS.toFixed(1)}°</div>
                            </div>
                            <div className="space-y-1 text-right">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider">LOS (Set)</div>
                                <div className="text-xl font-mono text-rose-400">{formatTime(selectedPass.losTime)}</div>
                                <div className="text-xs text-slate-400 font-mono">AZ: {selectedPass.azimuthLOS.toFixed(1)}°</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center border-t border-white/5 pt-3">
                            <div>
                                <div className="text-[10px] text-slate-500">Max Elevation</div>
                                <div className="text-lg font-bold text-white">{selectedPass.maxElevation.toFixed(0)}°</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500">Duration</div>
                                <div className="text-lg font-bold text-white">{formatDuration(selectedPass.duration)}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500">Peak Time</div>
                                <div className="text-sm font-mono text-cyan-300 mt-1">{formatTime(selectedPass.maxElevationTime)}</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    !calculating && (
                        <div className="p-8 text-center text-slate-500 border border-white/5 rounded-xl bg-slate-950/30">
                            <Eye size={32} className="mx-auto mb-2 opacity-50" />
                            <p>No visible passes in the next 24 hours.</p>
                        </div>
                    )
                )}

                {/* Pass List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 rounded-lg border border-white/5">
                    {passes.map((pass, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedPassIndex(idx)}
                            className={clsx(
                                "w-full text-left p-3 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors",
                                idx === selectedPassIndex && "bg-cyan-900/20 border-l-2 border-l-cyan-500"
                            )}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={clsx(
                                    "p-1.5 rounded-lg",
                                    pass.visible ? "text-yellow-500 bg-yellow-500/10" : "text-slate-600 bg-slate-800/20"
                                )}>
                                    <Eye size={14} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className={clsx("font-mono font-bold truncate", idx === 0 ? "text-white" : "text-slate-400")}>
                                        {pass.aosTime.toLocaleDateString()} {formatTime(pass.aosTime)}
                                    </span>
                                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                        Dur: {Math.round(pass.duration / 60)}m • Max: {pass.maxElevation.toFixed(0)}°
                                    </span>
                                </div>
                            </div>
                            <ArrowUp size={14} className="text-emerald-500/50" style={{ transform: `rotate(${pass.azimuthAOS}deg)` }} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Column: Skyplot */}
            <div className="flex-1 min-h-[300px] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Skyplot (Polar View)</h3>
                    {currentPos && <span className="text-[10px] text-emerald-400 animate-pulse">● LIVE SIGNAL</span>}
                </div>
                <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 p-4 relative overflow-hidden group">
                    {/* Glossy overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-10" />
                    <Skyplot trajectory={trajectory} currentPos={currentPos} />
                </div>
                <div className="mt-2 text-[10px] text-slate-600 text-center">
                    Center is Zenith (90°). Outer ring is Horizon (0°). Cyan line is predicted path.
                </div>
            </div>
        </div>
    );
};

export default memo(PassPredictionPanel);
