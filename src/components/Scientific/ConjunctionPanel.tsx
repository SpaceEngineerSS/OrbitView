"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Satellite, Rocket, CircleX, HelpCircle, Clock, Zap, ChevronRight, RefreshCw, Target } from "lucide-react";
import { clsx } from "clsx";
import {
    ConjunctionEvent,
    generateSampleConjunctions,
    formatTimeToTCA,
    getRiskColor
} from "@/lib/ConjunctionAnalysis";

interface ConjunctionPanelProps {
    onSelectObject?: (noradId: string) => void;
}

const ConjunctionPanel: React.FC<ConjunctionPanelProps> = ({ onSelectObject }) => {
    const [events, setEvents] = useState<ConjunctionEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<ConjunctionEvent | null>(null);
    const [filter, setFilter] = useState<'all' | 'critical' | 'high'>('all');

    // Load conjunction data
    useEffect(() => {
        setLoading(true);
        // Using sample data since SOCRATES requires auth
        // In production, this would fetch from API
        setTimeout(() => {
            setEvents(generateSampleConjunctions());
            setLoading(false);
        }, 500);
    }, []);

    // Filter events
    const filteredEvents = useMemo(() => {
        if (filter === 'all') return events;
        if (filter === 'critical') return events.filter(e => e.riskLevel === 'critical');
        if (filter === 'high') return events.filter(e => e.riskLevel === 'critical' || e.riskLevel === 'high');
        return events;
    }, [events, filter]);

    // Get icon for object type
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'payload': return <Satellite size={14} />;
            case 'debris': return <CircleX size={14} />;
            case 'rocket_body': return <Rocket size={14} />;
            default: return <HelpCircle size={14} />;
        }
    };

    const riskStyles = {
        critical: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]' },
        high: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-400', glow: '' },
        medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400', glow: '' },
        low: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', glow: '' }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-950/80 backdrop-blur-xl border border-red-500/20 rounded-xl overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                        <AlertTriangle size={16} className="text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Conjunction Analysis</h3>
                        <span className="text-[10px] text-red-400 font-mono">SPACE DEBRIS RISK MONITOR</span>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setLoading(true);
                        setTimeout(() => {
                            setEvents(generateSampleConjunctions());
                            setLoading(false);
                        }, 500);
                    }}
                    className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-white/5">
                {(['all', 'high', 'critical'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={clsx(
                            "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all",
                            filter === f
                                ? "text-red-400 border-b-2 border-red-400 bg-red-500/5"
                                : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        {f === 'all' ? 'All Events' : f === 'high' ? 'High Risk' : 'Critical'}
                    </button>
                ))}
            </div>

            {/* Events List */}
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="p-8 flex flex-col items-center justify-center">
                        <RefreshCw size={24} className="text-red-400 animate-spin mb-2" />
                        <span className="text-xs text-slate-500">Loading conjunction data...</span>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="p-8 text-center">
                        <AlertTriangle size={32} className="text-slate-700 mx-auto mb-2" />
                        <span className="text-xs text-slate-600">No conjunction events found</span>
                    </div>
                ) : (
                    <div className="p-2 space-y-2">
                        {filteredEvents.map((event) => {
                            const styles = riskStyles[event.riskLevel];
                            const isSelected = selectedEvent?.id === event.id;

                            return (
                                <motion.div
                                    key={event.id}
                                    layout
                                    onClick={() => setSelectedEvent(isSelected ? null : event)}
                                    className={clsx(
                                        "rounded-lg border cursor-pointer transition-all",
                                        styles.bg, styles.border, styles.glow,
                                        isSelected ? "ring-1 ring-white/20" : "hover:ring-1 hover:ring-white/10"
                                    )}
                                >
                                    {/* Event Header */}
                                    <div className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Risk Badge */}
                                            <div className={clsx("flex-shrink-0 w-1.5 h-10 rounded-full",
                                                event.riskLevel === 'critical' ? 'bg-red-500 animate-pulse' :
                                                    event.riskLevel === 'high' ? 'bg-orange-500' :
                                                        event.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'
                                            )} />

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white text-sm font-medium truncate">
                                                        {event.primaryObject.name}
                                                    </span>
                                                    <span className="text-slate-500">×</span>
                                                    <span className="text-slate-400 text-sm truncate">
                                                        {event.secondaryObject.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-[10px]">
                                                    <span className={clsx("flex items-center gap-1", styles.text)}>
                                                        <Clock size={10} />
                                                        {formatTimeToTCA(event.tca)}
                                                    </span>
                                                    <span className="text-slate-500">
                                                        {event.minRangeKm < 1
                                                            ? `${(event.minRangeKm * 1000).toFixed(0)}m miss`
                                                            : `${event.minRangeKm.toFixed(2)}km miss`
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <ChevronRight
                                            size={16}
                                            className={clsx("text-slate-500 transition-transform", isSelected && "rotate-90")}
                                        />
                                    </div>

                                    {/* Expanded Details */}
                                    <AnimatePresence>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-3 pb-3 pt-0 space-y-3">
                                                    <div className="h-px bg-white/10" />

                                                    {/* Objects */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-black/30 rounded-lg p-2">
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1">
                                                                {getTypeIcon(event.primaryObject.type)}
                                                                PRIMARY
                                                            </div>
                                                            <div className="text-sm text-white truncate">{event.primaryObject.name}</div>
                                                            <div className="text-[10px] text-slate-500 font-mono">#{event.primaryObject.noradId}</div>
                                                        </div>
                                                        <div className="bg-black/30 rounded-lg p-2">
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1">
                                                                {getTypeIcon(event.secondaryObject.type)}
                                                                SECONDARY
                                                            </div>
                                                            <div className="text-sm text-white truncate">{event.secondaryObject.name}</div>
                                                            <div className="text-[10px] text-slate-500 font-mono">#{event.secondaryObject.noradId}</div>
                                                        </div>
                                                    </div>

                                                    {/* Stats */}
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="text-center">
                                                            <div className="text-[10px] text-slate-500">TCA</div>
                                                            <div className="text-xs text-white font-mono">
                                                                {event.tca.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-[10px] text-slate-500">REL VEL</div>
                                                            <div className="text-xs text-white font-mono flex items-center justify-center gap-1">
                                                                <Zap size={10} className="text-yellow-500" />
                                                                {event.relativeVelocityKmS.toFixed(1)} km/s
                                                            </div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-[10px] text-slate-500">Pc</div>
                                                            <div className={clsx("text-xs font-mono", styles.text)}>
                                                                {event.probabilityOfCollision
                                                                    ? event.probabilityOfCollision.toExponential(2)
                                                                    : 'N/A'
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelectObject?.(event.primaryObject.noradId);
                                                            }}
                                                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-300 transition-colors"
                                                        >
                                                            <Target size={12} />
                                                            Track Primary
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelectObject?.(event.secondaryObject.noradId);
                                                            }}
                                                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-300 transition-colors"
                                                        >
                                                            <Target size={12} />
                                                            Track Secondary
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Summary Footer */}
            <div className="p-3 border-t border-white/5 bg-black/20 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">
                    {events.filter(e => e.riskLevel === 'critical').length} critical •
                    {events.filter(e => e.riskLevel === 'high').length} high risk
                </span>
                <span className="text-slate-600">Next 7 days</span>
            </div>
        </motion.div>
    );
};

export default memo(ConjunctionPanel);
