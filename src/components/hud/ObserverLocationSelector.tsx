"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, X, Check, Loader2, Globe2 } from "lucide-react";
import { ObserverPosition } from "@/lib/DopplerCalculator";
import { useTranslations } from "@/hooks/useLocale";

interface ObserverLocationSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    currentPosition: ObserverPosition;
    onPositionChange: (position: ObserverPosition) => void;
}

// Common cities with coordinates
const PRESET_LOCATIONS = [
    { name: "Istanbul, Turkey", lat: 41.0082, lon: 28.9784 },
    { name: "New York, USA", lat: 40.7128, lon: -74.0060 },
    { name: "London, UK", lat: 51.5074, lon: -0.1278 },
    { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503 },
    { name: "Sydney, Australia", lat: -33.8688, lon: 151.2093 },
    { name: "São Paulo, Brazil", lat: -23.5505, lon: -46.6333 },
    { name: "Dubai, UAE", lat: 25.2048, lon: 55.2708 },
    { name: "Singapore", lat: 1.3521, lon: 103.8198 },
];

const ObserverLocationSelector: React.FC<ObserverLocationSelectorProps> = ({
    isOpen,
    onClose,
    currentPosition,
    onPositionChange
}) => {
    const [latitude, setLatitude] = useState(currentPosition.latitude.toString());
    const [longitude, setLongitude] = useState(currentPosition.longitude.toString());
    const [altitude, setAltitude] = useState(currentPosition.altitude.toString());
    const [isLocating, setIsLocating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const t = useTranslations();

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        setLatitude(currentPosition.latitude.toString());
        setLongitude(currentPosition.longitude.toString());
        setAltitude(currentPosition.altitude.toString());
    }, [currentPosition]);

    const handleGetLocation = async () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            return;
        }

        setIsLocating(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude.toFixed(6));
                setLongitude(position.coords.longitude.toFixed(6));
                setAltitude((position.coords.altitude || 0).toFixed(0));
                setIsLocating(false);
            },
            (err) => {
                setError(`Unable to get location: ${err.message}`);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handlePresetSelect = (preset: typeof PRESET_LOCATIONS[0]) => {
        setLatitude(preset.lat.toString());
        setLongitude(preset.lon.toString());
        setAltitude("0");
    };

    const handleSave = () => {
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        const alt = parseFloat(altitude) || 0;

        if (isNaN(lat) || lat < -90 || lat > 90) {
            setError("Latitude must be between -90 and 90");
            return;
        }
        if (isNaN(lon) || lon < -180 || lon > 180) {
            setError("Longitude must be between -180 and 180");
            return;
        }

        onPositionChange({
            latitude: lat,
            longitude: lon,
            altitude: alt
        });
        onClose();
    };

    if (!isOpen) return null;

    const content = (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-emerald-950/30 to-transparent flex justify-between items-center">
                {isMobile && (
                    <div className="absolute top-0 left-0 right-0 flex justify-center py-2">
                        <div className="w-10 h-1 bg-white/20 rounded-full" />
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                        <MapPin size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-white">Observer Location</h2>
                        <p className="text-[10px] text-slate-400">Set your ground station position</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-white/10 rounded-lg">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {/* Auto-detect button */}
                <button
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                    {isLocating ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Navigation size={18} />
                    )}
                    {isLocating ? "Detecting..." : "Use My Location"}
                </button>

                {/* Error message */}
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                        {error}
                    </div>
                )}

                {/* Preset locations */}
                <div>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider flex items-center gap-2">
                        <Globe2 size={12} /> Quick Select
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {PRESET_LOCATIONS.map((preset) => (
                            <button
                                key={preset.name}
                                onClick={() => handlePresetSelect(preset)}
                                className="p-2 text-left bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors"
                            >
                                <div className="text-xs text-white truncate">{preset.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                    {preset.lat.toFixed(2)}°, {preset.lon.toFixed(2)}°
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Manual coordinates */}
                <div>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">
                        Manual Coordinates
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Latitude (°)</label>
                            <input
                                type="number"
                                value={latitude}
                                onChange={(e) => setLatitude(e.target.value)}
                                step="0.0001"
                                min="-90"
                                max="90"
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50"
                                placeholder="-90 to 90"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Longitude (°)</label>
                            <input
                                type="number"
                                value={longitude}
                                onChange={(e) => setLongitude(e.target.value)}
                                step="0.0001"
                                min="-180"
                                max="180"
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50"
                                placeholder="-180 to 180"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Altitude (m)</label>
                            <input
                                type="number"
                                value={altitude}
                                onChange={(e) => setAltitude(e.target.value)}
                                step="1"
                                min="0"
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer with save button */}
            <div className="p-4 border-t border-white/10 bg-black/20">
                <button
                    onClick={handleSave}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-lg transition-colors"
                >
                    <Check size={18} />
                    Save Location
                </button>
            </div>
        </div>
    );

    // Mobile: Bottom sheet
    if (isMobile) {
        return (
            <AnimatePresence>
                <motion.div
                    key="observer-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    onClick={onClose}
                />
                <motion.div
                    key="observer-sheet"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 z-50 rounded-t-3xl max-h-[85vh] flex flex-col"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {content}
                </motion.div>
            </AnimatePresence>
        );
    }

    // Desktop: Modal
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-md bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] max-h-[80vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {content}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ObserverLocationSelector;
