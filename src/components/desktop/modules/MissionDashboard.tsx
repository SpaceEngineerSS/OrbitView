"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Globe, Clock, TrendingDown, Maximize2, Zap, Navigation, Map as MapIcon, X } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";
import Skyplot from "./Skyplot";
import PassPredictionPanel from "./PassPredictionPanel";
import DecayPanel from "./DecayPanel";
import { SpaceObject } from "@/lib/space-objects";
import { ObserverLocation, getLookAngles } from "@/lib/PassPrediction";
import { SatelliteData } from "@/lib/tle";

// Default Observer (User's location - hardcoded for now or from context)
const DEFAULT_OBSERVER: ObserverLocation = {
    latitude: 39.9334, // Ankara
    longitude: 32.8597,
    altitude: 0
};

interface MissionDashboardProps {
    selectedObject: SpaceObject | null;
    telemetry: { lat: number; lon: number; alt: number; velocity: number } | null;
    className?: string;
    onClose?: () => void;
}

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-rajdhani font-bold tracking-wider transition-all rounded-t-lg border-t border-l border-r ${active
            ? "bg-slate-900/80 text-cyan-400 border-cyan-500/50 shadow-[0_-5px_15px_-5px_rgba(6,182,212,0.2)]"
            : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5"
            } `}
    >
        <Icon size={14} />
        {label}
    </button>
);

const MetricCard = ({ label, value, unit, icon: Icon, color = "text-white" }: any) => (
    <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Icon size={14} />
            <span className="text-[10px] uppercase tracking-widest">{label}</span>
        </div>
        <div className={`font-mono text-2xl font-bold ${color}`}>
            {value} <span className="text-xs text-slate-500 ml-1">{unit}</span>
        </div>
    </div>
);

const MissionDashboard: React.FC<MissionDashboardProps> = ({ selectedObject, telemetry, className, onClose }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'skyplot' | 'predictions' | 'decay'>('overview');

    // Convert SpaceObject to SatelliteData for PassPrediction
    const satelliteData: SatelliteData | null = useMemo(() => {
        if (!selectedObject || !selectedObject.tle) return null;
        return {
            id: selectedObject.id, // ID is string in SatelliteData
            name: selectedObject.name,
            line1: selectedObject.tle.line1,
            line2: selectedObject.tle.line2,
            category: selectedObject.category as any
        };
    }, [selectedObject]);

    // Calculate Current Az/El for Skyplot
    const currentLookAngles = useMemo(() => {
        if (!satelliteData) return undefined;
        const angles = getLookAngles(satelliteData, DEFAULT_OBSERVER, new Date());
        return angles && angles.elevation > 0 ? { az: angles.azimuth, el: angles.elevation } : undefined;
    }, [satelliteData, telemetry]); // Re-calc on telemetry tick essentially (time passing)

    if (!selectedObject) {
        return (
            <GlassPanel intensity="high" className={`w-full max-w-md mx-auto flex flex-col overflow-hidden shadow-2xl border-red-500/20 ${className}`}>
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/60 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                            <Activity size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-base font-rajdhani font-bold text-white uppercase tracking-wider">
                                MISSION DASHBOARD
                            </h2>
                            <p className="text-[9px] font-mono text-red-400">NO TARGET SELECTED</p>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5 flex items-center justify-center"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 text-center bg-slate-950/90">
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        Please select a satellite from the orbital globe or use search to establish a communication link and load real-time telemetry.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 font-rajdhani font-bold tracking-wider rounded-lg transition-colors text-xs"
                    >
                        RETURN TO GLOBAL VIEW
                    </button>
                </div>
            </GlassPanel>
        );
    }

    return (
        <GlassPanel intensity="high" className={`w-full max-w-5xl mx-auto max-h-[85vh] h-full flex flex-col overflow-hidden shadow-2xl ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/60 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-2xl font-rajdhani font-bold text-white uppercase tracking-wider">
                            MISSION DASHBOARD
                        </h2>
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-[10px] md:text-xs font-mono text-cyan-400">
                            <span>{selectedObject.name}</span>
                            <span className="hidden md:inline text-slate-600">|</span>
                            <span>ID: {selectedObject.id}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs & Close Action */}
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className="flex items-end gap-1 overflow-x-auto no-scrollbar mask-gradient-right">
                        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={Activity} label="OVERVIEW" />
                        <TabButton active={activeTab === 'skyplot'} onClick={() => setActiveTab('skyplot')} icon={Globe} label="SKYPLOT" />
                        <TabButton active={activeTab === 'predictions'} onClick={() => setActiveTab('predictions')} icon={Clock} label="PREDICTIONS" />
                        <TabButton active={activeTab === 'decay'} onClick={() => setActiveTab('decay')} icon={TrendingDown} label="DECAY ANALYSIS" />
                    </div>

                    {/* Mobile Tabs Dropdown or Simplified Switcher could go here, but for now just Close button */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5 flex items-center justify-center"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-950/90 relative custom-scrollbar">
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-grid-white/[0.02]"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <MetricCard
                                    label="ALTITUDE"
                                    value={telemetry?.alt.toFixed(4) || "---"}
                                    unit="km"
                                    icon={Maximize2}
                                    color="text-emerald-400"
                                />
                                <MetricCard
                                    label="VELOCITY"
                                    value={telemetry?.velocity.toFixed(5) || "---"}
                                    unit="km/s"
                                    icon={Zap}
                                    color="text-cyan-400"
                                />
                                <MetricCard
                                    label="LATITUDE"
                                    value={telemetry?.lat.toFixed(4) || "---"}
                                    unit="°"
                                    icon={MapIcon}
                                    color="text-purple-400"
                                />
                                <MetricCard
                                    label="LONGITUDE"
                                    value={telemetry?.lon.toFixed(4) || "---"}
                                    unit="°"
                                    icon={Navigation}
                                    color="text-pink-400"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Mini Map / Trajectory Placeholder */}
                                <div className="h-64 glass-panel border-white/5 p-4 flex flex-col">
                                    <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                                        <Globe size={16} /> LIVE TRAJECTORY
                                    </h3>
                                    <div className="flex-1 rounded-lg bg-black/40 border border-white/5 relative overflow-hidden flex items-center justify-center">
                                        <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover opacity-20 bg-center grayscale mix-blend-overlay"></div>
                                        {/* Simple live dot */}
                                        {telemetry && (
                                            <div
                                                className="absolute w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_10px_#00f3ff] transition-all duration-1000"
                                                style={{
                                                    top: `${(90 - telemetry.lat) / 180 * 100}%`,
                                                    left: `${(180 + telemetry.lon) / 360 * 100}%`
                                                }}
                                            />
                                        )}
                                        {!telemetry && <div className="text-xs text-slate-500 animate-pulse">AWAITING TELEMETRY...</div>}
                                    </div>
                                </div>

                                {/* Quick Info */}
                                <div className="h-64 glass-panel border-white/5 p-4">
                                    <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                                        <Activity size={16} /> MISSION STATUS
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between p-2 rounded bg-white/5">
                                            <span className="text-xs text-slate-400">Launch Year</span>
                                            <span className="text-sm font-mono text-white">
                                                {selectedObject.tle?.line1.substring(9, 11) ? (parseInt(selectedObject.tle.line1.substring(9, 11)) > 50 ? '19' : '20') + selectedObject.tle.line1.substring(9, 11) : 'Unknown'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between p-2 rounded bg-white/5">
                                            <span className="text-xs text-slate-400">Catalog Number</span>
                                            <span className="text-sm font-mono text-white">{selectedObject.id}</span>
                                        </div>
                                        <div className="flex justify-between p-2 rounded bg-white/5">
                                            <span className="text-xs text-slate-400">Type</span>
                                            <span className="text-sm font-mono text-white">{selectedObject.category}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'skyplot' && (
                        <motion.div
                            key="skyplot"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="h-full flex items-center justify-center p-4"
                        >
                            <div className="w-full max-w-md aspect-square bg-black/40 rounded-full border border-slate-800 p-8 shadow-2xl relative">
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-cyan-400 font-mono text-xs">LOCAL SKY (ANKARA)</div>
                                <Skyplot currentPos={currentLookAngles} />
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'predictions' && satelliteData && (
                        <motion.div
                            key="predictions"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full"
                        >
                            <PassPredictionPanel satellite={satelliteData} observer={DEFAULT_OBSERVER} />
                        </motion.div>
                    )}

                    {activeTab === 'decay' && (
                        <motion.div
                            key="decay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex items-center justify-center"
                        >
                            <div className="w-full max-w-2xl">
                                <DecayPanel
                                    tleLine1={selectedObject.tle?.line1 || null}
                                    altitudeKm={telemetry?.alt || null}
                                    satelliteName={selectedObject.name}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </GlassPanel>
    );
};

export default MissionDashboard;
