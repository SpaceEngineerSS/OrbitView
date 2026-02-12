"use client";

import dynamic from "next/dynamic";
import { Toaster } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import ModernSidebar from "@/components/layout/ModernSidebar";
import MobileNavBar from "@/components/layout/MobileNavBar";
import TopBar from "@/components/layout/TopBar";
import BottomPanel from "@/components/layout/BottomPanel";
import InspectorPanel from "@/components/layout/InspectorPanel";
import MissionDashboard from "@/components/Scientific/MissionDashboard";
import SettingsPanel, { DEFAULT_SETTINGS, AppSettings } from "@/components/HUD/SettingsPanel";
import { useEffect, useState } from "react";
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

    const handleSatelliteSelect = (sat: SpaceObject | null) => {
        setSelectedSatellite(sat);
        if (!sat) setTelemetry(null);
    };

    const handleTelemetryUpdate = (data: any) => {
        if (selectedSatellite && data) {
            setTelemetry(data);
        }
    };

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
                <div className="pointer-events-auto">
                    <TopBar onSearch={setSearchQuery} />
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

                {/* Desktop Bottom Panel - Modified to hide on mobile to save space if needed, or keep it. User asked for responsive layout. Let's keep it but maybe it overlaps with nav? 
                    Actually, making it hidden on mobile might be better for now to avoid clutter, OR adapting it.
                    User request didn't explicitly say hide BottomPanel, but implied MobileNavBar takes precedence.
                    Let's hide BottomPanel on MOBILE to respect the "clean" requested look and let Inspector/NavBar handle things.
                */}
                <div className="hidden md:block pointer-events-auto">
                    <BottomPanel telemetry={telemetry} />
                </div>
                {/* Mobile Telemetry could be integrated into the InspectorPanel or a smaller simplified view. 
                    For now, I'll hide the big BottomPanel on mobile as it conflicts with the new BottomNavBar.
                */}

                {/* Main Scientific Dashboard (Analytics View) */}
                <AnimatePresence mode="wait">
                    {activeView === 'analytics' && (
                        <motion.div
                            key="dashboard-container"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none p-4 pl-0 md:pl-20 pb-20 md:pb-20" // Adjusted padding for mobile
                        >
                            <div className="pointer-events-auto w-full max-w-5xl relative">
                                <button
                                    onClick={() => setActiveView('globe')}
                                    className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white transition-colors pointer-events-auto flex items-center gap-2"
                                >
                                    <span className="text-xs uppercase font-bold tracking-widest">Close Dashboard</span>
                                </button>
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

                {/* Settings Panel - Handles its own internal AnimatePresence */}
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
                    <div className="absolute top-24 md:top-20 right-6 glass-panel px-4 py-2 border-l-2 border-cyan-400 flex items-center gap-3 pointer-events-auto">
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-mono text-cyan-400">ESTABLISHING UPLINK...</span>
                    </div>
                )}

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
