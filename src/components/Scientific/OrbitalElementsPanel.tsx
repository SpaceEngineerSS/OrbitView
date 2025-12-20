"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
    CircleDot,
    Orbit,
    ArrowUpRight,
    RotateCcw,
    Timer,
    Compass,
    Info
} from "lucide-react";
import { SpaceObject } from "@/lib/space-objects";

interface OrbitalElementsProps {
    satellite: SpaceObject | null;
}

/**
 * Orbital Elements Panel
 * 
 * Displays the classical Keplerian orbital elements extracted from TLE data.
 * 
 * References:
 * - Vallado, D. A. "Fundamentals of Astrodynamics and Applications" 4th Ed.
 * - Hoots, F. R., Roehrich R. L. "Spacetrack Report No. 3" (SGP4/SDP4)
 */
const OrbitalElementsPanel: React.FC<OrbitalElementsProps> = ({ satellite }) => {
    // Parse TLE to extract orbital elements
    const elements = useMemo(() => {
        if (!satellite || satellite.type !== 'TLE' || !satellite.tle) {
            return null;
        }

        const { line1, line2 } = satellite.tle;

        try {
            // TLE Line 2 parsing (reference: NASA TLE format)
            // Col 9-16: Inclination (degrees)
            // Col 18-25: RAAN (degrees)  
            // Col 27-33: Eccentricity (decimal assumed)
            // Col 35-42: Argument of Perigee (degrees)
            // Col 44-51: Mean Anomaly (degrees)
            // Col 53-63: Mean Motion (revs/day)

            const inclination = parseFloat(line2.substring(8, 16).trim());
            const raan = parseFloat(line2.substring(17, 25).trim()); // Right Ascension of Ascending Node
            const eccentricity = parseFloat('0.' + line2.substring(26, 33).trim());
            const argOfPerigee = parseFloat(line2.substring(34, 42).trim()); // ω
            const meanAnomaly = parseFloat(line2.substring(43, 51).trim()); // M
            const meanMotion = parseFloat(line2.substring(52, 63).trim()); // n (revs/day)

            // Derived quantities
            const orbitalPeriod = (24 * 60) / meanMotion; // minutes
            const GM = 398600.4418; // Earth's gravitational parameter (km³/s²)
            const n = (meanMotion * 2 * Math.PI) / (24 * 3600); // rad/s
            const semiMajorAxis = Math.pow(GM / (n * n), 1 / 3); // km

            // Apogee and Perigee
            const earthRadius = 6378.137; // km
            const apogee = semiMajorAxis * (1 + eccentricity) - earthRadius;
            const perigee = semiMajorAxis * (1 - eccentricity) - earthRadius;

            // Extract B* drag coefficient from Line 1
            // Col 54-61: B* drag term
            const bstarStr = line1.substring(53, 61).trim();
            let bstar = 0;
            if (bstarStr.length > 0) {
                const mantissa = parseFloat(bstarStr.substring(0, 6)) / 100000;
                const exponent = parseInt(bstarStr.substring(6));
                bstar = mantissa * Math.pow(10, exponent);
            }

            // Epoch from Line 1
            const epochYear = parseInt(line1.substring(18, 20));
            const epochDay = parseFloat(line1.substring(20, 32));
            const fullYear = epochYear > 56 ? 1900 + epochYear : 2000 + epochYear;
            const epochDate = new Date(Date.UTC(fullYear, 0, 1));
            epochDate.setTime(epochDate.getTime() + (epochDay - 1) * 24 * 60 * 60 * 1000);

            return {
                // Classical Keplerian Elements
                semiMajorAxis,
                eccentricity,
                inclination,
                raan,
                argOfPerigee,
                meanAnomaly,
                // Derived
                meanMotion,
                orbitalPeriod,
                apogee,
                perigee,
                bstar,
                epochDate,
                // Orbit classification
                orbitType: classifyOrbit(semiMajorAxis, eccentricity, inclination)
            };
        } catch (e) {
            console.error('[OrbitalElements] Parse error:', e);
            return null;
        }
    }, [satellite]);

    if (!satellite) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6">
                <Orbit className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">Select a satellite to view orbital elements</p>
            </div>
        );
    }

    if (satellite.type !== 'TLE' || !elements) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6">
                <Info className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">Orbital elements only available for TLE-based satellites</p>
                <p className="text-xs mt-2 text-slate-600">Deep space objects use ephemeris data</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Orbit size={18} className="text-purple-400" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-sm">{satellite.name}</h3>
                    <span className="text-[10px] font-mono text-purple-400">{elements.orbitType}</span>
                </div>
            </div>

            {/* Classical Keplerian Elements */}
            <section className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <CircleDot size={10} /> Keplerian Elements
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    <ElementCard
                        label="Semi-major Axis (a)"
                        value={`${elements.semiMajorAxis.toFixed(2)} km`}
                        formula="a = ∛(μ/n²)"
                        icon={<ArrowUpRight size={12} />}
                        color="cyan"
                    />
                    <ElementCard
                        label="Eccentricity (e)"
                        value={elements.eccentricity.toFixed(6)}
                        formula="0 ≤ e < 1"
                        icon={<CircleDot size={12} />}
                        color="green"
                    />
                    <ElementCard
                        label="Inclination (i)"
                        value={`${elements.inclination.toFixed(4)}°`}
                        formula="Angle to equator"
                        icon={<RotateCcw size={12} />}
                        color="orange"
                    />
                    <ElementCard
                        label="RAAN (Ω)"
                        value={`${elements.raan.toFixed(4)}°`}
                        formula="Right Ascension Asc. Node"
                        icon={<Compass size={12} />}
                        color="blue"
                    />
                    <ElementCard
                        label="Arg. of Perigee (ω)"
                        value={`${elements.argOfPerigee.toFixed(4)}°`}
                        formula="Angle in orbital plane"
                        icon={<RotateCcw size={12} />}
                        color="purple"
                    />
                    <ElementCard
                        label="Mean Anomaly (M)"
                        value={`${elements.meanAnomaly.toFixed(4)}°`}
                        formula="Position along orbit"
                        icon={<Timer size={12} />}
                        color="pink"
                    />
                </div>
            </section>

            {/* Derived Parameters */}
            <section className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Timer size={10} /> Derived Parameters
                </h4>
                <div className="bg-slate-900/50 rounded-lg border border-white/5 p-3 space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Orbital Period</span>
                        <span className="text-white font-mono">{elements.orbitalPeriod.toFixed(2)} min</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Mean Motion (n)</span>
                        <span className="text-white font-mono">{elements.meanMotion.toFixed(8)} rev/day</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Apogee Altitude</span>
                        <span className="text-cyan-400 font-mono">{elements.apogee.toFixed(2)} km</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Perigee Altitude</span>
                        <span className="text-orange-400 font-mono">{elements.perigee.toFixed(2)} km</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">B* Drag Term</span>
                        <span className="text-white font-mono">{elements.bstar.toExponential(4)}</span>
                    </div>
                </div>
            </section>

            {/* TLE Epoch */}
            <section className="bg-slate-900/30 rounded-lg border border-white/5 p-3">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">TLE Epoch</span>
                    <span className="text-white font-mono text-[11px]">
                        {elements.epochDate.toISOString().replace('T', ' ').substring(0, 19)} UTC
                    </span>
                </div>
            </section>

            {/* Academic Reference */}
            <div className="text-[9px] text-slate-600 italic text-center">
                Calculation based on NORAD TLE format (Hoots & Roehrich, 1980)
            </div>
        </motion.div>
    );
};

// Element Card Component
interface ElementCardProps {
    label: string;
    value: string;
    formula: string;
    icon: React.ReactNode;
    color: 'cyan' | 'green' | 'orange' | 'blue' | 'purple' | 'pink';
}

const ElementCard: React.FC<ElementCardProps> = ({ label, value, formula, icon, color }) => {
    const colorClasses = {
        cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
        green: 'bg-green-500/10 border-green-500/20 text-green-400',
        orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
        blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
        pink: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
    };

    return (
        <div className={`p-2 rounded-lg border ${colorClasses[color]}`}>
            <div className="flex items-center gap-1 mb-1">
                {icon}
                <span className="text-[10px] font-bold truncate">{label}</span>
            </div>
            <div className="text-sm font-mono text-white">{value}</div>
            <div className="text-[9px] opacity-60 truncate">{formula}</div>
        </div>
    );
};

// Orbit Classification
function classifyOrbit(semiMajorAxis: number, eccentricity: number, inclination: number): string {
    const altitude = semiMajorAxis - 6378.137; // Approximate mean altitude
    const isGeo = altitude > 35000 && altitude < 36000 && eccentricity < 0.01;
    const isMEO = altitude > 2000 && altitude < 35000;
    const isLEO = altitude < 2000;
    const isPolar = inclination > 80 && inclination < 100;
    const isEquatorial = inclination < 10;
    const isSunSync = inclination > 95 && inclination < 100;
    const isMolniya = eccentricity > 0.5 && inclination > 60 && inclination < 65;

    if (isMolniya) return 'MOLNIYA ORBIT';
    if (isGeo && isEquatorial) return 'GEOSTATIONARY';
    if (isGeo) return 'GEOSYNCHRONOUS';
    if (isSunSync) return 'SUN-SYNCHRONOUS';
    if (isPolar && isLEO) return 'POLAR LEO';
    if (isLEO) return 'LOW EARTH ORBIT';
    if (isMEO) return 'MEDIUM EARTH ORBIT';
    return 'ELLIPTICAL ORBIT';
}

export default OrbitalElementsPanel;
