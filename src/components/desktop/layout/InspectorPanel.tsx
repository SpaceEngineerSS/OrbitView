"use client";

import React, { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Activity,
    Wifi,
    Maximize2,
    Database,
    Zap,
    Clock,
    X,
    ChevronRight,
    Satellite as SatelliteIcon,
    Radio
} from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";
import { SpaceObject } from "@/lib/space-objects";

interface TelemetryData {
    lat: number;
    lon: number;
    alt: number;
    velocity: number;
}

interface InspectorPanelProps {
    selectedObject: SpaceObject | null;
    telemetry: TelemetryData | null;
    onClose: () => void;
}

const DataRow = ({ label, value, unit, icon: Icon }: { label: string; value: string; unit?: string; icon?: React.ElementType }) => (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
        <div className="flex items-center gap-2 text-slate-400">
            {Icon && <Icon size={12} />}
            <span className="font-mono text-xs">{label}</span>
        </div>
        <div className="font-mono text-cyan-400 text-sm">
            {value} <span className="text-slate-500 text-xs">{unit}</span>
        </div>
    </div>
);

const Section = ({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: React.ElementType }) => (
    <div className="mb-6 last:mb-0">
        <div className="flex items-center gap-2 mb-3 text-cyan-400/80">
            <Icon size={14} />
            <h3 className="font-rajdhani font-bold text-sm tracking-widest uppercase">{title}</h3>
        </div>
        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
            {children}
        </div>
    </div>
);

const InspectorPanel: React.FC<InspectorPanelProps> = memo(({ selectedObject, telemetry, onClose }) => {

    // Derived Telemetry Data
    const formattedData = useMemo(() => {
        if (!telemetry) return null;
        return {
            lat: `${Math.abs(telemetry.lat).toFixed(6)}° ${telemetry.lat >= 0 ? 'N' : 'S'}`,
            lon: `${Math.abs(telemetry.lon).toFixed(6)}° ${telemetry.lon >= 0 ? 'E' : 'W'}`,
            alt: telemetry.alt.toFixed(4),
            vel: telemetry.velocity.toFixed(5),
            period: Math.round(2 * Math.PI * Math.sqrt(Math.pow(6371 + telemetry.alt, 3) / 398600.4418) / 60).toString()
        };
    }, [telemetry]);

    if (!selectedObject) return null;

    return (
        <AnimatePresence>
            <motion.div
                layout
                initial={{ y: "100%", x: 0, opacity: 0 }}
                animate={{ y: 0, x: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed bottom-[96px] md:bottom-0 md:top-16 md:right-0 md:left-auto z-40 inset-x-4 md:inset-x-auto w-auto md:w-96 h-[45vh] md:h-auto pointer-events-none pb-[env(safe-area-inset-bottom)] md:pb-0"
            >
                <GlassPanel
                    intensity="high"
                    borderGlow={true}
                    className="h-full w-full pointer-events-auto rounded-2xl md:rounded-l-xl md:rounded-r-none md:border-r-0 flex flex-col shadow-[0_12px_40px_rgba(0,0,0,0.6)] border-white/10"
                >
                    {/* Mobile Drag Handle */}
                    <div className="md:hidden w-full flex justify-center pt-3 pb-1">
                        <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="flex-shrink-0 p-4 border-b border-white/10 bg-white/5">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                                </span>
                                <span className="font-mono text-[10px] text-cyan-400 tracking-widest uppercase">LIVE FEED</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <h2 className="font-rajdhani font-bold text-2xl text-white overflow-hidden text-ellipsis whitespace-nowrap">
                            {selectedObject.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-mono text-cyan-400">
                                {selectedObject.category || 'SATELLITE'}
                            </span>
                            <span className="text-xs font-mono text-slate-500">#{selectedObject.id}</span>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">

                        {/* 1. Telemetry Section */}
                        <Section title="Real-time Telemetry" icon={Activity}>
                            <DataRow label="Altitude" value={formattedData?.alt || "---"} unit="km" icon={Maximize2} />
                            <DataRow label="Velocity" value={formattedData?.vel || "---"} unit="km/s" icon={Zap} />
                            <DataRow label="Latitude" value={formattedData?.lat || "---"} icon={Database} />
                            <DataRow label="Longitude" value={formattedData?.lon || "---"} icon={Database} />
                            <DataRow label="Orbital Period" value={formattedData?.period || "---"} unit="min" icon={Clock} />
                        </Section>

                        {/* 2. Signal Status */}
                        <Section title="Uplink Status" icon={Wifi}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-400 font-mono">Signal Strength</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className={`w-1 h-3 rounded-sm ${i <= 4 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-3">
                                <div className="bg-black/40 p-2 rounded text-center">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Doppler</div>
                                    <div className="text-emerald-400 font-mono text-xs">{(Math.random() * 10 - 5).toFixed(2)} kHz</div>
                                </div>
                                <div className="bg-black/40 p-2 rounded text-center">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Latency</div>
                                    <div className="text-emerald-400 font-mono text-xs">{Math.floor(Math.random() * 50 + 20)} ms</div>
                                </div>
                            </div>
                        </Section>

                        {/* 3. TLE Data (Raw) */}
                        {selectedObject.tle && (
                            <Section title="Orbital Elements (TLE)" icon={SatelliteIcon}>
                                <div className="font-mono text-[10px] text-slate-500 whitespace-pre-wrap break-all bg-black/40 p-2 rounded border border-white/5">
                                    <div className="mb-1 text-cyan-500/50">LINE 1</div>
                                    {selectedObject.tle.line1}
                                    <div className="my-1 border-t border-white/5" />
                                    <div className="mb-1 text-cyan-500/50">LINE 2</div>
                                    {selectedObject.tle.line2}
                                </div>
                            </Section>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-white/10 bg-white/5">
                        <button className="w-full py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 font-rajdhani font-bold tracking-wider rounded transition-all flex items-center justify-center gap-2 group">
                            <Radio size={16} className="group-hover:animate-pulse" />
                            ESTABLISH COMM LINK
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </GlassPanel>
            </motion.div>
        </AnimatePresence>
    );
});

InspectorPanel.displayName = "InspectorPanel";

export default InspectorPanel;
