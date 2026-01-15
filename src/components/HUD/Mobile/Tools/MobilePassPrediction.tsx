"use client";

import React, { memo, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft, Clock, Play, MapPin, Edit2,
    ChevronUp, ChevronDown, Sun, Moon, Loader2
} from "lucide-react";
import { clsx } from "clsx";
import { SpaceObject } from "@/lib/space-objects";
import { predictPasses, SatellitePass, ObserverLocation } from "@/lib/PassPrediction";

/**
 * MobilePassPrediction - Mobile-optimized pass prediction tool
 * Shows when a satellite will pass over the user's location
 */

interface MobilePassPredictionProps {
    isOpen: boolean;
    onBack: () => void;
    satellite: SpaceObject | null;
    observerPosition: ObserverLocation;
    onOpenLocation?: () => void;
}

// Helper to format date/time
const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
};

// Helper to format direction
const formatAzimuth = (azimuth: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(azimuth / 45) % 8;
    return `${azimuth.toFixed(0)}° ${directions[index]}`;
};

interface PassCardProps {
    pass: SatellitePass;
    index: number;
}

const PassCard: React.FC<PassCardProps> = ({ pass, index }) => {
    const [expanded, setExpanded] = useState(false);
    const isNightPass = !pass.visible;

    // Calculate duration in minutes
    const durationMins = Math.round(pass.duration / 60);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white/5 rounded-xl border border-white/5 overflow-hidden"
        >
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex items-center gap-3 text-left active:bg-white/5 transition-colors"
            >
                {/* Time & Date */}
                <div className="flex-shrink-0 text-center w-16">
                    <p className="text-white font-mono text-lg font-semibold">
                        {formatTime(pass.aosTime)}
                    </p>
                    <p className="text-gray-500 text-[10px] uppercase">
                        {formatDate(pass.aosTime)}
                    </p>
                </div>

                {/* Divider */}
                <div className="w-px h-10 bg-white/10" />

                {/* Pass Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={clsx(
                            "text-sm font-medium",
                            pass.maxElevation >= 45 ? "text-emerald-400" :
                                pass.maxElevation >= 20 ? "text-cyan-400" : "text-amber-400"
                        )}>
                            {pass.maxElevation.toFixed(0)}° max
                        </span>
                        {isNightPass ? (
                            <Moon size={14} className="text-violet-400" />
                        ) : (
                            <Sun size={14} className="text-amber-400" />
                        )}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                        {durationMins} min • {formatAzimuth(pass.azimuthAOS)} → {formatAzimuth(pass.azimuthLOS)}
                    </p>
                </div>

                {/* Expand Icon */}
                <div className="flex-shrink-0 text-gray-500">
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </button>

            {/* Expanded Details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-white/5"
                    >
                        <div className="grid grid-cols-3 gap-2 p-4">
                            <div className="text-center">
                                <p className="text-[10px] text-gray-500 uppercase mb-1">AOS</p>
                                <p className="text-cyan-400 font-mono text-sm">
                                    {formatTime(pass.aosTime)}
                                </p>
                                <p className="text-gray-500 text-[10px]">{formatAzimuth(pass.azimuthAOS)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-gray-500 uppercase mb-1">MAX</p>
                                <p className="text-emerald-400 font-mono text-sm">
                                    {formatTime(pass.maxElevationTime)}
                                </p>
                                <p className="text-gray-500 text-[10px]">{pass.maxElevation.toFixed(1)}°</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-gray-500 uppercase mb-1">LOS</p>
                                <p className="text-rose-400 font-mono text-sm">
                                    {formatTime(pass.losTime)}
                                </p>
                                <p className="text-gray-500 text-[10px]">{formatAzimuth(pass.azimuthLOS)}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const MobilePassPrediction: React.FC<MobilePassPredictionProps> = ({
    isOpen,
    onBack,
    satellite,
    observerPosition,
    onOpenLocation,
}) => {
    const [passes, setPasses] = useState<SatellitePass[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [hasCalculated, setHasCalculated] = useState(false);

    // Calculate passes
    const handleCalculate = useCallback(async () => {
        if (!satellite?.tle) return;

        setIsCalculating(true);

        // Use setTimeout to allow UI to update before heavy calculation
        setTimeout(() => {
            try {
                const now = new Date();
                const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

                const observer = {
                    latitude: observerPosition.latitude,
                    longitude: observerPosition.longitude,
                    altitude: observerPosition.altitude || 0,
                };

                const satData = {
                    id: satellite.id,
                    name: satellite.name,
                    line1: satellite.tle!.line1,
                    line2: satellite.tle!.line2,
                };

                const calculatedPasses = predictPasses(satData, observer, now, endTime, 5);
                setPasses(calculatedPasses);
                setHasCalculated(true);
            } catch (error) {
                console.error('Pass prediction error:', error);
            } finally {
                setIsCalculating(false);
            }
        }, 100);
    }, [satellite, observerPosition]);

    // Reset when satellite changes
    useMemo(() => {
        setPasses([]);
        setHasCalculated(false);
    }, [satellite?.id]);

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
                        <h1 className="text-white font-semibold text-lg">Pass Prediction</h1>
                        <p className="text-gray-500 text-xs truncate">
                            {satellite?.name || 'No satellite'}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Clock size={20} className="text-cyan-400" strokeWidth={1.5} />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4">
                {/* Observer Location (Clickable) */}
                <button
                    onClick={onOpenLocation}
                    className="mb-4 p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3 w-full text-left active:bg-white/10 transition-colors"
                >
                    <MapPin size={18} className="text-emerald-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-gray-400 text-xs">Observer Location</p>
                        <p className="text-white text-sm font-mono">
                            {observerPosition.latitude.toFixed(4)}°, {observerPosition.longitude.toFixed(4)}°
                        </p>
                    </div>
                    <Edit2 size={16} className="text-gray-500" />
                </button>

                {/* Calculate Button */}
                {!hasCalculated && (
                    <button
                        onClick={handleCalculate}
                        disabled={isCalculating || !satellite?.tle}
                        className={clsx(
                            "w-full flex items-center justify-center gap-3 py-4 rounded-xl font-medium transition-all",
                            "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
                            "active:scale-[0.98]",
                            (isCalculating || !satellite?.tle) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isCalculating ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Calculating...
                            </>
                        ) : (
                            <>
                                <Play size={20} />
                                Calculate Passes (7 days)
                            </>
                        )}
                    </button>
                )}

                {/* Results */}
                {hasCalculated && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-gray-400 text-xs uppercase tracking-wider font-medium">
                                Upcoming Passes ({passes.length})
                            </h2>
                            <button
                                onClick={handleCalculate}
                                className="text-cyan-400 text-xs hover:underline"
                            >
                                Recalculate
                            </button>
                        </div>

                        {passes.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500 text-sm">
                                    No visible passes found in the next 7 days
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {passes.map((pass, index) => (
                                    <PassCard key={index} pass={pass} index={index} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default memo(MobilePassPrediction);
