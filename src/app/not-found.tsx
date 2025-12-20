"use client";

import { useEffect } from "react";

export default function NotFound() {
    useEffect(() => {
        // Add some stars dynamically
        const container = document.getElementById("stars-container");
        if (container) {
            for (let i = 0; i < 100; i++) {
                const star = document.createElement("div");
                star.className = "star";
                star.style.left = `${Math.random() * 100}%`;
                star.style.top = `${Math.random() * 100}%`;
                star.style.animationDelay = `${Math.random() * 3}s`;
                container.appendChild(star);
            }
        }
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
            {/* Stars Background */}
            <div id="stars-container" className="absolute inset-0 pointer-events-none">
                <style jsx>{`
          .star {
            position: absolute;
            width: 2px;
            height: 2px;
            background: white;
            border-radius: 50%;
            animation: twinkle 3s ease-in-out infinite;
          }
          @keyframes twinkle {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `}</style>
            </div>

            {/* Orbit Ring Decoration */}
            <div className="absolute w-[600px] h-[600px] border border-cyan-500/20 rounded-full animate-spin" style={{ animationDuration: "60s" }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
            </div>
            <div className="absolute w-[400px] h-[400px] border border-cyan-500/10 rounded-full animate-spin" style={{ animationDuration: "45s", animationDirection: "reverse" }} />

            {/* Content */}
            <div className="relative z-10 text-center">
                {/* 404 Number */}
                <div className="relative">
                    <h1 className="text-[180px] font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-cyan-900 leading-none select-none">
                        404
                    </h1>
                    {/* Satellite Icon */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <svg className="w-16 h-16 text-cyan-400 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2L12 6" strokeLinecap="round" />
                            <path d="M12 18L12 22" strokeLinecap="round" />
                            <path d="M4.93 4.93L7.76 7.76" strokeLinecap="round" />
                            <path d="M16.24 16.24L19.07 19.07" strokeLinecap="round" />
                            <path d="M2 12L6 12" strokeLinecap="round" />
                            <path d="M18 12L22 12" strokeLinecap="round" />
                            <circle cx="12" cy="12" r="4" />
                        </svg>
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-2xl font-semibold text-white mt-4 mb-2">
                    Lost in Space
                </h2>
                <p className="text-slate-400 max-w-md mx-auto mb-8">
                    The satellite you&apos;re looking for has drifted out of orbit.
                    Let&apos;s get you back to mission control.
                </p>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-4">
                    <a
                        href="/"
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]"
                    >
                        Return to OrbitView
                    </a>
                    <a
                        href="/"
                        className="px-6 py-3 bg-slate-800/50 border border-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all"
                    >
                        Track ISS
                    </a>
                </div>

                {/* Coordinates */}
                <div className="mt-12 text-xs text-slate-600 font-mono">
                    <span className="text-slate-500">ERROR_CODE:</span> PAGE_NOT_FOUND |
                    <span className="text-slate-500 ml-2">LOCATION:</span> UNKNOWN_SECTOR
                </div>
            </div>
        </div>
    );
}
