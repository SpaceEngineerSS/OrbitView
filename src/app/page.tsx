"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/HUD/Sidebar";
import Timeline from "@/components/HUD/Timeline";
import KeyboardShortcutsModal from "@/components/HUD/KeyboardShortcutsModal";
import ModeSwitch from "@/components/HUD/ModeSwitch";
import InfoPanel, { TelemetryData } from "@/components/HUD/InfoPanel";
import ObserverLocationSelector from "@/components/HUD/ObserverLocationSelector";
import LanguageSwitcher from "@/components/HUD/LanguageSwitcher";
import SettingsPanel, { AppSettings, DEFAULT_SETTINGS } from "@/components/HUD/SettingsPanel";
import OnboardingModal from "@/components/HUD/OnboardingModal";
import Footer from "@/components/HUD/Footer";
import SplashScreen from "@/components/HUD/SplashScreen";
import ScientificDashboard from "@/components/Scientific/ScientificDashboard";
import ReferencesModal from "@/components/HUD/ReferencesModal";
import { fetchActiveSatellites } from "@/lib/tle";
import { SpaceObject, convertToSpaceObject } from "@/lib/space-objects";
import ErrorBoundary from "@/components/Common/ErrorBoundary";
import { useFavorites } from "@/hooks/useFavorites";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAnalystMode } from "@/hooks/useAnalystMode";
import { SatelliteState, ObserverPosition, geodeticToECF } from "@/lib/DopplerCalculator";
import { Loader2, Keyboard, FlaskConical, MapPin, Settings, BookOpen } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";

const Globe = dynamic(() => import("@/components/Globe"), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="text-cyan-400 animate-spin" />
                <span className="text-cyan-500 text-sm font-mono tracking-wider animate-pulse">
                    INITIALIZING ORBIT VIEWER...
                </span>
            </div>
        </div>
    )
});

// Main Page Component
// Internal component to handle search params
function PageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const satId = searchParams.get('sat');

    const [objects, setObjects] = useState<SpaceObject[]>([]);
    const [selectedObject, setSelectedObject] = useState<SpaceObject | null>(null);
    const [telemetry, setTelemetry] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Sync selected satellite with URL
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (selectedObject) {
            if (params.get('sat') !== selectedObject.id) {
                params.set('sat', selectedObject.id);
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            }
        } else {
            if (params.has('sat') && !isLoading) { // Don't clear on initial load before objects are ready
                params.delete('sat');
                router.replace(`${pathname}`, { scroll: false });
            }
        }
    }, [selectedObject, pathname, router, searchParams, isLoading]);

    const [filter, setFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<'ORBIT' | 'SATELLITE_POV'>('ORBIT');
    const [isPlaying, setIsPlaying] = useState(true);
    const [timeMultiplier, setTimeMultiplier] = useState(1);

    const { favorites, isFavorite, toggleFavorite } = useFavorites();
    const { mode, isAnalystMode, toggleMode } = useAnalystMode();

    const [isMobile, setIsMobile] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [showScientific, setShowScientific] = useState(false);
    const [showLocationSelector, setShowLocationSelector] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [hoveredObject, setHoveredObject] = useState<SpaceObject | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [showReferences, setShowReferences] = useState(false);
    const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

    // Observer position (default: Istanbul, now editable)
    const [observerPosition, setObserverPosition] = useState<ObserverPosition>({
        latitude: 41.0082,
        longitude: 28.9784,
        altitude: 0
    });

    // Calculate satellite state for Doppler
    const satelliteState = useMemo<SatelliteState | null>(() => {
        if (!telemetry) return null;

        // Convert telemetry to ECF position (approximate)
        const pos = geodeticToECF(telemetry.lat, telemetry.lon, telemetry.alt * 1000);

        // Approximate velocity in ECF (simplified - assumes circular orbit)
        const orbitalVel = telemetry.velocity * 1000; // km/s to m/s
        const latRad = telemetry.lat * (Math.PI / 180);
        const lonRad = telemetry.lon * (Math.PI / 180);

        // Velocity roughly tangent to orbit (simplified)
        const vel = {
            x: -orbitalVel * Math.sin(lonRad),
            y: orbitalVel * Math.cos(lonRad),
            z: 0
        };

        return { position: pos, velocity: vel };
    }, [telemetry]);

    useKeyboardShortcuts({
        onSearch: () => {
            const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            searchInput?.focus();
        },
        onToggleFavorite: () => {
            if (selectedObject) toggleFavorite(selectedObject.id);
        },
        onRandomSatellite: () => {
            if (objects.length > 0) {
                const randomIndex = Math.floor(Math.random() * objects.length);
                setSelectedObject(objects[randomIndex]);
            }
        },
        onTogglePlay: () => setIsPlaying(!isPlaying),
        onEscape: () => {
            setSelectedObject(null);
            setViewMode('ORBIT');
            setShowShortcuts(false);
            setShowScientific(false);
        },
        onHelp: () => setShowShortcuts(true)
    });

    // Add 'A' key for toggling analyst mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;
            if (e.key.toLowerCase() === 'a') {
                e.preventDefault();
                toggleMode();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleMode]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Check for first-time visitor and load settings
    useEffect(() => {
        const onboardingComplete = localStorage.getItem('orbitview-onboarding-complete');
        if (!onboardingComplete) {
            setShowOnboarding(true);
        }

        const savedSettings = localStorage.getItem('orbitview-settings');
        if (savedSettings) {
            try {
                setAppSettings(JSON.parse(savedSettings));
            } catch (e) {
                // Invalid settings, use defaults
            }
        }
    }, []);

    useEffect(() => {
        setCurrentTime(new Date());
        const loadData = async () => {
            setIsLoading(true);
            try {
                const tles = await fetchActiveSatellites();
                const tleObjects = tles.map(convertToSpaceObject);
                setObjects(tleObjects);
                toast.success(`${tleObjects.length} satellites loaded`);

            } catch (error) {
                toast.error('Failed to load satellite data. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Deep Linking: Auto-select satellite from URL
    useEffect(() => {
        if (satId && objects.length > 0 && !isLoading) {
            const currentId = selectedObject?.id;
            if (satId !== currentId) {
                const sat = objects.find(o => o.id === satId);
                if (sat) {
                    setSelectedObject(sat);
                    // Only toast on initial track or if triggered by link
                    if (!currentId) {
                        toast.info(`Tracking: ${sat.name}`, {
                            icon: '🛰️',
                            duration: 5000
                        });
                    }
                }
            }
        }
    }, [satId, objects, isLoading]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (isPlaying) {
                setCurrentTime(prev => {
                    if (!prev) return new Date();
                    return new Date(prev.getTime() + 1000 * timeMultiplier);
                });
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [isPlaying, timeMultiplier]);

    // Memoized callbacks to prevent child re-renders
    const handleMountCamera = useCallback(() => {
        setViewMode(v => v === 'ORBIT' ? 'SATELLITE_POV' : 'ORBIT');
    }, []);

    const handleTimeChange = useCallback((newTime: Date) => {
        setCurrentTime(newTime);
    }, []);

    const handleTogglePlay = useCallback(() => {
        setIsPlaying(p => !p);
    }, []);

    const handleMultiplierChange = useCallback((multiplier: number) => {
        setTimeMultiplier(multiplier);
    }, []);

    const handleSelectSatelliteById = useCallback((noradId: string) => {
        setSelectedObject(prev => {
            const sat = objects.find(o => o.id === noradId);
            return sat || prev;
        });
    }, [objects]);

    const handleTelemetryUpdate = useCallback((data: any) => {
        setTelemetry(data);
    }, []);

    const handleHover = useCallback((obj: SpaceObject | null) => {
        setHoveredObject(obj);
    }, []);

    const handleCloseInfoPanel = useCallback(() => {
        setSelectedObject(null);
        setViewMode('ORBIT');
    }, []);

    const handleCloseScientific = useCallback(() => {
        setShowScientific(false);
    }, []);

    const handleOpenScientific = useCallback(() => {
        setShowScientific(true);
    }, []);

    const handleSelectObject = useCallback((obj: SpaceObject | null) => {
        setSelectedObject(obj);
    }, []);

    const handleToggleCurrentFavorite = useCallback(() => {
        if (selectedObject) {
            toggleFavorite(selectedObject.id);
        }
    }, [selectedObject, toggleFavorite]);

    return (
        <main className="w-full h-screen bg-black overflow-hidden relative" role="main" aria-label="OrbitView Satellite Tracker">
            <SplashScreen isLoading={isLoading} loadedCount={objects.length} totalCount={13000} />

            <ErrorBoundary className="z-0">
                <Globe
                    currentTime={currentTime}
                    objects={objects}
                    onSelect={handleSelectObject}
                    selectedObject={selectedObject}
                    onTelemetryUpdate={handleTelemetryUpdate}
                    filter={filter}
                    searchQuery={searchQuery}
                    viewMode={viewMode}
                    settings={appSettings}
                    onHover={handleHover}
                />
            </ErrorBoundary>

            {/* Hover Tooltip */}
            <AnimatePresence>
                {hoveredObject && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.1 }}
                        style={{
                            position: 'fixed',
                            left: mousePos.x + 15,
                            top: mousePos.y - 15,
                            pointerEvents: 'none'
                        }}
                        className="z-[200] bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-lg shadow-2xl"
                    >
                        <div className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mb-0.5">SATELLITE</div>
                        <div className="text-white text-sm font-bold flex items-center gap-2">
                            {hoveredObject.name}
                            <span className="text-[10px] text-slate-500 font-mono">#{hoveredObject.id}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Sidebar
                objects={objects}
                onSearch={setSearchQuery}
                onFilterChange={setFilter}
                onSelect={handleSelectObject}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
            />

            {selectedObject && (
                <InfoPanel
                    object={selectedObject}
                    onClose={handleCloseInfoPanel}
                    telemetry={telemetry}
                    onMountCamera={handleMountCamera}
                    isCameraMounted={viewMode === 'SATELLITE_POV'}
                    isFavorite={isFavorite(selectedObject.id)}
                    onToggleFavorite={handleToggleCurrentFavorite}
                    isAnalystMode={isAnalystMode}
                    onOpenScientific={handleOpenScientific}
                />
            )}

            {/* Scientific Dashboard */}
            <AnimatePresence>
                {showScientific && (
                    <ScientificDashboard
                        isOpen={showScientific}
                        onClose={handleCloseScientific}
                        selectedObject={selectedObject}
                        satelliteState={satelliteState}
                        observerPosition={observerPosition}
                        telemetry={telemetry}
                        onSelectSatellite={handleSelectSatelliteById}
                    />
                )}
            </AnimatePresence>

            {/* Observer Location Selector */}
            <ObserverLocationSelector
                isOpen={showLocationSelector}
                onClose={() => setShowLocationSelector(false)}
                currentPosition={observerPosition}
                onPositionChange={(pos) => {
                    setObserverPosition(pos);
                    toast.success(`Location updated to ${pos.latitude.toFixed(4)}°, ${pos.longitude.toFixed(4)}°`);
                }}
            />

            {(!isMobile || !selectedObject) && (
                <Timeline
                    time={currentTime}
                    onTimeChange={handleTimeChange}
                    isPlaying={isPlaying}
                    onTogglePlay={handleTogglePlay}
                    multiplier={timeMultiplier}
                    onMultiplierChange={handleMultiplierChange}
                />
            )}

            {/* Top Bar with Mode Switch */}
            {!isLoading && (
                <div className="fixed top-6 right-6 z-30 flex items-center gap-2" role="toolbar" aria-label="Application controls">
                    {/* Language Switcher */}
                    <LanguageSwitcher />

                    {/* Location Button */}
                    <button
                        onClick={() => setShowLocationSelector(true)}
                        className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 hover:bg-emerald-500/30 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                        aria-label="Change observer location"
                        title={`Observer: ${observerPosition.latitude.toFixed(2)}°, ${observerPosition.longitude.toFixed(2)}°`}
                    >
                        <MapPin size={18} aria-hidden="true" />
                    </button>

                    {/* Settings Button */}
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 bg-slate-500/20 border border-slate-500/40 rounded-xl text-slate-400 hover:bg-slate-500/30 transition-all"
                        aria-label="Open application settings"
                        title="Settings"
                    >
                        <Settings size={18} aria-hidden="true" />
                    </button>

                    {/* References Button */}
                    <button
                        onClick={() => setShowReferences(true)}
                        className="p-2 bg-purple-500/20 border border-purple-500/40 rounded-xl text-purple-400 hover:bg-purple-500/30 transition-all"
                        aria-label="View scientific references and citations"
                        title="References & Citations"
                    >
                        <BookOpen size={18} aria-hidden="true" />
                    </button>

                    <ModeSwitch mode={mode} onToggle={toggleMode} />

                    {isAnalystMode && (
                        <button
                            onClick={() => setShowScientific(true)}
                            className="p-2 bg-purple-500/20 border border-purple-500/40 rounded-xl text-purple-400 hover:bg-purple-500/30 transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                            aria-label="Open Scientific Analysis Dashboard"
                            title="Open Scientific Dashboard"
                        >
                            <FlaskConical size={18} aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}

            {/* Keyboard Shortcut Button */}
            {!isMobile && !isLoading && (
                <button
                    onClick={() => setShowShortcuts(true)}
                    className="fixed bottom-8 right-8 z-20 p-3 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-xl text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all group"
                >
                    <Keyboard size={18} />
                    <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-900 text-[10px] text-slate-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Press ? for shortcuts</span>
                </button>
            )}

            <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

            {/* Settings Panel */}
            <SettingsPanel
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                settings={appSettings}
                onSettingsChange={setAppSettings}
            />

            {/* Onboarding Modal */}
            <OnboardingModal
                isOpen={showOnboarding}
                onClose={() => setShowOnboarding(false)}
                onComplete={() => setShowOnboarding(false)}
            />

            {/* References Modal */}
            <ReferencesModal
                isOpen={showReferences}
                onClose={() => setShowReferences(false)}
            />

            {/* Footer */}
            <Footer />

            {/* Toast Notifications */}
            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        backdropFilter: 'blur(20px)'
                    }
                }}
            />
        </main>
    );
}

export default function Page() {
    return (
        <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={48} className="text-cyan-400 animate-spin" />
                    <span className="text-cyan-500 text-sm font-mono tracking-wider animate-pulse uppercase">
                        Loading Satellites...
                    </span>
                </div>
            </div>
        }>
            <PageContent />
        </Suspense>
    );
}
