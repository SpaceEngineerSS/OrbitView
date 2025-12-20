"use client";

import React from "react";
import { Map } from "lucide-react";

interface MiniMapProps {
    selectedSatellite?: { name: string; lat: number; lon: number } | null;
}

const MiniMap: React.FC<MiniMapProps> = ({ selectedSatellite }) => {
    return (
        <div className="fixed top-24 right-6 w-48 h-32 bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] z-20">
            {/* Header */}
            <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 bg-gradient-to-r from-cyan-950/30 to-transparent">
                <Map size={14} className="text-cyan-400" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Mini Map</span>
            </div>

            {/* Map Content */}
            <div className="relative w-full h-full bg-slate-900">
                {/* Simplified world map background */}
                <svg viewBox="0 0 200 100" className="w-full h-full opacity-30">
                    <rect width="200" height="100" fill="none" stroke="#334155" strokeWidth="0.5" />
                    <line x1="100" y1="0" x2="100" y2="100" stroke="#334155" strokeWidth="0.5" />
                    <line x1="0" y1="50" x2="200" y2="50" stroke="#334155" strokeWidth="0.5" />
                    {/* Grid */}
                    {Array.from({ length: 9 }).map((_, i) => (
                        <line
                            key={`v${i}`}
                            x1={(i + 1) * 20}
                            y1="0"
                            x2={(i + 1) * 20}
                            y2="100"
                            stroke="#1e293b"
                            strokeWidth="0.3"
                        />
                    ))}
                    {Array.from({ length: 4 }).map((_, i) => (
                        <line
                            key={`h${i}`}
                            x1="0"
                            y1={(i + 1) * 20}
                            x2="200"
                            y2={(i + 1) * 20}
                            stroke="#1e293b"
                            strokeWidth="0.3"
                        />
                    ))}
                </svg>

                {/* Selected satellite marker */}
                {selectedSatellite && (
                    <div
                        className="absolute w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse"
                        style={{
                            left: `${((selectedSatellite.lon + 180) / 360) * 100}%`,
                            top: `${((90 - selectedSatellite.lat) / 180) * 100}%`,
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
                    </div>
                )}

                {/* Coordinates display */}
                {selectedSatellite && (
                    <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                        <div className="text-[8px] font-mono text-cyan-400 flex justify-between">
                            <span>LAT: {selectedSatellite.lat.toFixed(2)}°</span>
                            <span>LON: {selectedSatellite.lon.toFixed(2)}°</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MiniMap;
