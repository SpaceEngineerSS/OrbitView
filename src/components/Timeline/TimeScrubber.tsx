"use client";

import React, { memo, useCallback, useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Play,
    Pause,
    RotateCcw,
    FastForward,
    Rewind,
    Clock,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { GlassPanel } from "@/components/UI/GlassPanel";
import { useTimelineStore } from "@/store/timelineStore";
import { clsx } from "clsx";

/**
 * TimeScrubber - Timeline control
 * ORBITAL GLASS 2.0 - Clean, functional design
 */

interface TimeScrubberProps {
    className?: string;
}

const SPEED_OPTIONS = [0.1, 0.5, 1, 2, 5, 10, 60, 600, 3600];

const formatTime = (date: Date | null): string => {
    if (!date) return "--:--:--";
    return date.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
};

const formatDate = (date: Date | null): string => {
    if (!date) return "----/--/--";
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit"
    });
};

const formatMultiplier = (multiplier: number): string => {
    if (multiplier >= 3600) return `${multiplier / 3600}h/s`;
    if (multiplier >= 60) return `${multiplier / 60}m/s`;
    return `${multiplier}×`;
};


const TimeScrubber: React.FC<TimeScrubberProps> = memo(({ className }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const {
        currentTime,
        isPlaying,
        multiplier,
        timelinePosition,
        timeRangeStart,
        timeRangeEnd,
        togglePlay,
        setMultiplier,
        seekTo,
        resetToNow
    } = useTimelineStore();

    const [isDragging, setIsDragging] = useState(false);
    const [hoverPosition, setHoverPosition] = useState<number | null>(null);
    const scrubberRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);

        if (scrubberRef.current) {
            const rect = scrubberRef.current.getBoundingClientRect();
            const position = (e.clientX - rect.left) / rect.width;
            seekTo(position);
        }
    }, [seekTo]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (scrubberRef.current) {
                const rect = scrubberRef.current.getBoundingClientRect();
                const position = (e.clientX - rect.left) / rect.width;
                seekTo(Math.max(0, Math.min(1, position)));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, seekTo]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging) return;
        if (scrubberRef.current) {
            const rect = scrubberRef.current.getBoundingClientRect();
            const position = (e.clientX - rect.left) / rect.width;
            setHoverPosition(Math.max(0, Math.min(1, position)));
        }
    }, [isDragging]);

    const handleMouseLeave = useCallback(() => {
        setHoverPosition(null);
    }, []);

    const hoverTime = hoverPosition !== null
        ? new Date(timeRangeStart.getTime() + hoverPosition * (timeRangeEnd.getTime() - timeRangeStart.getTime()))
        : null;

    const cycleSpeed = useCallback((direction: 'up' | 'down') => {
        const currentIndex = SPEED_OPTIONS.indexOf(multiplier);
        let newIndex: number;

        if (currentIndex === -1) {
            newIndex = SPEED_OPTIONS.findIndex(s => s >= multiplier);
            if (newIndex === -1) newIndex = SPEED_OPTIONS.length - 1;
        } else {
            newIndex = direction === 'up'
                ? Math.min(currentIndex + 1, SPEED_OPTIONS.length - 1)
                : Math.max(currentIndex - 1, 0);
        }

        setMultiplier(SPEED_OPTIONS[newIndex]);
    }, [multiplier, setMultiplier]);

    return (
        <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.1 }}
            className={clsx("fixed bottom-20 left-4 right-4 z-30 pointer-events-none", className)}
        >
            <GlassPanel
                variant="elevated"
                className="mx-auto max-w-4xl pointer-events-auto"
            >
                <div className="p-4">
                    {/* Top Row: Time Display */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-left">
                            <div className="font-data text-[9px] text-slate-500 uppercase tracking-wider">From</div>
                            <div className="font-data text-xs text-slate-400">{formatDate(timeRangeStart)}</div>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2">
                                <Clock size={12} className="text-sky-400" strokeWidth={1.5} />
                                <span className="font-data text-lg text-white tracking-wider">
                                    {formatTime(currentTime)}
                                </span>
                            </div>
                            <span className="font-data text-[9px] text-slate-500">
                                {formatDate(currentTime)}
                            </span>
                        </div>

                        <div className="text-right">
                            <div className="font-data text-[9px] text-slate-500 uppercase tracking-wider">To</div>
                            <div className="font-data text-xs text-slate-400">{formatDate(timeRangeEnd)}</div>
                        </div>
                    </div>

                    {/* Scrubber Track */}
                    <div
                        ref={scrubberRef}
                        className="relative h-8 bg-white/5 rounded-xl cursor-pointer group mb-3 border border-white/5"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    >
                        {/* Progress Fill */}
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-sky-500/30 to-sky-400/40 rounded-xl"
                            style={{ width: `${timelinePosition * 100}%` }}
                        />

                        {/* Center Marker (Now) */}
                        <div
                            className="absolute top-0 h-full w-px bg-emerald-400/40"
                            style={{ left: '50%' }}
                        />

                        {/* Hover Preview */}
                        {hoverPosition !== null && !isDragging && (
                            <>
                                <div
                                    className="absolute top-0 h-full w-0.5 bg-white/20"
                                    style={{ left: `${hoverPosition * 100}%` }}
                                />
                                <div
                                    className="absolute -top-8 transform -translate-x-1/2 glass-panel px-2 py-1 rounded-lg text-xs font-data text-white whitespace-nowrap"
                                    style={{ left: `${hoverPosition * 100}%` }}
                                >
                                    {formatTime(hoverTime)}
                                </div>
                            </>
                        )}

                        {/* Scrubber Handle */}
                        <div
                            className={clsx(
                                "absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-transform",
                                isDragging ? "scale-125" : "group-hover:scale-110"
                            )}
                            style={{
                                left: `calc(${timelinePosition * 100}% - 8px)`,
                            }}
                        />
                    </div>

                    {/* Bottom Row: Controls */}
                    <div className="flex items-center justify-between">
                        {/* Speed Controls */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => cycleSpeed('down')}
                                className="p-1.5 rounded-lg glass-button text-slate-400 hover:text-white"
                                aria-label="Decrease speed"
                            >
                                <Rewind size={14} strokeWidth={1.5} />
                            </button>

                            <div className="px-3 py-1 bg-white/5 rounded-lg min-w-[60px] text-center border border-white/5">
                                <span className="font-data text-sm text-sky-400">
                                    {formatMultiplier(multiplier)}
                                </span>
                            </div>

                            <button
                                onClick={() => cycleSpeed('up')}
                                className="p-1.5 rounded-lg glass-button text-slate-400 hover:text-white"
                                aria-label="Increase speed"
                            >
                                <FastForward size={14} strokeWidth={1.5} />
                            </button>
                        </div>

                        {/* Play/Pause & Step */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => seekTo(timelinePosition - 0.01)}
                                className="p-2 rounded-lg glass-button text-slate-400 hover:text-white"
                                aria-label="Step backward"
                            >
                                <ChevronLeft size={16} strokeWidth={1.5} />
                            </button>

                            <button
                                onClick={togglePlay}
                                className={clsx(
                                    "p-3 rounded-full transition-all",
                                    isPlaying
                                        ? "bg-white/10 text-white hover:bg-white/15"
                                        : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                )}
                                aria-label={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? <Pause size={18} strokeWidth={1.5} /> : <Play size={18} strokeWidth={1.5} />}
                            </button>

                            <button
                                onClick={() => seekTo(timelinePosition + 0.01)}
                                className="p-2 rounded-lg glass-button text-slate-400 hover:text-white"
                                aria-label="Step forward"
                            >
                                <ChevronRight size={16} strokeWidth={1.5} />
                            </button>
                        </div>

                        {/* Reset to Now */}
                        <button
                            onClick={resetToNow}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 transition-colors border border-emerald-500/20"
                            aria-label="Reset to current time"
                        >
                            <RotateCcw size={14} strokeWidth={1.5} />
                            <span className="font-heading text-xs tracking-wider">NOW</span>
                        </button>
                    </div>
                </div>
            </GlassPanel>
        </motion.div>
    );
});

TimeScrubber.displayName = "TimeScrubber";

export default TimeScrubber;
