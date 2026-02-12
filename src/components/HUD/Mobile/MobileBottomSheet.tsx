"use client";

import React, { memo, useState, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Satellite, Navigation, ChevronUp, MapPin, Gauge } from "lucide-react";
import { clsx } from "clsx";
import { SpaceObject } from "@/lib/space-objects";
import { TelemetryData } from "@/components/HUD/InfoPanel";
import { useHaptic } from "@/hooks/useHaptic";

/**
 * MobileBottomSheet - Draggable satellite info panel for mobile
 * Appears when a satellite is selected with peek/expanded states
 */

type SheetState = 'hidden' | 'peek' | 'expanded';

interface MobileBottomSheetProps {
    satellite: SpaceObject | null;
    telemetry?: TelemetryData | null;
    onClose: () => void;
    onTrack?: () => void;
    forceExpanded?: boolean;
}

const TAB_BAR_HEIGHT = 64; // Height of the bottom tab bar

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
    satellite,
    telemetry,
    onClose,
    onTrack,
    forceExpanded = false,
}) => {
    const [sheetState, setSheetState] = useState<SheetState>('peek');
    const { trigger } = useHaptic();

    // Handle drag end to determine sheet state
    const handleDragEnd = useCallback((_: any, info: PanInfo) => {
        const velocity = info.velocity.y;
        const offset = info.offset.y;

        if (velocity > 500 || offset > 100) {
            // Swiped down
            trigger('light');
            if (sheetState === 'expanded') {
                setSheetState('peek');
            } else {
                onClose();
            }
        } else if (velocity < -500 || offset < -100) {
            // Swiped up
            if (sheetState === 'peek') {
                setSheetState('expanded');
            }
        }
    }, [sheetState, onClose, trigger]);

    // Reset state when satellite changes
    React.useEffect(() => {
        if (satellite) {
            setSheetState('peek');
        }
    }, [satellite]);

    // Handle forceExpanded prop (for Data tab)
    React.useEffect(() => {
        if (forceExpanded && satellite) {
            setSheetState('expanded');
        }
    }, [forceExpanded, satellite]);

    // Calculate sheet height based on state
    const getSheetHeight = () => {
        switch (sheetState) {
            case 'peek': return '180px';
            case 'expanded': return '70vh';
            default: return '0px';
        }
    };

    if (!satellite) return null;

    // Determine satellite category for styling
    const isStarlink = satellite.name.toUpperCase().includes('STARLINK');
    const isISS = satellite.name.toUpperCase().includes('ISS') || satellite.name.toUpperCase().includes('ZARYA');

    const accentColor = isStarlink ? 'blue' : isISS ? 'violet' : 'cyan';
    const accentClasses = {
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        violet: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
        cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    };

    return (
        <AnimatePresence>
            <motion.div
                key={satellite.id}
                initial={{ y: '100%' }}
                animate={{ y: 0, height: getSheetHeight() }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                className="mobile-bottom-sheet"
                style={{ bottom: `${TAB_BAR_HEIGHT}px` }}
            >
                {/* Drag Handle */}
                <div
                    className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-start justify-between px-4 pb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Satellite Icon */}
                        <div className={clsx(
                            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border",
                            accentClasses[accentColor]
                        )}>
                            <Satellite size={24} strokeWidth={1.5} />
                        </div>

                        {/* Satellite Info */}
                        <div className="min-w-0 flex-1">
                            <h2 className="text-white font-semibold text-lg truncate leading-tight">
                                {satellite.name}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500 font-mono">
                                    #{satellite.id}
                                </span>
                                {satellite.category && (
                                    <span className={clsx(
                                        "text-[10px] px-1.5 py-0.5 rounded border",
                                        accentClasses[accentColor]
                                    )}>
                                        {satellite.category}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors tap-target"
                        aria-label="Close satellite info"
                    >
                        <X size={20} strokeWidth={1.5} />
                    </button>
                </div>

                {/* Quick Stats - Always visible in peek mode */}
                <div className="px-4 pb-4">
                    <div className="grid grid-cols-3 gap-2">
                        {/* Altitude */}
                        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <div className="flex items-center gap-1 text-gray-500 mb-1">
                                <ChevronUp size={12} />
                                <span className="text-[10px] uppercase tracking-wide">Alt</span>
                            </div>
                            <div className="text-white font-mono text-sm">
                                {telemetry ? `${telemetry.alt.toFixed(0)} km` : '---'}
                            </div>
                        </div>

                        {/* Velocity */}
                        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <div className="flex items-center gap-1 text-gray-500 mb-1">
                                <Gauge size={12} />
                                <span className="text-[10px] uppercase tracking-wide">Vel</span>
                            </div>
                            <div className="text-white font-mono text-sm">
                                {telemetry ? `${telemetry.velocity.toFixed(1)} km/s` : '---'}
                            </div>
                        </div>

                        {/* Position */}
                        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <div className="flex items-center gap-1 text-gray-500 mb-1">
                                <MapPin size={12} />
                                <span className="text-[10px] uppercase tracking-wide">Pos</span>
                            </div>
                            <div className="text-white font-mono text-[11px]">
                                {telemetry
                                    ? `${telemetry.lat.toFixed(1)}°, ${telemetry.lon.toFixed(1)}°`
                                    : '---'
                                }
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                    {sheetState === 'expanded' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 px-4 pb-4 overflow-y-auto"
                        >
                            {/* Track Button */}
                            <button
                                onClick={onTrack}
                                className={clsx(
                                    "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all active:scale-[0.98]",
                                    "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                )}
                            >
                                <Navigation size={18} strokeWidth={2} />
                                Track Satellite
                            </button>

                            {/* Additional details can be added here */}
                            <div className="mt-4 text-center text-gray-500 text-sm">
                                <p>Swipe up for more details</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Expand hint in peek mode */}
                {sheetState === 'peek' && (
                    <div className="flex justify-center pb-2">
                        <button
                            onClick={() => setSheetState('expanded')}
                            className="flex items-center gap-1 text-gray-500 text-xs"
                        >
                            <ChevronUp size={14} />
                            <span>Swipe up for details</span>
                        </button>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default memo(MobileBottomSheet);
