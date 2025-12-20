"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Flame, AlertTriangle, Orbit, X, Maximize2, Minimize2, Calendar } from "lucide-react";
import { clsx } from "clsx";
import DopplerPanel from "./DopplerPanel";
import DecayPanel from "./DecayPanel";
import ConjunctionPanel from "./ConjunctionPanel";
import PassPredictionPanel from "./PassPredictionPanel";
import OrbitalElementsPanel from "./OrbitalElementsPanel";
import { SatelliteState, ObserverPosition } from "@/lib/DopplerCalculator";
import { SpaceObject } from "@/lib/space-objects";
import { useTranslations } from "@/hooks/useLocale";
import { Atom } from "lucide-react";

type TabId = 'doppler' | 'decay' | 'conjunction' | 'prediction' | 'elements';

interface ScientificDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    selectedObject: SpaceObject | null;
    satelliteState: SatelliteState | null;
    observerPosition: ObserverPosition;
    telemetry?: { alt: number } | null;
    onSelectSatellite?: (noradId: string) => void;
}

const ScientificDashboard: React.FC<ScientificDashboardProps> = ({
    isOpen,
    onClose,
    selectedObject,
    satelliteState,
    observerPosition,
    telemetry,
    onSelectSatellite
}) => {
    const [activeTab, setActiveTab] = useState<TabId>('doppler');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const t = useTranslations();

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Memoize satellite data to prevent passing new object reference on every render
    const satelliteData = useMemo(() => {
        if (!selectedObject || selectedObject.type !== 'TLE' || !selectedObject.tle) return null;
        return { ...selectedObject.tle, id: selectedObject.id, name: selectedObject.name };
    }, [selectedObject]);

    const tabs: { id: TabId; label: string; icon: React.ReactNode; color: string }[] = [
        { id: 'doppler', label: 'Doppler', icon: <Radio size={14} />, color: 'purple' },
        { id: 'elements', label: 'Elements', icon: <Atom size={14} />, color: 'blue' },
        { id: 'prediction', label: 'Passes', icon: <Calendar size={14} />, color: 'cyan' },
        { id: 'decay', label: 'Decay', icon: <Flame size={14} />, color: 'orange' },
        { id: 'conjunction', label: 'Collision', icon: <AlertTriangle size={14} />, color: 'red' },
    ];

    const activeTabColor = tabs.find(t => t.id === activeTab)?.color || 'purple';

    // Get TLE line 1 from selected object
    const tleLine1 = useMemo(() => {
        if (!selectedObject || selectedObject.type !== 'TLE') return null;
        return selectedObject.tle?.line1 || null;
    }, [selectedObject]);

    if (!isOpen) return null;

    // Mobile Bottom Sheet version
    if (isMobile) {
        return (
            <AnimatePresence>
                <motion.div
                    key="scientific-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    onClick={onClose}
                />
                <motion.div
                    key="scientific-sheet"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-purple-500/30 z-50 rounded-t-3xl max-h-[80vh] flex flex-col"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Handle */}
                    <div className="flex justify-center py-2">
                        <div className="w-10 h-1 bg-white/20 rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="px-4 pb-2 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-white">Scientific Analysis</h2>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-2 border-b border-white/5">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all",
                                    activeTab === tab.id
                                        ? `text-${tab.color}-400 border-b-2 border-${tab.color}-400`
                                        : "text-slate-500"
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4">
                        {activeTab === 'doppler' && (
                            <DopplerPanel
                                satelliteState={satelliteState}
                                satelliteName={selectedObject?.name}
                                observerPosition={observerPosition}
                            />
                        )}
                        {activeTab === 'prediction' && (
                            satelliteData ? (
                                <PassPredictionPanel
                                    satellite={satelliteData}
                                    observer={observerPosition}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <AlertTriangle className="mb-2 opacity-50" />
                                    <p className="text-xs">Select a TLE-based satellite to view predictions.</p>
                                </div>
                            )
                        )}
                        {activeTab === 'decay' && (
                            <DecayPanel
                                tleLine1={tleLine1}
                                altitudeKm={telemetry?.alt || null}
                                satelliteName={selectedObject?.name}
                            />
                        )}
                        {activeTab === 'conjunction' && (
                            <ConjunctionPanel
                                onSelectObject={onSelectSatellite}
                            />
                        )}
                        {activeTab === 'elements' && (
                            <OrbitalElementsPanel satellite={selectedObject} />
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }

    // Desktop Floating Panel version
    return (
        <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={clsx(
                "fixed top-24 right-6 bg-slate-950/90 backdrop-blur-xl border border-purple-500/20 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] z-30 flex flex-col overflow-hidden",
                isExpanded ? "w-[500px] max-h-[80vh]" : "w-96 max-h-[calc(100vh-120px)]"
            )}
        >
            {/* Header */}
            <div className={`p-4 border-b border-white/10 bg-gradient-to-r from-${activeTabColor}-950/50 to-transparent flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <div className={`p-2 bg-${activeTabColor}-500/10 rounded-lg border border-${activeTabColor}-500/20`}>
                        <Orbit size={16} className={`text-${activeTabColor}-400`} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">Scientific Dashboard</h2>
                        <span className="text-[10px] text-purple-400 font-mono">ANALYST MODE</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all",
                            activeTab === tab.id
                                ? `text-${tab.color}-400 border-b-2 border-${tab.color}-400 bg-${tab.color}-500/5`
                                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                        )}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {activeTab === 'doppler' && (
                            <DopplerPanel
                                satelliteState={satelliteState}
                                satelliteName={selectedObject?.name}
                                observerPosition={observerPosition}
                            />
                        )}
                        {activeTab === 'prediction' && (
                            activeTab === 'prediction' && selectedObject && selectedObject.type === 'TLE' && selectedObject.tle ? (
                                <PassPredictionPanel
                                    satellite={{ ...selectedObject.tle, id: selectedObject.id, name: selectedObject.name }}
                                    observer={observerPosition}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <AlertTriangle className="mb-2 opacity-50" />
                                    <p className="text-xs">Select a TLE-based satellite to view predictions.</p>
                                </div>
                            )
                        )}
                        {activeTab === 'decay' && (
                            <DecayPanel
                                tleLine1={tleLine1}
                                altitudeKm={telemetry?.alt || null}
                                satelliteName={selectedObject?.name}
                            />
                        )}
                        {activeTab === 'conjunction' && (
                            <ConjunctionPanel
                                onSelectObject={onSelectSatellite}
                            />
                        )}
                        {activeTab === 'elements' && (
                            <OrbitalElementsPanel satellite={selectedObject} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/5 bg-black/20 text-center">
                <span className="text-[10px] text-slate-600">
                    {selectedObject ? `Analyzing: ${selectedObject.name}` : 'Select a satellite for analysis'}
                </span>
            </div>
        </motion.div>
    );
};

export default memo(ScientificDashboard);
