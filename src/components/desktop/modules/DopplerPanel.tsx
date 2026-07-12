"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Activity, TrendingUp, TrendingDown, Settings2, Satellite } from "lucide-react";
import { clsx } from "clsx";
import {
    calculateDopplerShift,
    formatFrequency,
    formatDopplerShift,
    COMMON_FREQUENCIES,
    ObserverPosition,
    SatelliteState,
    DopplerResult
} from "@/lib/DopplerCalculator";

interface DopplerPanelProps {
    satelliteState: SatelliteState | null;
    satelliteName?: string;
    observerPosition: ObserverPosition;
}

const DopplerPanel: React.FC<DopplerPanelProps> = ({
    satelliteState,
    satelliteName = "Unknown",
    observerPosition
}) => {
    const [baseFrequency, setBaseFrequency] = useState(COMMON_FREQUENCIES.ISS_VOICE);
    const [customFreq, setCustomFreq] = useState("");
    const [showSettings, setShowSettings] = useState(false);
    const [history, setHistory] = useState<{ shift: number; time: number }[]>([]);

    // Calculate Doppler shift
    const dopplerResult = useMemo<DopplerResult | null>(() => {
        if (!satelliteState) return null;
        return calculateDopplerShift(satelliteState, observerPosition, baseFrequency);
    }, [satelliteState, observerPosition, baseFrequency]);

    // Track history
    useEffect(() => {
        if (!dopplerResult) return;
        setHistory(prev => {
            const now = Date.now();
            // Keep last 60 seconds (approx)
            const newHistory = [...prev, { shift: dopplerResult.dopplerShiftHz, time: now }];
            return newHistory.slice(-60);
        });
    }, [dopplerResult]);

    // Static spectrum display (no history updates to prevent re-renders)
    const spectrumBar = dopplerResult ? {
        height: Math.min((Math.abs(dopplerResult.dopplerShiftHz) / 10000) * 100, 100),
        isPositive: dopplerResult.dopplerShiftHz >= 0
    } : null;

    // Preset frequencies
    const presets = [
        { name: "ISS Voice", freq: COMMON_FREQUENCIES.ISS_VOICE },
        { name: "ISS APRS", freq: COMMON_FREQUENCIES.ISS_PACKET },
        { name: "NOAA APT", freq: COMMON_FREQUENCIES.NOAA_APT },
        { name: "GPS L1", freq: COMMON_FREQUENCIES.GPS_L1 },
    ];

    if (!satelliteState) {
        return (
            <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-4">
                    <Radio size={18} />
                    <span className="text-sm font-bold">Doppler Shift</span>
                </div>
                <div className="h-32 flex flex-col items-center justify-center text-center">
                    <Satellite size={32} className="text-slate-700 mb-2" />
                    <span className="text-xs text-slate-600">Select a satellite to calculate Doppler shift</span>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-950/80 backdrop-blur-xl border border-purple-500/20 rounded-xl overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <Radio size={16} className="text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Doppler Analysis</h3>
                        <span className="text-[10px] text-purple-400 font-mono">{satelliteName}</span>
                    </div>
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={clsx(
                        "p-2 rounded-lg transition-colors",
                        showSettings ? "bg-purple-500/20 text-purple-400" : "text-slate-500 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Settings2 size={16} />
                </button>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-white/5 overflow-hidden"
                    >
                        <div className="p-4 space-y-3">
                            <div>
                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">
                                    Base Frequency
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customFreq || (baseFrequency / 1_000_000).toFixed(3)}
                                        onChange={(e) => {
                                            setCustomFreq(e.target.value);
                                            const parsed = parseFloat(e.target.value) * 1_000_000;
                                            if (!isNaN(parsed) && parsed > 0) {
                                                setBaseFrequency(parsed);
                                            }
                                        }}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-500/50"
                                        placeholder="145.800"
                                    />
                                    <span className="flex items-center text-sm text-slate-400">MHz</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {presets.map((preset) => (
                                    <button
                                        key={preset.name}
                                        onClick={() => {
                                            setBaseFrequency(preset.freq);
                                            setCustomFreq("");
                                        }}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                                            baseFrequency === preset.freq
                                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                                : "bg-white/5 text-slate-400 border border-transparent hover:bg-white/10"
                                        )}
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Display */}
            <div className="p-4 space-y-4">
                {/* Frequency Display */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                        <div className="text-[10px] text-slate-500 mb-1 font-bold tracking-wider">TX FREQ</div>
                        <div className="font-mono text-purple-300 text-sm">{formatFrequency(baseFrequency)}</div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                        <div className="text-[10px] text-slate-500 mb-1 font-bold tracking-wider">RX FREQ</div>
                        <div className="font-mono text-cyan-300 text-sm">
                            {dopplerResult ? formatFrequency(dopplerResult.receivedFreqHz) : "---"}
                        </div>
                    </div>
                </div>

                {/* Doppler Shift */}
                {dopplerResult && (
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] text-slate-500 font-bold tracking-wider">DOPPLER SHIFT</span>
                            <div className={clsx(
                                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                                dopplerResult.isApproaching
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-amber-500/20 text-amber-400"
                            )}>
                                {dopplerResult.isApproaching ? (
                                    <><TrendingUp size={12} /> Approaching</>
                                ) : (
                                    <><TrendingDown size={12} /> Receding</>
                                )}
                            </div>
                        </div>

                        <div className="text-2xl font-mono font-bold text-white mb-2">
                            {formatDopplerShift(dopplerResult.dopplerShiftHz)}
                        </div>

                        <div className="text-[10px] text-slate-500 font-mono">
                            {dopplerResult.shiftPpm.toFixed(3)} ppm | Range Rate: {dopplerResult.rangeRateMps.toFixed(1)} m/s
                        </div>
                    </div>
                )}

                {/* Spectrum Analyzer / Waterfall Visualization */}
                <div>
                    <div className="text-[10px] text-slate-500 font-bold tracking-wider mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2"><Activity size={12} /> SPECTROGRAM (Waterfall)</span>
                        <span className="text-[8px] opacity-50">60s WINDOW</span>
                    </div>
                    <div className="h-24 bg-black/40 rounded-lg border border-white/5 relative overflow-hidden group">
                        {/* Center line (Zero Shift) */}
                        <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-800 z-10" />
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-800/50 z-10" />

                        {/* Waterfall Bars */}
                        <div className="absolute inset-0 flex items-end px-1 gap-[1px]">
                            {history.map((h, i) => {
                                const maxShift = 20000; // 20kHz scale
                                const heightPercent = Math.min((Math.abs(h.shift) / maxShift) * 100, 100);
                                const isPositive = h.shift >= 0;

                                return (
                                    <motion.div
                                        key={h.time}
                                        initial={{ opacity: 0, scaleY: 0 }}
                                        animate={{ opacity: 1, scaleY: 1 }}
                                        className={clsx(
                                            "flex-1 min-w-[2px] rounded-t-sm transition-colors",
                                            isPositive ? "bg-emerald-500/40" : "bg-amber-500/40"
                                        )}
                                        style={{
                                            height: `${heightPercent}%`,
                                            // Position based on sign
                                            position: 'absolute',
                                            left: `${(i / Math.max(1, history.length - 1)) * 100}%`,
                                            bottom: isPositive ? '50%' : 'auto',
                                            top: isPositive ? 'auto' : '50%',
                                            transformOrigin: isPositive ? 'bottom' : 'top'
                                        }}
                                    />
                                );
                            })}
                        </div>

                        {/* Labels */}
                        <div className="absolute bottom-2 left-2 text-[8px] text-emerald-500/50 font-mono font-bold z-20">+20 kHz</div>
                        <div className="absolute top-2 left-2 text-[8px] text-amber-500/50 font-mono font-bold z-20">-20 kHz</div>
                        <div className="absolute top-1/2 right-2 -translate-y-1/2 text-[8px] text-slate-600 font-mono z-20">0 Hz</div>
                    </div>
                    <div className="mt-2 flex justify-between px-1">
                        <div className="text-[8px] text-slate-600 font-mono">T-60s</div>
                        <div className="text-[8px] text-slate-600 font-mono italic">REAL-TIME PROPAGATION</div>
                        <div className="text-[8px] text-slate-600 font-mono">NOW</div>
                    </div>
                </div>

                {/* Range Info */}
                {dopplerResult && (
                    <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                            <div className="text-[10px] text-slate-600 mb-1">RANGE</div>
                            <div className="text-sm font-mono text-slate-300">{dopplerResult.rangeKm.toFixed(1)} km</div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                            <div className="text-[10px] text-slate-600 mb-1">OBSERVER</div>
                            <div className="text-sm font-mono text-slate-300">
                                {observerPosition.latitude.toFixed(2)}°, {observerPosition.longitude.toFixed(2)}°
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default memo(DopplerPanel);
