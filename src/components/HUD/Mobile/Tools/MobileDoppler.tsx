"use client";

import React, { memo, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    ArrowLeft, Radio, TrendingUp, TrendingDown,
    Zap, Target, Info
} from "lucide-react";
import { clsx } from "clsx";
import { SpaceObject } from "@/lib/space-objects";
import { TelemetryData } from "@/components/HUD/InfoPanel";
import {
    calculateDopplerShift,
    formatFrequency,
    formatDopplerShift,
    COMMON_FREQUENCIES,
    SatelliteState,
    ObserverPosition
} from "@/lib/DopplerCalculator";

/**
 * MobileDoppler - Mobile-optimized Doppler shift calculator
 * Shows real-time frequency shift based on satellite motion
 */

interface MobileDopplerProps {
    isOpen: boolean;
    onBack: () => void;
    satellite: SpaceObject | null;
    telemetry?: TelemetryData | null;
    satelliteState?: SatelliteState | null;
    observerPosition: ObserverPosition;
}

interface FrequencyPreset {
    name: string;
    freq: number;
    description: string;
}

const frequencyPresets: FrequencyPreset[] = [
    { name: 'ISS Voice', freq: COMMON_FREQUENCIES.ISS_VOICE, description: '145.800 MHz' },
    { name: 'ISS APRS', freq: COMMON_FREQUENCIES.ISS_PACKET, description: '145.825 MHz' },
    { name: 'NOAA APT', freq: COMMON_FREQUENCIES.NOAA_APT, description: '137.100 MHz' },
    { name: 'GPS L1', freq: COMMON_FREQUENCIES.GPS_L1, description: '1575.42 MHz' },
];

const MobileDoppler: React.FC<MobileDopplerProps> = ({
    isOpen,
    onBack,
    satellite,
    telemetry,
    satelliteState,
    observerPosition,
}) => {
    const [selectedFreq, setSelectedFreq] = useState(COMMON_FREQUENCIES.ISS_VOICE);
    const [customFreq, setCustomFreq] = useState('');
    const [useCustom, setUseCustom] = useState(false);

    // Get the frequency to use
    const baseFrequency = useMemo(() => {
        if (useCustom && customFreq) {
            const parsed = parseFloat(customFreq) * 1_000_000; // MHz to Hz
            return isNaN(parsed) ? selectedFreq : parsed;
        }
        return selectedFreq;
    }, [useCustom, customFreq, selectedFreq]);

    // Calculate Doppler shift
    const dopplerResult = useMemo(() => {
        if (!satelliteState) return null;

        try {
            return calculateDopplerShift(
                satelliteState,
                {
                    latitude: observerPosition.latitude,
                    longitude: observerPosition.longitude,
                    altitude: observerPosition.altitude || 0,
                },
                baseFrequency
            );
        } catch {
            return null;
        }
    }, [satelliteState, observerPosition, baseFrequency]);

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
                        <h1 className="text-white font-semibold text-lg">Doppler Shift</h1>
                        <p className="text-gray-500 text-xs truncate">
                            {satellite?.name || 'No satellite'}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                        <Radio size={20} className="text-rose-400" strokeWidth={1.5} />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4 space-y-4">
                {/* Live Velocity Display */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-3">
                        <Zap size={16} className="text-amber-400" />
                        <span className="text-gray-400 text-xs uppercase tracking-wider">Satellite Velocity</span>
                    </div>
                    <p className="text-white font-mono text-3xl">
                        {telemetry ? `${telemetry.velocity.toFixed(2)} km/s` : '---'}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                        {telemetry ? `${(telemetry.velocity * 3600).toFixed(0)} km/h` : '---'}
                    </p>
                </div>

                {/* Frequency Selection */}
                <div>
                    <h2 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-2 px-1">
                        Base Frequency
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                        {frequencyPresets.map((preset) => (
                            <button
                                key={preset.name}
                                onClick={() => {
                                    setSelectedFreq(preset.freq);
                                    setUseCustom(false);
                                }}
                                className={clsx(
                                    "p-3 rounded-xl border text-left transition-all active:scale-[0.98]",
                                    !useCustom && selectedFreq === preset.freq
                                        ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                                        : "bg-white/5 border-white/5 text-gray-300"
                                )}
                            >
                                <p className="font-medium text-sm">{preset.name}</p>
                                <p className="text-gray-500 text-xs">{preset.description}</p>
                            </button>
                        ))}
                    </div>

                    {/* Custom Frequency Input */}
                    <div className="mt-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                placeholder="Custom frequency (MHz)"
                                value={customFreq}
                                onChange={(e) => {
                                    setCustomFreq(e.target.value);
                                    setUseCustom(true);
                                }}
                                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
                                inputMode="decimal"
                            />
                            <span className="text-gray-500 text-sm">MHz</span>
                        </div>
                    </div>
                </div>

                {/* Doppler Results */}
                {dopplerResult ? (
                    <div className="space-y-3">
                        <h2 className="text-gray-400 text-xs uppercase tracking-wider font-medium px-1">
                            Doppler Analysis
                        </h2>

                        {/* Main Shift Display */}
                        <div className={clsx(
                            "p-4 rounded-xl border",
                            dopplerResult.isApproaching
                                ? "bg-emerald-500/10 border-emerald-500/20"
                                : "bg-rose-500/10 border-rose-500/20"
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                {dopplerResult.isApproaching ? (
                                    <TrendingUp size={18} className="text-emerald-400" />
                                ) : (
                                    <TrendingDown size={18} className="text-rose-400" />
                                )}
                                <span className={clsx(
                                    "text-xs uppercase tracking-wider",
                                    dopplerResult.isApproaching ? "text-emerald-400" : "text-rose-400"
                                )}>
                                    {dopplerResult.isApproaching ? 'Approaching (Blueshift)' : 'Receding (Redshift)'}
                                </span>
                            </div>
                            <p className="text-white font-mono text-2xl">
                                {formatDopplerShift(dopplerResult.dopplerShiftHz)}
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                                {dopplerResult.shiftPpm.toFixed(3)} ppm
                            </p>
                        </div>

                        {/* Detailed Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                <p className="text-gray-500 text-[10px] uppercase mb-1">Received Freq</p>
                                <p className="text-white font-mono text-sm">
                                    {formatFrequency(dopplerResult.receivedFreqHz)}
                                </p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                <p className="text-gray-500 text-[10px] uppercase mb-1">Range Rate</p>
                                <p className="text-white font-mono text-sm">
                                    {(dopplerResult.rangeRateMps / 1000).toFixed(3)} km/s
                                </p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5 col-span-2">
                                <div className="flex items-center gap-2">
                                    <Target size={14} className="text-violet-400" />
                                    <p className="text-gray-500 text-[10px] uppercase">Distance to Satellite</p>
                                </div>
                                <p className="text-white font-mono text-lg mt-1">
                                    {dopplerResult.rangeKm.toFixed(1)} km
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <div className="flex items-center gap-2">
                            <Info size={16} className="text-amber-400" />
                            <p className="text-amber-400 text-sm">
                                Waiting for satellite position data...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default memo(MobileDoppler);
