"use client";

import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Satellite, Radio, TrendingDown, Compass,
    Clock, AlertCircle, ChevronRight, FlaskConical
} from "lucide-react";
import { clsx } from "clsx";
import { SpaceObject } from "@/lib/space-objects";

/**
 * MobileScienceMenu - Science tools menu for mobile
 * Shows available scientific calculation tools in a grid layout
 */

export type ScienceTool = 'pass' | 'skyplot' | 'decay' | 'doppler' | null;

interface MobileScienceMenuProps {
    isOpen: boolean;
    onClose: () => void;
    satellite: SpaceObject | null;
    onSelectTool: (tool: ScienceTool) => void;
    onOpenSearch: () => void;
}

interface ToolCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
    color: 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald';
    onClick: () => void;
    disabled?: boolean;
}

const colorClasses = {
    cyan: {
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        text: 'text-cyan-400',
        glow: 'shadow-cyan-500/20',
    },
    violet: {
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/30',
        text: 'text-violet-400',
        glow: 'shadow-violet-500/20',
    },
    amber: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        glow: 'shadow-amber-500/20',
    },
    rose: {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        glow: 'shadow-rose-500/20',
    },
    emerald: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        glow: 'shadow-emerald-500/20',
    },
};

const ToolCard: React.FC<ToolCardProps> = ({
    icon: Icon,
    title,
    description,
    color,
    onClick,
    disabled = false,
}) => {
    const colors = colorClasses[color];

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                "w-full p-4 rounded-2xl border transition-all duration-200 text-left",
                "active:scale-[0.98]",
                colors.bg,
                colors.border,
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <div className="flex items-start gap-3">
                <div className={clsx(
                    "w-12 h-12 rounded-xl flex items-center justify-center border",
                    colors.bg,
                    colors.border
                )}>
                    <Icon size={24} className={colors.text} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-base mb-0.5">
                        {title}
                    </h3>
                    <p className="text-gray-500 text-xs leading-relaxed">
                        {description}
                    </p>
                </div>
                <ChevronRight size={20} className="text-gray-600 flex-shrink-0 mt-2" />
            </div>
        </button>
    );
};

const MobileScienceMenu: React.FC<MobileScienceMenuProps> = ({
    isOpen,
    onClose,
    satellite,
    onSelectTool,
    onOpenSearch,
}) => {
    const tools = [
        {
            id: 'pass' as ScienceTool,
            icon: Clock,
            title: 'Pass Prediction',
            description: 'Calculate when satellite will pass over your location',
            color: 'cyan' as const,
        },
        {
            id: 'skyplot' as ScienceTool,
            icon: Compass,
            title: 'Skyplot View',
            description: 'Visualize satellite position in the sky',
            color: 'violet' as const,
        },
        {
            id: 'decay' as ScienceTool,
            icon: TrendingDown,
            title: 'Orbital Decay',
            description: 'Analyze orbital decay and re-entry prediction',
            color: 'amber' as const,
        },
        {
            id: 'doppler' as ScienceTool,
            icon: Radio,
            title: 'Doppler Shift',
            description: 'Calculate radio frequency shifts for tracking',
            color: 'rose' as const,
        },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-safe overflow-y-auto"
                    style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/5">
                        <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                    <FlaskConical size={20} className="text-violet-400" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h1 className="text-white font-semibold text-lg">Science Tools</h1>
                                    <p className="text-gray-500 text-xs">Orbital Analysis</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-white transition-colors tap-target"
                                aria-label="Close science menu"
                            >
                                <X size={24} strokeWidth={1.5} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 py-4">
                        {!satellite ? (
                            /* No Satellite Selected */
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                                    <AlertCircle size={40} className="text-amber-400" strokeWidth={1} />
                                </div>
                                <h2 className="text-white text-lg font-medium mb-2">
                                    No Satellite Selected
                                </h2>
                                <p className="text-gray-500 text-sm max-w-[280px] mb-6">
                                    Please select a satellite first to use the science tools
                                </p>
                                <button
                                    onClick={onOpenSearch}
                                    className="flex items-center gap-2 px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 font-medium transition-all active:scale-[0.98]"
                                >
                                    <Satellite size={18} />
                                    Search Satellites
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Selected Satellite Info */}
                                <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                            <Satellite size={20} className="text-cyan-400" strokeWidth={1.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">
                                                {satellite.name}
                                            </p>
                                            <p className="text-gray-500 text-xs font-mono">
                                                #{satellite.id} • {satellite.category || 'Satellite'}
                                            </p>
                                        </div>
                                        <span className="flex items-center gap-1 text-emerald-400 text-xs">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            ACTIVE
                                        </span>
                                    </div>
                                </div>

                                {/* Tools Grid */}
                                <div className="space-y-3">
                                    <h2 className="text-gray-400 text-xs uppercase tracking-wider font-medium px-1">
                                        Available Tools
                                    </h2>
                                    <div className="space-y-3">
                                        {tools.map((tool) => (
                                            <ToolCard
                                                key={tool.id}
                                                icon={tool.icon}
                                                title={tool.title}
                                                description={tool.description}
                                                color={tool.color}
                                                onClick={() => onSelectTool(tool.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default memo(MobileScienceMenu);
