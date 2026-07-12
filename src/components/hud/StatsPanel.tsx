"use client";

import React, { useMemo, memo } from "react";
import { Satellite, Globe2, TrendingUp, Radio } from "lucide-react";
import { SatelliteData } from "@/lib/tle";

interface StatsPanelProps {
    satellites: SatelliteData[];
}

const StatsPanel: React.FC<StatsPanelProps> = memo(({ satellites }) => {
    // Memoize statistics calculations
    const stats = useMemo(() => {
        const totalSats = satellites.length;
        const starlinkCount = satellites.filter(s => s.name.includes("STARLINK")).length;
        const gpsCount = satellites.filter(s =>
            s.name.includes("GPS") || s.name.includes("NAVSTAR") ||
            s.name.includes("GLONASS") || s.name.includes("GALILEO") ||
            s.name.includes("BEIDOU")
        ).length;
        const issCount = satellites.filter(s =>
            s.name.includes("ISS") || s.name.includes("ZARYA")
        ).length;

        return [
            {
                label: "Total Objects",
                value: totalSats.toLocaleString(),
                icon: Globe2,
                colorClass: "cyan",
            },
            {
                label: "Starlink",
                value: starlinkCount.toLocaleString(),
                icon: Satellite,
                colorClass: "blue",
            },
            {
                label: "Navigation",
                value: gpsCount.toLocaleString(),
                icon: Radio,
                colorClass: "emerald",
            },
            {
                label: "Stations",
                value: issCount.toLocaleString(),
                icon: TrendingUp,
                colorClass: "purple",
            }
        ];
    }, [satellites]);

    // Color mapping for Tailwind JIT compatibility
    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
        cyan: {
            bg: 'bg-cyan-500/10',
            border: 'border-cyan-500/20',
            text: 'text-cyan-400'
        },
        blue: {
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            text: 'text-blue-400'
        },
        emerald: {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            text: 'text-emerald-400'
        },
        purple: {
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            text: 'text-purple-400'
        }
    };

    return (
        <div className="grid grid-cols-2 gap-3 mb-4 stats-grid">
            {stats.map((stat) => {
                const colors = colorMap[stat.colorClass] || colorMap.cyan;
                return (
                    <div
                        key={stat.label}
                        className="bg-black/40 border border-white/10 rounded-lg p-3 hover:border-cyan-500/30 transition-all group cursor-pointer"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border} group-hover:scale-110 transition-transform`}>
                                <stat.icon size={16} className={colors.text} />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-white mb-1 tabular-nums">{stat.value}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{stat.label}</div>
                    </div>
                );
            })}
        </div>
    );
});

StatsPanel.displayName = 'StatsPanel';

export default StatsPanel;
