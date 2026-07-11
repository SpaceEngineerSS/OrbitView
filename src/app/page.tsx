"use client";

import dynamic from "next/dynamic";
import { Toaster } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import ModernSidebar from "@/components/layout/ModernSidebar";
import MobileNavBar from "@/components/layout/MobileNavBar";
import TopBar from "@/components/layout/TopBar";
import BottomPanel from "@/components/layout/BottomPanel";
import InspectorPanel from "@/components/layout/InspectorPanel";
import MissionDashboard from "@/components/Scientific/MissionDashboard";
import SettingsPanel, { DEFAULT_SETTINGS, AppSettings } from "@/components/HUD/SettingsPanel";
import MobileSearchOverlay from "@/components/HUD/Mobile/MobileSearchOverlay";
import Timeline from "@/components/HUD/Timeline";
import { useTimelineStore } from "@/store/timelineStore";
import { useEffect, useState, useCallback } from "react";
import { fetchActiveSatellites } from "@/lib/tle";
import { SpaceObject, convertToSpaceObject } from "@/lib/space-objects";

// Dynamic import for Globe to avoid SSR issues with Cesium
const Globe = dynamic(() => import("@/components/Globe"), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-cyan-400 font-rajdhani animate-pulse tracking-widest">
            INITIALIZING ORBITAL SYSTEMS...
        </div>
    ),
});

export default function Home() {
    const [objects, setObjects] = useState<SpaceObject[]>([]);
    const [loading, setLoading] = useState(true);

    // UI & Interaction State
    const [selectedSatellite, setSelectedSatellite] = useState<SpaceObject | null>(null);
    const [telemetry, setTelemetry] = useState<{ lat: number; lon: number; alt: number; velocity: number } | null>(null);
    const [activeView, setActiveView] = useState<'globe' | 'analytics' | 'settings'>('globe');
    const [searchQuery, setSearchQuery] = useState("");
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isTelemetryExpanded, setIsTelemetryExpanded] = useState(false);

    // Timeline state from Zustand
    const { currentTime, isPlaying, multiplier, setTime, togglePlay, setMultiplier } = useTimelineStore();

    // Fetch Satellite Data on Load
    useEffect(() => {
        const loadSatellites = async () => {
            try {
                const data = await fetchActiveSatellites();
                // Convert SatelliteData to SpaceObject using helper
                const spaceObjects: SpaceObject[] = data.map(convertToSpaceObject);
                setObjects(spaceObjects);
            } catch (error) {
                console.error("Failed to load satellite data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadSatellites();
    }, []);

    const handleSatelliteSelect = useCallback((sat: SpaceObject | null) => {
        setSelectedSatellite(sat);
        if (!sat) {
            setTelemetry(null);
            setSearchQuery("");
        }
    }, []);

    const handleTelemetryUpdate = useCallback((data: any) => {
        if (selectedSatellite && data) {
            setTelemetry(data);
        }
    }, [selectedSatellite]);

    return (
        <main className="relative h-screen w-screen overflow-hidden bg-[#050507]">
            {/* 3D Space Layer (Z-0) */}
            <div className="absolute inset-0 z-0">
                <Globe
                    objects={objects}
                    selectedObject={selectedSatellite}
                    onSelect={handleSatelliteSelect}
                    onTelemetryUpdate={handleTelemetryUpdate}
                    searchQuery={searchQuery}
                    settings={settings}
                />
            </div>

            {/* UI Layer (Z-10+) */}
            {/* Pointer events NONE on wrapper to let clicks pass to Globe */}
            <div className="relative z-10 h-full w-full pointer-events-none">

                {/* Pointer events AUTO on interactive HUD elements */}
                <div className="pointer-events-auto hidden md:block">
                    <TopBar
                        onSearch={setSearchQuery}
                        objects={objects}
                        onSelect={handleSatelliteSelect}
                        searchQuery={searchQuery}
                    />
                </div>

                {/* Mobile Search Button (Floating) */}
                <div className="block md:hidden fixed top-4 right-4 z-40 pointer-events-auto">
                    <button
                        onClick={() => setIsMobileSearchOpen(true)}
                        className="p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-cyan-400 hover:text-white shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all duration-300 hover:border-cyan-500/50"
                        aria-label="Search Satellites"
                    >
                        <Search size={20} />
                    </button>
                </div>

                {/* Desktop Sidebar */}
                <div className="hidden md:block pointer-events-auto">
                    <ModernSidebar
                        activeView={activeView}
                        onViewChange={setActiveView}
                    />
                </div>

                {/* Mobile Bottom Navigation */}
                <div className="block md:hidden pointer-events-auto">
                    <MobileNavBar
                        activeView={activeView}
                        onViewChange={setActiveView}
                    />
                </div>

                {/* Desktop Bottom Panel */}
                <div className="hidden md:block pointer-events-auto">
                    <BottomPanel
                        telemetry={telemetry}
                        isExpanded={isTelemetryExpanded}
                        onToggle={() => setIsTelemetryExpanded(!isTelemetryExpanded)}
                    />
                </div>

                {/* Simulation Timeline Controls */}
                <div className="pointer-events-auto">
                    <Timeline
                        time={currentTime}
                        onTimeChange={setTime}
                        isPlaying={isPlaying}
                        onTogglePlay={togglePlay}
                        multiplier={multiplier}
                        onMultiplierChange={setMultiplier}
                        className={isTelemetryExpanded ? "bottom-[204px]" : "bottom-[84px]"}
                    />
                </div>

                {/* Main Scientific Dashboard (Analytics View) */}
                <AnimatePresence mode="wait">
                    {activeView === 'analytics' && (
                        <motion.div
                            key="dashboard-container"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none p-4 md:pl-20 md:pr-4 pb-24 md:pb-20"
                        >
                            <div className="pointer-events-auto w-full max-w-5xl relative">
                                <MissionDashboard
                                    selectedObject={selectedSatellite}
                                    telemetry={telemetry}
                                    className="shadow-2xl"
                                    onClose={() => setActiveView('globe')}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Settings Panel */}
                <SettingsPanel
                    isOpen={activeView === 'settings'}
                    settings={settings}
                    onSettingsChange={setSettings}
                    onClose={() => setActiveView('globe')}
                />

                {/* Inspector Panel (Only show in Globe view when sat is selected) */}
                <AnimatePresence>
                    {activeView === 'globe' && selectedSatellite && (
                        <motion.div
                            key="inspector-panel"
                            className="pointer-events-auto"
                        >
                            <InspectorPanel
                                selectedObject={selectedSatellite}
                                telemetry={telemetry}
                                onClose={() => setSelectedSatellite(null)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Loading Indicator Overlay */}
                {loading && (
                    <div className="absolute top-4 left-6 md:top-20 md:right-6 md:left-auto glass-panel px-4 py-2 border-l-2 border-cyan-400 flex items-center gap-3 pointer-events-auto">
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-mono text-cyan-400">ESTABLISHING UPLINK...</span>
                    </div>
                )}

                {/* Mobile Search Overlay */}
                <MobileSearchOverlay
                    isOpen={isMobileSearchOpen}
                    onClose={() => setIsMobileSearchOpen(false)}
                    objects={objects}
                    onSelect={(sat) => handleSatelliteSelect(sat)}
                />

                {/* Notifications */}
                <Toaster
                    position="top-right"
                    theme="dark"
                    toastOptions={{
                        className: "glass-panel text-white border-cyan-500/30",
                        style: { fontFamily: "var(--font-rajdhani)" }
                    }}
                />
            </div>
        </main>
    );
}
