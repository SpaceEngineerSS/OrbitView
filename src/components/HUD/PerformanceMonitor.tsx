"use client";

import React, { useState, useEffect } from "react";
import { Activity } from "lucide-react";

const PerformanceMonitor: React.FC = () => {
    const [fps, setFps] = useState(60);
    const [memory, setMemory] = useState(0);

    useEffect(() => {
        let lastTime = performance.now();
        let frames = 0;

        const updateFPS = () => {
            frames++;
            const currentTime = performance.now();

            if (currentTime >= lastTime + 1000) {
                setFps(Math.round((frames * 1000) / (currentTime - lastTime)));
                frames = 0;
                lastTime = currentTime;

                // Memory usage (if available)
                if ((performance as any).memory) {
                    const memUsed = (performance as any).memory.usedJSHeapSize / 1048576;
                    setMemory(Math.round(memUsed));
                }
            }

            requestAnimationFrame(updateFPS);
        };

        const rafId = requestAnimationFrame(updateFPS);
        return () => cancelAnimationFrame(rafId);
    }, []);

    const fpsColor = fps >= 50 ? "text-emerald-500" : fps >= 30 ? "text-yellow-500" : "text-red-500";

    return (
        <div className="fixed top-6 right-6 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] z-30">
            <div className="flex items-center gap-3">
                <Activity size={16} className="text-cyan-400" />
                <div className="flex gap-4 font-mono text-xs">
                    <div>
                        <span className="text-slate-500">FPS:</span>
                        <span className={`ml-1 font-bold ${fpsColor}`}>{fps}</span>
                    </div>
                    {memory > 0 && (
                        <div>
                            <span className="text-slate-500">MEM:</span>
                            <span className="ml-1 text-cyan-400 font-bold">{memory}MB</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PerformanceMonitor;
