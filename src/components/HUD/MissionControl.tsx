"use client";

import React, { memo, useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Satellite,
    Clock,
    Activity,
    Zap
} from "lucide-react";
import { GlassPanel } from "@/components/UI/GlassPanel";
import { useTimelineStore } from "@/store/timelineStore";

/**
 * MissionControl - Top HUD bar displaying global system status
 * Shows live status, active satellite count, and system time
 * 
 * @design_reference SpaceX/NASA Mission Control HUD aesthetics
 * Uses Zustand store for time state (throttled sync from Cesium)
 */

interface MissionControlProps {
    satelliteCount: number;
    isLoading?: boolean;
}

const MissionControl: React.FC<MissionControlProps> = memo(({
    satelliteCount,
    isLoading = false,
}) => {
    // Fix hydration mismatch - only render time on client
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Get time state from Zustand store
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
            month: "2-digit",
            day: "2-digit",
        });
    }, [mounted, currentTime]);

    const statusText = useMemo(() => {
        if (isLoading) return "INITIALIZING";
        if (!isPlaying) return "PAUSED";
        if (multiplier > 1) return `FAST ${multiplier}×`;
        if (multiplier < 0) return "REVERSE";
        return "LIVE";
    }, [isLoading, isPlaying, multiplier]);

    const statusColor = useMemo(() => {
        if (isLoading) return "text-yellow-500";
        if (!isPlaying) return "text-orange-500";
        if (multiplier !== 1) return "text-purple-500";
        return "text-emerald-500";
    }, [isLoading, isPlaying, multiplier]);

    return (
        <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-40 px-4 pt-4 pointer-events-none"
        >
            <GlassPanel
                variant="elevated"
                className="mx-auto max-w-4xl pointer-events-auto"
                withGlow
                neonColor="cyan"
            >
                <div className="flex items-center justify-between px-4 py-2">
                    {/* Left: Status Indicator */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className={`relative flex h-3 w-3`}>
                                <span className={`animate-live-pulse absolute inline-flex h-full w-full rounded-full ${statusColor.replace('text-', 'bg-')
                                    } opacity-75`} />
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${statusColor.replace('text-', 'bg-')
                                    }`} />
                            </span>
                            <span className={`font-heading text-xs tracking-widest ${statusColor}`}>
                                {statusText}
                            </span>
                        </div>

                        {/* Activity Indicator */}
                        <div className="hidden sm:flex items-center gap-1.5 text-cyan-500/70">
                            <Activity size={14} className="animate-pulse" />
                            <span className="font-data text-[10px]">SYS OK</span>
                        </div>
                    </div>

                    {/* Center: Time Display */}
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <Clock size={14} />
                            <span className="font-data text-lg tracking-wider neon-text-cyan">
                                {formattedTime}
                            </span>
                        </div>
                        <span className="font-data text-[10px] text-slate-500 tracking-wider">
                            {formattedDate} UTC
                        </span>
                    </div>

                    {/* Right: Satellite Count */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-1.5 text-emerald-500/70">
                            <Zap size={14} />
                            <span className="font-data text-[10px]">PWR</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Satellite size={16} className="text-cyan-500" />
                            <div className="flex flex-col items-end">
                                <span className="font-data text-lg text-white tracking-wider">
                                    {isLoading ? "---" : satelliteCount.toLocaleString()}
                                </span>
                                <span className="font-heading text-[8px] text-slate-500 tracking-widest">
                                    ACTIVE SAT
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </GlassPanel>
        </motion.div>
    );
});

MissionControl.displayName = "MissionControl";

export default MissionControl;
