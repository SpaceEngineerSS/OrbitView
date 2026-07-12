"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, Activity, Zap, Navigation, Globe } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";

/**
 * BottomPanel - Telemetry Deck
 * Collapsible, CSS-based Tech Bars (No Chart.js), Neon style
 */
interface BottomPanelProps {
    telemetry: { lat: number; lon: number; alt: number; velocity: number } | null;
    isExpanded?: boolean;
    onToggle?: () => void;
}

const BottomPanel: React.FC<BottomPanelProps> = ({ telemetry, isExpanded: controlledExpanded, onToggle }) => {
    const [localExpanded, setLocalExpanded] = useState(false);
    const isExpanded = controlledExpanded !== undefined ? controlledExpanded : localExpanded;
    const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded));

    // Derived or specific values
    const displayTelemetry = {
        altitude: telemetry?.alt.toFixed(2) || "---",
        velocity: telemetry?.velocity.toFixed(3) || "---",
        signal: telemetry ? 98 : 0, // Mock high signal when data exists
        latency: telemetry ? 24 : 0,
    };

    return (
        <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.4 }}
            className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-none"
        >
            <div className="pointer-events-auto flex flex-col items-center w-full max-w-4xl">
                {/* Toggle Handle */}
                <button
                    onClick={handleToggle}
                    className="flex items-center gap-2 px-6 py-1 bg-[#090d16]/90 backdrop-blur-md border border-white/10 border-b-0 rounded-t-xl text-cyan-400 hover:text-white transition-colors hover:bg-cyan-500/10"
                >
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Telemetry Stream</span>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>

                {/* Main Panel */}
                <GlassPanel
                    intensity="high"
                    borderGlow={true}
                    className="w-full border-b-0 rounded-b-none transition-all duration-500 ease-in-out overflow-hidden"
                    style={{ height: isExpanded ? "180px" : "60px" }}
                >
                    <div className="p-6 h-full flex flex-col justify-between">
                        {/* Compact View (Always Visible) */}
                        <div className="flex items-center justify-between w-full h-8">
                            <div className="flex gap-8">
                                <TelemetryItem
                                    label="ALTITUDE"
                                    value={`${displayTelemetry.altitude} km`}
                                    color="text-cyan-400"
                                    icon={Globe}
                                />
                                <TelemetryItem
                                    label="VELOCITY"
                                    value={`${displayTelemetry.velocity} km/s`}
                                    color="text-purple-400"
                                    icon={Zap}
                                />
                            </div>

                            {/* Live Indicator */}
                            <div className="flex items-center gap-2">
                                <LiveIndicator />
                                <span className="text-xs font-mono text-emerald-400">DATA LIVE</span>
                            </div>
                        </div>

                        {/* Expanded View (Tech Bars) */}
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="pt-6 grid grid-cols-2 gap-8 border-t border-white/5 mt-4"
                                >
                                    {/* Left Graph: Altitude History (Simulated with Bars) */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                                            <span>Signal Strength</span>
                                            <span className="text-emerald-400">{displayTelemetry.signal}%</span>
                                        </div>
                                        <div className="flex items-end gap-1 h-12 w-full">
                                            <TechBars count={30} color="bg-emerald-500" />
                                        </div>
                                    </div>

                                    {/* Right Graph: Network Load */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                                            <span>Network Latency Line</span>
                                            <span className="text-cyan-400">{displayTelemetry.latency}ms</span>
                                        </div>
                                        <div className="w-full bg-white/5 h-12 rounded relative overflow-hidden flex items-center px-2">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-pulse" />
                                            {/* Stylized Sine Wave (CSS) */}
                                            <svg className="w-full h-8" preserveAspectRatio="none">
                                                <path
                                                    d="M0 16 Q 20 5, 40 16 T 80 16 T 120 16 T 160 16 T 200 16"
                                                    fill="none"
                                                    stroke="#00f3ff"
                                                    strokeWidth="2"
                                                    strokeOpacity="0.5"
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                                <path
                                                    d="M0 16 Q 20 25, 40 16 T 80 16 T 120 16 T 160 16 T 200 16"
                                                    fill="none"
                                                    stroke="#bc13fe"
                                                    strokeWidth="2"
                                                    strokeOpacity="0.5"
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </GlassPanel>
            </div>
        </motion.div>
    );
};

const TelemetryItem = ({ label, value, color, icon: Icon }: any) => (
    <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded bg-white/5 ${color.replace('text-', 'bg-')}/10`}>
            <Icon size={16} className={color} />
        </div>
        <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 leading-none mb-0.5">{label}</span>
            <span className={`font-mono text-lg font-bold leading-none ${color} text-glow`}>{value}</span>
        </div>
    </div>
);

export default BottomPanel;

// --- Helper Components for Hydration Fix ---

const LiveIndicator = () => {
    const [bars, setBars] = useState<number[]>([]);

    React.useEffect(() => {
        setBars(Array.from({ length: 5 }).map(() => Math.random()));
    }, []);

    if (bars.length === 0) return <div className="h-4 w-10 bg-emerald-500/10 animate-pulse rounded" />;

    return (
        <div className="flex gap-0.5 items-end h-4">
            {bars.map((seed, i) => (
                <div
                    key={i}
                    className="w-1 bg-emerald-500 animate-pulse"
                    style={{
                        height: `${seed * 100}%`,
                        animationDuration: `${0.5 + seed}s`
                    }}
                />
            ))}
        </div>
    );
};

const TechBars = ({ count, color }: { count: number, color: string }) => {
    const [heights, setHeights] = useState<number[]>([]);

    React.useEffect(() => {
        setHeights(Array.from({ length: count }).map(() => 30 + Math.random() * 70));
    }, [count]);

    if (heights.length === 0) return <div className="w-full h-full bg-emerald-500/10 animate-pulse rounded" />;

    return (
        <>
            {heights.map((h, i) => (
                <div
                    key={i}
                    className={`flex-1 ${color.replace('bg-', 'bg-')}/20 hover:${color.replace('bg-', 'bg-')} transition-colors rounded-sm`}
                    style={{ height: `${h}%` }}
                />
            ))}
        </>
    );
};
