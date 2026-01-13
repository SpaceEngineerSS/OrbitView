"use client";

import React, { memo, useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Satellite, Clock } from "lucide-react";
import { GlassPanel } from "@/components/UI/GlassPanel";
import { useTimelineStore } from "@/store/timelineStore";

/**
 * MissionControl - Clean pill-shaped status bar
 * ORBITAL GLASS 2.0 - Minimalist design, data density without noise
 */

interface MissionControlProps {
    satelliteCount: number;
    isLoading?: boolean;
}

const MissionControl: React.FC<MissionControlProps> = memo(({
    satelliteCount,
    isLoading = false,
}) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const { currentTime, isPlaying, multiplier } = useTimelineStore();

    const formattedTime = useMemo(() => {
        if (!mounted || !currentTime) return "--:--:--";
        return currentTime.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }, [mounted, currentTime]);

    const formattedDate = useMemo(() => {
        if (!mounted || !currentTime) return "----/--/--";
        return currentTime.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    }, [mounted, currentTime]);

    const statusText = useMemo(() => {
        if (isLoading) return "INIT";
        if (!isPlaying) return "PAUSED";
        if (multiplier > 1) return `${multiplier}×`;
        if (multiplier < 0) return "REV";
        return "LIVE";
    }, [isLoading, isPlaying, multiplier]);

    const statusDotColor = useMemo(() => {
        if (isLoading) return "bg-amber-500";
        if (!isPlaying) return "bg-slate-400";
        if (multiplier !== 1) return "bg-violet-500";
        return "bg-emerald-500";
    }, [isLoading, isPlaying, multiplier]);

    return (
        <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        >
            <GlassPanel
                variant="elevated"
                className="pointer-events-auto rounded-full px-1"
            >
                <div className="flex items-center gap-4 px-4 py-2">
                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className={`animate-live-dot absolute inline-flex h-full w-full rounded-full ${statusDotColor} opacity-75`} />
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${statusDotColor}`} />
                        </span>
                        <span className="font-heading text-[10px] text-slate-300 tracking-widest">
                            {statusText}
                        </span>
                    </div>

                    {/* Divider */}
                    <div className="h-4 w-px bg-white/10" />

                    {/* Time Display */}
                    <div className="flex items-center gap-2">
                        <Clock size={12} className="text-slate-400" strokeWidth={1.5} />
                        <div className="flex flex-col items-center">
                            <span className="font-data text-sm text-white tracking-wider">
                                {formattedTime}
                            </span>
                            <span className="font-data text-[9px] text-slate-500">
                                {formattedDate} UTC
                            </span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-4 w-px bg-white/10" />

                    {/* Satellite Count */}
                    <div className="flex items-center gap-2">
                        <Satellite size={12} className="text-slate-400" strokeWidth={1.5} />
                        <span className="font-data text-sm text-white">
                            {isLoading ? "---" : satelliteCount.toLocaleString()}
                        </span>
                    </div>
                </div>
            </GlassPanel>
        </motion.div>
    );
});

MissionControl.displayName = "MissionControl";

export default MissionControl;
