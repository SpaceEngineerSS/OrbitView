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
 * TimeScrubber - YouTube-style draggable timeline control
 * 
 * @design_reference Media player timeline (YouTube, Spotify)
 * Features:
 * - Draggable scrubber handle
 * - Time range display (past 24h to future 24h)
 * - Speed multiplier controls
 * - Play/Pause/Reset controls
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
    // Fix hydration mismatch - only render time on client
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

    // Handle scrubber drag
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);

        if (scrubberRef.current) {
            const rect = scrubberRef.current.getBoundingClientRect();
            const position = (e.clientX - rect.left) / rect.width;
            seekTo(position);
        }
    }, [seekTo]);

    // Handle mouse move during drag
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

    // Handle hover preview
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

    // Calculate hover time
    const hoverTime = hoverPosition !== null
        ? new Date(timeRangeStart.getTime() + hoverPosition * (timeRangeEnd.getTime() - timeRangeStart.getTime()))
        : null;

    // Cycle through speed options
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
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={clsx("fixed bottom-20 left-4 right-4 z-30 pointer-events-none", className)}
        >
            <GlassPanel
                variant="elevated"
                className="mx-auto max-w-4xl pointer-events-auto"
                neonColor="cyan"
            >
                <div className="p-4">
                    {/* Top Row: Time Display & Controls */}
                    <div className="flex items-center justify-between mb-3">
                        {/* Time Range Start */}
                        <div className="text-left">
                            <div className="font-data text-[10px] text-slate-500 uppercase tracking-wider">From</div>
                            <div className="font-data text-xs text-slate-400">{formatDate(timeRangeStart)}</div>
                        </div>

                        {/* Center: Current Time */}
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-cyan-500" />
                                <span className="font-data text-xl text-cyan-400 neon-text-cyan tracking-wider">
                                    {formatTime(currentTime)}
                                </span>
                            </div>
                            <span className="font-data text-[10px] text-slate-500">
                                {formatDate(currentTime)}
                            </span>
                        </div>

                        {/* Time Range End */}
                        <div className="text-right">
                            <div className="font-data text-[10px] text-slate-500 uppercase tracking-wider">To</div>
                            <div className="font-data text-xs text-slate-400">{formatDate(timeRangeEnd)}</div>
                        </div>
                    </div>

                    {/* Scrubber Track */}
                    <div
                        ref={scrubberRef}
                        className="relative h-8 bg-slate-800/50 rounded-lg cursor-pointer group mb-3"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    >
                        {/* Progress Fill */}
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-600/40 to-cyan-500/60 rounded-lg transition-all"
                            style={{ width: `${timelinePosition * 100}%` }}
                        />

                        {/* Center Marker (Now) */}
                        <div
                            className="absolute top-0 h-full w-px bg-emerald-500/50"
                            style={{ left: '50%' }}
                        />

                        {/* Hover Preview */}
                        {hoverPosition !== null && !isDragging && (
                            <>
                                <div
                                    className="absolute top-0 h-full w-0.5 bg-white/30"
                                    style={{ left: `${hoverPosition * 100}%` }}
                                />
                                <div
                                    className="absolute -top-8 transform -translate-x-1/2 bg-slate-900 px-2 py-1 rounded text-xs font-data text-white whitespace-nowrap"
                                    style={{ left: `${hoverPosition * 100}%` }}
                                >
                                    {formatTime(hoverTime)}
                                </div>
                            </>
                        )}

                        {/* Scrubber Handle */}
                        <div
                            className={clsx(
                                "absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-500 rounded-full shadow-lg transition-transform",
                                "border-2 border-white",
                                isDragging ? "scale-125" : "group-hover:scale-110"
                            )}
                            style={{
                                left: `calc(${timelinePosition * 100}% - 8px)`,
                                boxShadow: '0 0 10px rgba(6, 182, 212, 0.5)'
                            }}
                        />
                    </div>

                    {/* Bottom Row: Controls */}
                    <div className="flex items-center justify-between">
                        {/* Speed Controls */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => cycleSpeed('down')}
                                className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                                aria-label="Decrease speed"
                            >
                                <Rewind size={14} />
                            </button>

                            <div className="px-3 py-1 bg-slate-800/80 rounded-lg min-w-[60px] text-center">
                                <span className="font-data text-sm text-cyan-400">
                                    {formatMultiplier(multiplier)}
                                </span>
                            </div>

                            <button
                                onClick={() => cycleSpeed('up')}
                                className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                                aria-label="Increase speed"
                            >
                                <FastForward size={14} />
                            </button>
                        </div>

                        {/* Play/Pause & Reset */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => seekTo(timelinePosition - 0.01)}
                                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                                aria-label="Step backward"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <button
                                onClick={togglePlay}
                                className={clsx(
                                    "p-3 rounded-full transition-all",
                                    isPlaying
                                        ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                                        : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                )}
                                aria-label={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                            </button>

                            <button
                                onClick={() => seekTo(timelinePosition + 0.01)}
                                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                                aria-label="Step forward"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* Reset to Now */}
                        <button
                            onClick={resetToNow}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                            aria-label="Reset to current time"
                        >
                            <RotateCcw size={14} />
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
