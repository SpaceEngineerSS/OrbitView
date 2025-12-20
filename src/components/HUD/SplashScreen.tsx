"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Satellite, Globe, Rocket, Radio, Navigation } from "lucide-react";

interface SplashScreenProps {
    isLoading: boolean;
    loadedCount?: number;
    totalCount?: number;
}

const SPACE_FACTS = [
    { icon: Satellite, text: "Tracking over 25,000 artificial objects in Low Earth Orbit" },
    { icon: Globe, text: "The ISS orbits at 7.66 km/s, crossing continents in minutes" },
    { icon: Rocket, text: "SGP4 perturbations account for Earth's J2 oblateness effects" },
    { icon: Radio, text: "Doppler shift calculation based on ECF relative radial velocity" },
    { icon: Navigation, text: "Propagating orbital elements using celestial reference frames" },
];

const INITIALIZATION_LOGS = [
    "Establishing link with Space-Track.org...",
    "Initializing CesiumJS 3D rendering engine...",
    "Mounting SGP4/SDP4 propagation kernels...",
    "Fetching TLE batch from professional mirrors...",
    "Resolving celestial reference frame (ECI to ECF)...",
    "Calibrating atmospheric drag coefficients...",
    "Calculating conjunction probability matrices...",
    "Synthesizing planetary ephemeris data...",
    "Finalizing Command & Control interface...",
];

const SplashScreen: React.FC<SplashScreenProps> = ({
    isLoading,
    loadedCount = 0,
    totalCount = 5000
}) => {
    const [currentFactIndex, setCurrentFactIndex] = useState(0);
    const [logIndex, setLogIndex] = useState(0);
    const [stars, setStars] = useState<Array<{ x: number; y: number; size: number; delay: number }>>([]);
    const [mounted, setMounted] = useState(false);

    // Generate random stars
    useEffect(() => {
        setMounted(true);
        const generatedStars = Array.from({ length: 100 }, () => ({
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2 + 1,
            delay: Math.random() * 3,
        }));
        setStars(generatedStars);
    }, []);

    // Rotate facts and logs
    useEffect(() => {
        if (!isLoading) return;
        const interval = setInterval(() => {
            setCurrentFactIndex((prev) => (prev + 1) % SPACE_FACTS.length);
        }, 3500);

        const logInt = setInterval(() => {
            setLogIndex(prev => Math.min(INITIALIZATION_LOGS.length - 1, prev + 1));
        }, 800);

        return () => {
            clearInterval(interval);
            clearInterval(logInt);
        };
    }, [isLoading]);

    if (!isLoading) return null;

    const progress = Math.min(100, (loadedCount / totalCount) * 100);
    const currentFact = SPACE_FACTS[currentFactIndex];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-hidden"
            >
                {/* Animated Stars Background */}
                <div className="absolute inset-0">
                    {stars.map((star, i) => (
                        <motion.div
                            key={i}
                            className="absolute rounded-full bg-white"
                            style={{
                                left: `${star.x}%`,
                                top: `${star.y}%`,
                                width: star.size,
                                height: star.size,
                            }}
                            animate={{
                                opacity: [0.3, 1, 0.3],
                                scale: [1, 1.2, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: star.delay,
                            }}
                        />
                    ))}
                </div>

                {/* Orbital Ring Animation */}
                <div className="absolute">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        className="w-[500px] h-[500px] border border-cyan-500/10 rounded-full"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-cyan-500/5 rounded-full"
                    />
                </div>

                {/* Main Content */}
                <div className="relative z-10 text-center px-8">
                    {/* Animated Globe */}
                    <div className="relative w-32 h-32 mx-auto mb-8">
                        {/* Globe */}
                        <motion.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_60px_rgba(6,182,212,0.4)]"
                        />

                        {/* Grid Lines */}
                        <div className="absolute inset-0 rounded-full overflow-hidden opacity-30">
                            <div className="absolute inset-0 border-2 border-white/20 rounded-full" />
                            <div className="absolute inset-4 border border-white/20 rounded-full" />
                            <div className="absolute inset-8 border border-white/20 rounded-full" />
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                        </div>

                        {/* Orbiting Satellite */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-[-20px]"
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2">
                                <Satellite className="w-6 h-6 text-white transform -rotate-45" />
                            </div>
                        </motion.div>

                        {/* Ping Animation */}
                        <motion.div
                            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 rounded-full border-2 border-cyan-400"
                        />
                    </div>

                    {/* Title */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold text-white mb-2"
                    >
                        ORBIT<span className="text-cyan-400">VIEW</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-cyan-500/70 text-sm tracking-[0.3em] font-mono mb-8"
                    >
                        SATELLITE TRACKING SYSTEM
                    </motion.p>

                    {/* Progress Bar */}
                    <div className="w-64 mx-auto mb-6">
                        <div className="flex justify-between text-xs text-slate-500 mb-2">
                            <span>Loading satellites...</span>
                            <span>{loadedCount.toLocaleString()} / {totalCount.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                            />
                        </div>
                    </div>

                    {/* Rotating Space Facts */}
                    <div className="h-16 mb-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentFactIndex}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="flex items-center justify-center gap-3 text-white"
                            >
                                <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                    <currentFact.icon className="w-5 h-5 text-cyan-400" />
                                </div>
                                <span className="text-sm font-medium">{currentFact.text}</span>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Scientific Console Logs */}
                    <div className="w-80 mx-auto bg-black/40 border border-white/5 rounded-lg p-3 font-mono text-[10px] text-left">
                        <div className="text-cyan-500/50 mb-1 border-b border-white/5 pb-1 flex justify-between">
                            <span>SYSTEM_INIT_LOG</span>
                            <span className="animate-pulse">RUNNING</span>
                        </div>
                        <div className="h-20 overflow-hidden flex flex-col-reverse gap-1">
                            {INITIALIZATION_LOGS.slice(0, logIndex + 1).reverse().map((log, i) => (
                                <motion.div
                                    key={log}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: i === 0 ? 1 : 0.4, x: 0 }}
                                    className={i === 0 ? "text-cyan-400" : "text-slate-500"}
                                >
                                    <span className="text-cyan-900 mr-2">[{mounted ? new Date().toLocaleTimeString() : '--:--:--'}]</span>
                                    {log}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* System Status */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-8 flex justify-center gap-6 text-[10px] font-mono text-slate-600"
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            TLE_DATA
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            CESIUM_ENGINE
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            SGP4_SOLVER
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SplashScreen;
