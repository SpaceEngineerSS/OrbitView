"use client";

import React, { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin, Navigation, Loader2, Check,
    X, Globe, AlertCircle
} from "lucide-react";
import { clsx } from "clsx";
import { useHaptic } from "@/hooks/useHaptic";

/**
 * MobileLocationSelector - Observer location picker for mobile
 * Supports GPS auto-detection and manual entry
 */

interface ObserverPosition {
    latitude: number;
    longitude: number;
    altitude: number;
}

interface MobileLocationSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    currentPosition: ObserverPosition;
    onPositionChange: (position: ObserverPosition) => void;
}

const MobileLocationSelector: React.FC<MobileLocationSelectorProps> = ({
    isOpen,
    onClose,
    currentPosition,
    onPositionChange,
}) => {
    const [isGettingGPS, setIsGettingGPS] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [manualLat, setManualLat] = useState(currentPosition.latitude.toString());
    const [manualLon, setManualLon] = useState(currentPosition.longitude.toString());
    const [manualAlt, setManualAlt] = useState(currentPosition.altitude.toString());
    const { trigger } = useHaptic();

    // Get GPS location
    const handleGetGPS = useCallback(() => {
        if (!navigator.geolocation) {
            setGpsError('GPS not supported on this device');
            return;
        }

        setIsGettingGPS(true);
        setGpsError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newPos = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    altitude: position.coords.altitude || 0,
                };
                onPositionChange(newPos);
                setManualLat(newPos.latitude.toString());
                setManualLon(newPos.longitude.toString());
                setManualAlt(newPos.altitude.toString());
                setIsGettingGPS(false);
                trigger('success'); // Haptic success pattern
            },
            (error) => {
                setIsGettingGPS(false);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setGpsError('Location permission denied');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setGpsError('Location unavailable');
                        break;
                    case error.TIMEOUT:
                        setGpsError('Location request timeout');
                        break;
                    default:
                        setGpsError('Failed to get location');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, [onPositionChange]);

    // Apply manual coordinates
    const handleApplyManual = useCallback(() => {
        const lat = parseFloat(manualLat);
        const lon = parseFloat(manualLon);
        const alt = parseFloat(manualAlt) || 0;

        if (isNaN(lat) || isNaN(lon)) {
            setGpsError('Invalid coordinates');
            return;
        }

        if (lat < -90 || lat > 90) {
            setGpsError('Latitude must be between -90 and 90');
            return;
        }

        if (lon < -180 || lon > 180) {
            setGpsError('Longitude must be between -180 and 180');
            return;
        }

        onPositionChange({ latitude: lat, longitude: lon, altitude: alt });
        setGpsError(null);
        onClose();
    }, [manualLat, manualLon, manualAlt, onPositionChange, onClose]);

    // Preset locations
    const presets = [
        { name: 'Istanbul', lat: 41.0082, lon: 28.9784 },
        { name: 'New York', lat: 40.7128, lon: -74.0060 },
        { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
        { name: 'London', lat: 51.5074, lon: -0.1278 },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl pt-safe overflow-y-auto"
                    style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/5">
                        <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <MapPin size={20} className="text-emerald-400" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h1 className="text-white font-semibold text-lg">Observer Location</h1>
                                    <p className="text-gray-500 text-xs">For pass predictions</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-white transition-colors tap-target"
                                aria-label="Close"
                            >
                                <X size={24} strokeWidth={1.5} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 py-4 space-y-6">
                        {/* Current Location */}
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <Globe size={16} className="text-cyan-400" />
                                <span className="text-gray-400 text-xs uppercase tracking-wider">Current Position</span>
                            </div>
                            <p className="text-white font-mono text-lg">
                                {currentPosition.latitude.toFixed(4)}°, {currentPosition.longitude.toFixed(4)}°
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                                Altitude: {currentPosition.altitude.toFixed(0)}m
                            </p>
                        </div>

                        {/* GPS Button */}
                        <div>
                            <button
                                onClick={handleGetGPS}
                                disabled={isGettingGPS}
                                className={clsx(
                                    "w-full flex items-center justify-center gap-3 py-4 rounded-xl font-medium transition-all",
                                    "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                                    "active:scale-[0.98]",
                                    isGettingGPS && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isGettingGPS ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Getting GPS...
                                    </>
                                ) : (
                                    <>
                                        <Navigation size={20} />
                                        Use My Location (GPS)
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Error Message */}
                        {gpsError && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
                                <AlertCircle size={16} className="text-rose-400" />
                                <p className="text-rose-400 text-sm">{gpsError}</p>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-white/10" />
                            <span className="text-gray-500 text-xs">OR</span>
                            <div className="flex-1 h-px bg-white/10" />
                        </div>

                        {/* Quick Presets */}
                        <div>
                            <h2 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-2 px-1">
                                Quick Locations
                            </h2>
                            <div className="grid grid-cols-2 gap-2">
                                {presets.map((preset) => (
                                    <button
                                        key={preset.name}
                                        onClick={() => {
                                            trigger('medium');
                                            onPositionChange({ latitude: preset.lat, longitude: preset.lon, altitude: 0 });
                                            setManualLat(preset.lat.toString());
                                            setManualLon(preset.lon.toString());
                                            onClose();
                                        }}
                                        className="p-3 bg-white/5 rounded-xl border border-white/5 text-left transition-all active:scale-[0.98] hover:bg-white/10"
                                    >
                                        <p className="text-white font-medium text-sm">{preset.name}</p>
                                        <p className="text-gray-500 text-xs">{preset.lat.toFixed(2)}°, {preset.lon.toFixed(2)}°</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Manual Entry */}
                        <div>
                            <h2 className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-2 px-1">
                                Manual Coordinates
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-gray-500 text-xs mb-1 block">Latitude (-90 to 90)</label>
                                    <input
                                        type="number"
                                        value={manualLat}
                                        onChange={(e) => setManualLat(e.target.value)}
                                        placeholder="41.0082"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
                                        inputMode="decimal"
                                        step="any"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-xs mb-1 block">Longitude (-180 to 180)</label>
                                    <input
                                        type="number"
                                        value={manualLon}
                                        onChange={(e) => setManualLon(e.target.value)}
                                        placeholder="28.9784"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
                                        inputMode="decimal"
                                        step="any"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-xs mb-1 block">Altitude (meters)</label>
                                    <input
                                        type="number"
                                        value={manualAlt}
                                        onChange={(e) => setManualAlt(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50"
                                        inputMode="numeric"
                                    />
                                </div>
                                <button
                                    onClick={handleApplyManual}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl font-medium transition-all active:scale-[0.98]"
                                >
                                    <Check size={18} />
                                    Apply Coordinates
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default memo(MobileLocationSelector);
