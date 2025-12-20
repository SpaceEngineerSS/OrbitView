"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Satellite, Activity, Navigation, Clock, Zap, Radio, Camera, Star, Share2, Orbit, TrendingUp, ShieldAlert, FlaskConical, X, Rocket, MapPin, Download, FileText, Globe, Info } from "lucide-react";
import { SpaceObject } from "@/lib/space-objects";
import { useTranslations } from "@/hooks/useLocale";
import { CoordinateSystem, geodeticToEcf, ecfToEci, calculateGMST, calculateSunPosition } from "@/lib/CoordinateConverter";

import { useRef } from "react";

export interface TelemetryData {
    lat: number;
    lon: number;
    alt: number;
    velocity: number;
}

export interface InfoPanelProps {
    object: SpaceObject | null;
    onClose: () => void;
    telemetry?: TelemetryData | null;
    onMountCamera?: () => void;
    isCameraMounted?: boolean;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
    isAnalystMode?: boolean;
    onOpenScientific?: () => void;
}

// Memoized component for telemetry display - isolates re-renders to just this section
const TelemetryGraph = memo(({ data, color }: { data: number[], color: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, rect.width, rect.height);

        if (data.length < 2) return;

        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        data.forEach((val, i) => {
            const x = (i / (data.length - 1)) * rect.width;
            const y = rect.height - ((val - min) / range) * (rect.height - 4) - 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();

        // Gradient under line
        const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
        gradient.addColorStop(0, color.replace('1)', '0.2)'));
        gradient.addColorStop(1, 'transparent');
        ctx.lineTo((data.length - 1) / (data.length - 1) * rect.width, rect.height);
        ctx.lineTo(0, rect.height);
        ctx.fillStyle = gradient;
        ctx.fill();

    }, [data, color]);

    return <canvas ref={canvasRef} className="w-full h-8 opacity-60" />;
});

const TelemetryDisplay = memo(({ telemetry }: { telemetry: TelemetryData | null | undefined }) => {
    const [coordSystem, setCoordSystem] = useState<CoordinateSystem>('Geodetic');
    const [altHistory, setAltHistory] = useState<number[]>([]);
    const [velHistory, setVelHistory] = useState<number[]>([]);

    useEffect(() => {
        if (telemetry) {
            setAltHistory(prev => [...prev.slice(-29), telemetry.alt]);
            setVelHistory(prev => [...prev.slice(-29), telemetry.velocity]);
        } else {
            setAltHistory([]);
            setVelHistory([]);
        }
    }, [telemetry]);

    if (!telemetry) {
        return (
            <div className="h-32 flex flex-col items-center justify-center bg-black/20 rounded-lg border border-white/5 border-dashed">
                <Radio size={24} className="text-cyan-900 animate-pulse mb-2" />
                <span className="text-[10px] text-cyan-800 animate-pulse">ACQUIRING SIGNAL...</span>
            </div>
        );
    }

    return (
        <>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2"><Activity size={12} /> Real-time Telemetry</span>
                {/* Coordinate System Toggle */}
                <div className="flex gap-1">
                    {(['Geodetic', 'ECF', 'ECI'] as CoordinateSystem[]).map(sys => (
                        <button
                            key={sys}
                            onClick={() => setCoordSystem(sys)}
                            aria-label={`Switch to ${sys} coordinates`}
                            className={`px-2 py-0.5 rounded text-[8px] font-bold transition-colors ${coordSystem === sys
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-transparent'
                                }`}
                        >
                            {sys}
                        </button>
                    ))}
                </div>
            </h3>
            {coordSystem === 'Geodetic' && (
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/40 p-3 rounded-lg border border-white/5 overflow-hidden">
                        <div className="flex items-center gap-2 text-[10px] text-cyan-600 mb-1"><Navigation size={10} /> LATITUDE</div>
                        <div className="font-mono text-slate-200">{telemetry.lat.toFixed(4)}°</div>
                        <div className="h-8 mt-2 opacity-20"><div className="w-full h-px bg-white/5 mt-4" /></div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-white/5 overflow-hidden">
                        <div className="flex items-center gap-2 text-[10px] text-cyan-600 mb-1"><Navigation size={10} /> LONGITUDE</div>
                        <div className="font-mono text-slate-200">{telemetry.lon.toFixed(4)}°</div>
                        <div className="h-8 mt-2 opacity-20"><div className="w-full h-px bg-white/5 mt-4" /></div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-white/5 overflow-hidden">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 text-[10px] text-cyan-600 mb-1"><Zap size={10} /> ALTITUDE</div>
                            <span className="text-[8px] text-slate-600 font-mono">TREND</span>
                        </div>
                        <div className="font-mono text-slate-200 mb-2">{telemetry.alt.toFixed(2)} km</div>
                        <TelemetryGraph data={altHistory} color="rgba(6, 182, 212, 1)" />
                    </div>
                    <div className="bg-black/40 p-3 rounded-lg border border-white/5 overflow-hidden">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 text-[10px] text-cyan-600 mb-1"><Clock size={10} /> VELOCITY</div>
                            <span className="text-[8px] text-slate-600 font-mono">TREND</span>
                        </div>
                        <div className="font-mono text-slate-200 mb-2">{telemetry.velocity.toFixed(2)} km/s</div>
                        <TelemetryGraph data={velHistory} color="rgba(34, 197, 94, 1)" />
                    </div>
                </div>
            )}
            {(coordSystem === 'ECF' || coordSystem === 'ECI') && (() => {
                const ecf = geodeticToEcf({ latitude: telemetry.lat, longitude: telemetry.lon, altitude: telemetry.alt });
                const coords = coordSystem === 'ECI' ? ecfToEci(ecf, new Date()) : ecf;
                return (
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                            <div className="text-[10px] text-cyan-600 mb-1">X</div>
                            <div className="font-mono text-sm text-slate-200">{coords.x.toFixed(1)} km</div>
                        </div>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                            <div className="text-[10px] text-cyan-600 mb-1">Y</div>
                            <div className="font-mono text-sm text-slate-200">{coords.y.toFixed(1)} km</div>
                        </div>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                            <div className="text-[10px] text-cyan-600 mb-1">Z</div>
                            <div className="font-mono text-sm text-slate-200">{coords.z.toFixed(1)} km</div>
                        </div>
                    </div>
                );
            })()}
            <div className="text-[8px] text-slate-600 mt-2 text-center">
                {coordSystem === 'ECI' && 'Earth-Centered Inertial (J2000)'}
                {coordSystem === 'ECF' && 'Earth-Centered Earth-Fixed (WGS-84)'}
                {coordSystem === 'Geodetic' && 'Geographic Coordinates (WGS-84)'}
            </div>
        </>
    );
});

const SignalStrengthDisplay = memo(({ telemetry }: { telemetry: TelemetryData | null | undefined }) => {
    const strength = useMemo(() => {
        if (!telemetry) return 0;
        return Math.round(Math.min(100, Math.max(20, 100 - (telemetry.alt / 400))));
    }, [telemetry]);

    return (
        <div className="bg-black/40 p-4 rounded-lg border border-white/5">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Reception Quality</span>
                <span className="text-sm font-bold text-cyan-400">{strength}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${strength}%` }}
                    transition={{ type: "spring", damping: 20, stiffness: 100 }}
                    className={`h-full rounded-full ${strength > 70 ? 'bg-emerald-500' : strength > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                />
            </div>
        </div>
    );
});

const VisibilityStatus = memo(({ telemetry }: { telemetry: TelemetryData | null | undefined }) => {
    const isIlluminated = useMemo(() => {
        if (!telemetry) return true;
        const now = new Date();
        const sunPos = calculateSunPosition(now);
        const satPos = geodeticToEcf({ latitude: telemetry.lat, longitude: telemetry.lon, altitude: telemetry.alt });
        const r_sun = Math.sqrt(sunPos.x ** 2 + sunPos.y ** 2 + sunPos.z ** 2);
        const r_sat = Math.sqrt(satPos.x ** 2 + satPos.y ** 2 + satPos.z ** 2);
        const dot = (sunPos.x * satPos.x + sunPos.y * satPos.y + sunPos.z * satPos.z) / (r_sun * r_sat);
        const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
        const R_EARTH = 6371;
        if (angle > Math.PI / 2) {
            const dist_to_axis = r_sat * Math.sin(angle);
            if (dist_to_axis < R_EARTH) return false;
        }
        return true;
    }, [telemetry]);

    return (
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-colors ${isIlluminated
            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
            }`}>
            {isIlluminated ? <Zap size={10} fill="currentColor" /> : <Clock size={10} />}
            <span className="tracking-tighter">{isIlluminated ? 'SUNLIGHT' : 'ECLIPSE'}</span>
        </div>
    );
});

const OrbitalElementsDisplay = memo(({ telemetry, object }: { telemetry: TelemetryData | null | undefined, object: SpaceObject }) => {
    const orbitalPeriod = useMemo(() => {
        return telemetry ? (2 * Math.PI * Math.sqrt(Math.pow((6371 + telemetry.alt), 3) / 398600)) / 60 : 0;
    }, [telemetry]);

    // Robust TLE Parsing for real orbital elements
    const elements = useMemo(() => {
        if (object.type !== 'TLE' || !object.tle) return null;
        try {
            const { line1, line2 } = object.tle;
            // Line 1: TLE epoch calculation
            const epochYear = parseInt(line1.substring(18, 20));
            const fullYear = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear;
            const epochDay = parseFloat(line1.substring(20, 32));

            // Line 2: Orbital elements
            return {
                inclination: parseFloat(line2.substring(8, 16)),
                raan: parseFloat(line2.substring(17, 25)),
                eccentricity: parseFloat(`0.${line2.substring(26, 33)}`),
                argPerigee: parseFloat(line2.substring(34, 42)),
                epoch: `${fullYear} Day ${epochDay.toFixed(3)}`
            };
        } catch (e) {
            return null;
        }
    }, [object]);

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-xs text-slate-400">Orbital Period</span>
                <span className="font-mono text-cyan-300 font-bold">{orbitalPeriod.toFixed(2)} min</span>
            </div>
            {elements ? (
                <>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                        <span className="text-xs text-slate-400">Inclination</span>
                        <span className="font-mono text-cyan-300 font-bold">{elements.inclination.toFixed(4)}°</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                        <span className="text-xs text-slate-400">Eccentricity</span>
                        <span className="font-mono text-cyan-300 font-bold">{elements.eccentricity.toFixed(7)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                        <span className="text-xs text-slate-400">RAAN</span>
                        <span className="font-mono text-cyan-300 font-bold">{elements.raan.toFixed(4)}°</span>
                    </div>
                    <div className="mt-4 p-3 bg-black/40 rounded-lg border border-white/5">
                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Epoch (TLE Age)</div>
                        <div className="text-xs text-slate-300 font-mono">{elements.epoch}</div>
                    </div>
                </>
            ) : (
                <div className="p-4 text-center text-slate-600 text-xs italic">
                    Orbital elements not available for this object type.
                </div>
            )}
        </div>
    );
});

const InfoPanel: React.FC<InfoPanelProps> = ({
    object,
    onClose,
    telemetry,
    onMountCamera,
    isCameraMounted,
    isFavorite = false,
    onToggleFavorite,
    isAnalystMode = false,
    onOpenScientific
}) => {
    const [activeTab, setActiveTab] = useState<'telemetry' | 'orbital'>('telemetry');
    const [isMobile, setIsMobile] = useState(false);
    const t = useTranslations();

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!object) return null;

    // Detect satellite type for color coding
    const satType = useMemo(() => {
        const name = object.name.toUpperCase();
        if (name.includes('STARLINK')) return { label: 'Starlink', color: 'blue', icon: Rocket };
        if (name.includes('ISS') || name.includes('ZARYA') || name.includes('TIANHE')) return { label: 'Station', color: 'purple', icon: Radio };
        if (name.includes('GPS') || name.includes('NAVSTAR') || name.includes('GLONASS') || name.includes('GALILEO') || name.includes('BEIDOU')) return { label: 'GNSS', color: 'green', icon: Navigation };
        if (name.includes('DEBRIS') || name.includes('ROCKET BODY')) return { label: 'Debris', color: 'red', icon: ShieldAlert };
        if (name.includes('JWST')) return { label: 'Deep Space', color: 'amber', icon: Orbit };
        return { label: 'Satellite', color: 'cyan', icon: Satellite };
    }, [object.name]);

    const handleShare = async () => {
        const shareData = {
            title: `${object.name} - OrbitView`,
            text: `Tracking ${object.name} (ID: ${object.id}) on OrbitView Satellite Tracker`,
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch {
                // Share cancelled
            }
        } else {
            navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        }
    };

    // Export TLE data
    const handleExportTLE = () => {
        if (object.type !== 'TLE' || !object.tle) return;
        const tleData = `${object.name}\n${object.tle.line1}\n${object.tle.line2}`;
        downloadFile(tleData, `${object.name.replace(/\s/g, '_')}.tle`, 'text/plain');
    };

    // Export telemetry as CSV
    const handleExportCSV = () => {
        const now = new Date().toISOString();
        let csv = 'Timestamp,Name,NORAD_ID,Latitude,Longitude,Altitude_km,Velocity_km_s\n';
        csv += `${now},${object.name},${object.id},${telemetry?.lat.toFixed(6) || 'N/A'},${telemetry?.lon.toFixed(6) || 'N/A'},${telemetry?.alt.toFixed(3) || 'N/A'},${telemetry?.velocity.toFixed(4) || 'N/A'}\n`;
        downloadFile(csv, `${object.name.replace(/\s/g, '_')}_telemetry.csv`, 'text/csv');
    };

    // Helper to download file
    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const renderPanelContent = () => (
        <>
            <div className={`p-4 border-b border-white/10 bg-gradient-to-r from-${satType.color}-950/30 to-transparent flex justify-between items-start ${isMobile ? 'pt-2' : ''}`}>
                {isMobile && (
                    <div className="absolute top-0 left-0 right-0 flex justify-center py-2">
                        <div className="w-10 h-1 bg-white/20 rounded-full" />
                    </div>
                )}
                <div className="flex items-start gap-3 flex-1">
                    {/* Animated Satellite Icon */}
                    <div className="relative">
                        <div className={`p-3 bg-${satType.color}-500/10 rounded-xl border border-${satType.color}-500/30 text-${satType.color}-400`}>
                            <satType.icon size={24} />
                        </div>
                        {/* Orbit Ring */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className={`absolute -inset-1 border border-dashed border-${satType.color}-500/30 rounded-full pointer-events-none`}
                        />
                        {/* Orbiting Dot */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-2 pointer-events-none"
                        >
                            <div className={`w-1.5 h-1.5 rounded-full bg-${satType.color}-400 absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_8px_rgba(6,182,212,0.8)]`} />
                        </motion.div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded bg-${satType.color}-500/10 text-${satType.color}-400 border border-${satType.color}-500/20 font-bold tracking-wider`}>
                                {satType.label}
                            </span>
                            <VisibilityStatus telemetry={telemetry} />
                        </div>
                        <h2 className="font-bold text-base text-white leading-tight pr-2 truncate">{object.name}</h2>
                        <div className="flex items-center gap-2 mt-1 px-1 py-0.5 bg-black/20 rounded-md w-fit">
                            <span className="text-[9px] font-mono text-slate-500 tracking-wider">NORAD {object.id}</span>
                            <span className="text-[9px] text-cyan-500 font-bold flex items-center gap-1 animate-pulse tracking-tighter">
                                <Activity size={10} /> {telemetry ? 'ACTIVE' : 'IDLE'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {onToggleFavorite && (
                        <button
                            onClick={onToggleFavorite}
                            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            aria-pressed={isFavorite}
                            className={`p-2 rounded-lg transition-colors ${isFavorite ? 'text-yellow-400 bg-yellow-500/10' : 'text-slate-500 hover:text-yellow-400 hover:bg-white/5'}`}
                        >
                            <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                        </button>
                    )}
                    <button
                        onClick={handleShare}
                        aria-label="Share satellite information"
                        className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
                    >
                        <Share2 size={16} />
                    </button>
                    <button
                        onClick={onClose}
                        aria-label="Close info panel"
                        className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-white/10 rounded-lg"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex border-b border-white/5 bg-white/5" role="toolbar" aria-label="Satellite actions">
                <button
                    onClick={onMountCamera}
                    aria-label={isCameraMounted ? 'Unmount camera from satellite' : 'Mount camera to satellite'}
                    aria-pressed={isCameraMounted}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors ${isCameraMounted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'hover:bg-white/10 text-cyan-400'}`}
                >
                    <Camera size={16} />
                    {isCameraMounted ? t('infoPanel.unmount') : t('infoPanel.mountCamera')}
                </button>
                {isAnalystMode && onOpenScientific && (
                    <button
                        onClick={onOpenScientific}
                        aria-label="Open scientific analysis dashboard"
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors hover:bg-purple-500/10 text-purple-400 border-l border-white/5"
                    >
                        <FlaskConical size={16} />
                        {t('infoPanel.analyze')}
                    </button>
                )}
            </div>

            <div className="flex border-b border-white/5" role="tablist" aria-label="Satellite data tabs">
                <button
                    onClick={() => setActiveTab('telemetry')}
                    role="tab"
                    aria-selected={activeTab === 'telemetry'}
                    aria-controls="telemetry-panel"
                    className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'telemetry' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    {t('infoPanel.telemetry')}
                </button>
                <button
                    onClick={() => setActiveTab('orbital')}
                    role="tab"
                    aria-selected={activeTab === 'orbital'}
                    aria-controls="orbital-panel"
                    className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'orbital' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    {t('infoPanel.orbitalData')}
                </button>
            </div>

            <div className={`p-4 space-y-4 overflow-y-auto custom-scrollbar ${isMobile ? 'max-h-[50vh]' : 'max-h-[calc(100vh-340px)]'}`}>
                {activeTab === 'telemetry' ? (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <div className="text-[10px] text-slate-500 mb-1 font-bold tracking-wider">ID</div>
                                <div className="font-mono text-lg text-cyan-300 tracking-widest truncate">{object.id}</div>
                            </div>
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <div className="text-[10px] text-slate-500 mb-1 font-bold tracking-wider">TYPE</div>
                                <div className="font-mono text-sm text-slate-300">{object.category || 'LEO'}</div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-wider flex items-center gap-2">
                                <Radio size={12} /> Signal Strength
                            </h3>
                            <SignalStrengthDisplay telemetry={telemetry} />
                        </div>

                        <div>
                            <TelemetryDisplay telemetry={telemetry} />
                        </div>

                        <div className="bg-emerald-900/10 border border-emerald-500/20 p-3 rounded-lg">
                            <div className="flex justify-between mb-2 text-[10px] font-bold text-emerald-500">
                                <span className="flex items-center gap-1"><ShieldAlert size={10} /> SIGNAL INTEGRITY</span>
                                <span>OPTIMAL</span>
                            </div>
                            <div className="flex gap-1 h-1">
                                {[...Array(20)].map((_, i) => (
                                    <div key={i} className={`flex-1 rounded-full ${i < 18 ? 'bg-emerald-500/50' : 'bg-emerald-900/30'}`}></div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : activeTab === 'orbital' ? (
                    <>
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-wider flex items-center gap-2">
                                <Orbit size={12} /> Orbital Elements
                            </h3>
                            <OrbitalElementsDisplay telemetry={telemetry} object={object} />
                        </div>

                        <div className="bg-purple-900/10 border border-purple-500/20 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={14} className="text-purple-400" />
                                <span className="text-xs font-bold text-purple-400">NEXT PASS</span>
                            </div>
                            <div className="font-mono text-sm text-white">
                                {new Date(Date.now() + 3600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} UTC
                            </div>
                            <div className="text-[10px] text-purple-300 mt-1">Duration: ~8 minutes • Max Elevation: 45°</div>
                        </div>

                        {/* Export Section */}
                        <div className="pt-2">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider flex items-center gap-2">
                                <Download size={12} /> Export Data
                            </h3>
                            <div className="flex gap-2">
                                {object.type === 'TLE' && object.tle && (
                                    <button
                                        onClick={handleExportTLE}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-colors"
                                    >
                                        <FileText size={14} />
                                        TLE
                                    </button>
                                )}
                                <button
                                    onClick={handleExportCSV}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors"
                                >
                                    <Download size={14} />
                                    CSV
                                </button>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </>
    );

    if (isMobile) {
        return (
            <AnimatePresence>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 text-slate-100 z-50 rounded-t-3xl max-h-[85vh] flex flex-col"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {renderPanelContent()}
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-24 right-6 w-96 max-h-[calc(100vh-120px)] bg-slate-950/90 backdrop-blur-xl border border-white/10 text-slate-100 z-20 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col"
            >
                {renderPanelContent()}
            </motion.div>
        </AnimatePresence>
    );
};

export default memo(InfoPanel);
