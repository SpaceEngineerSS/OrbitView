"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { Play, Pause, FastForward, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import { useTimelineStore } from "@/store/timelineStore";

/**
 * MobileTimeControls - Floating time control buttons for mobile
 * Uses Zustand timeline store for state management
 */

interface MobileTimeControlsProps {
    isVisible: boolean;
}

const speedOptions = [1, 10, 100];

const MobileTimeControls: React.FC<MobileTimeControlsProps> = ({
    isVisible,
}) => {
    const { isPlaying, multiplier, togglePlay, setMultiplier, resetToNow } = useTimelineStore();

    // Cycle through speed options
    const handleSpeedCycle = () => {
        const currentIndex = speedOptions.indexOf(multiplier);
        const nextIndex = (currentIndex + 1) % speedOptions.length;
        setMultiplier(speedOptions[nextIndex]);
    };

    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute right-4 bottom-44 z-30 flex flex-col gap-2"
        >
            {/* Reset to Now */}
            <button
                onClick={resetToNow}
                className={clsx(
                    "w-11 h-11 rounded-full flex items-center justify-center",
                    "bg-black/60 backdrop-blur-md border border-white/10",
                    "text-gray-400 hover:text-white transition-all",
                    "active:scale-95 tap-target"
                )}
                aria-label="Reset to current time"
            >
                <RotateCcw size={18} strokeWidth={1.5} />
            </button>

            {/* Speed Control */}
            <button
                onClick={handleSpeedCycle}
                className={clsx(
                    "w-11 h-11 rounded-full flex items-center justify-center",
                    "bg-black/60 backdrop-blur-md border border-white/10",
                    "transition-all active:scale-95 tap-target",
                    multiplier > 1 ? "text-cyan-400 border-cyan-500/30" : "text-gray-400"
                )}
                aria-label="Change playback speed"
            >
                <div className="relative">
                    <FastForward size={18} strokeWidth={1.5} />
                    {multiplier > 1 && (
                        <span className="absolute -top-1 -right-2 text-[8px] font-bold">
                            {multiplier}x
                        </span>
                    )}
                </div>
            </button>

            {/* Play/Pause */}
            <button
                onClick={togglePlay}
                className={clsx(
                    "w-11 h-11 rounded-full flex items-center justify-center",
                    "bg-black/60 backdrop-blur-md border border-white/10",
                    "transition-all active:scale-95 tap-target",
                    !isPlaying ? "text-amber-400 border-amber-500/30" : "text-emerald-400 border-emerald-500/30"
                )}
                aria-label={!isPlaying ? "Resume" : "Pause"}
            >
                {!isPlaying ? (
                    <Play size={18} strokeWidth={1.5} className="ml-0.5" />
                ) : (
                    <Pause size={18} strokeWidth={1.5} />
                )}
            </button>
        </motion.div>
    );
};

export default memo(MobileTimeControls);

