"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Bell, Search } from "lucide-react";

interface TopBarProps {
    onSearch?: (query: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({ onSearch }) => {
    const [time, setTime] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString("en-US", { hour12: false }) + " UTC");
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch?.(searchValue);
    };

    return (
        <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
            className="fixed top-0 left-0 right-0 h-16 z-40 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 pointer-events-auto"
        >
            {/* Left: Logo */}
            <div className="flex items-center gap-4">
                <div className="relative w-8 h-8 flex items-center justify-center">
                    <div className="absolute inset-0 bg-cyan-500/20 rounded blur-sm" />
                    <div className="relative w-full h-full border border-cyan-400/50 rounded flex items-center justify-center bg-black/50">
                        <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f3ff]" />
                    </div>
                </div>
                <h1 className="font-rajdhani font-bold text-2xl tracking-[0.2em] text-white hidden md:block">
                    ORBIT<span className="text-cyan-400 drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]">VIEW</span>
                </h1>
            </div>

            {/* Center: HUD Data */}
            <div className="hidden md:flex items-center gap-12">
                {/* Time */}
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Mission Time</span>
                    <span className="font-mono text-lg font-bold text-white tracking-widest text-glow">{time}</span>
                </div>

                {/* Location */}
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Coordinates</span>
                    <span className="font-mono text-sm text-cyan-400 tracking-wider">39.93° N, 32.85° E</span>
                </div>
            </div>

            {/* Right: Actions & Status */}
            <div className="flex items-center gap-6">
                {/* Net Status */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <span className="text-xs font-mono text-emerald-400 tracking-wider">ONLINE</span>
                </div>

                <div className="hidden md:block h-8 w-px bg-white/10" />

                <div className="flex items-center gap-4">
                    {/* Search Bar */}
                    <div className={`flex items-center transition-all duration-300 ${isSearchOpen ? 'w-64 bg-slate-900/80 border-cyan-500/50' : 'w-8 bg-transparent border-transparent'} border rounded-full overflow-hidden`}>
                        <button
                            onClick={() => setIsSearchOpen(!isSearchOpen)}
                            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                            <Search size={18} />
                        </button>
                        {isSearchOpen && (
                            <form onSubmit={handleSearchSubmit} className="flex-1">
                                <input
                                    type="text"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    placeholder="SEARCH SATELLITE ID..."
                                    className="w-full bg-transparent text-white font-mono text-sm outline-none placeholder:text-slate-600 uppercase"
                                    autoFocus
                                />
                            </form>
                        )}
                    </div>

                    <button className="text-slate-400 hover:text-cyan-400 transition-colors relative">
                        <Bell size={20} strokeWidth={1.5} />
                        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_#ef4444]" />
                    </button>
                    <button className="flex items-center gap-2 hover:bg-white/5 pr-3 pl-1 py-1 rounded-full transition-all border border-transparent hover:border-white/10">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 p-[1px]">
                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                                <User size={16} className="text-white" />
                            </div>
                        </div>
                        <span className="hidden md:block text-xs font-rajdhani font-bold tracking-wider text-slate-300">COMMANDER</span>
                    </button>
                </div>
            </div>
        </motion.header>
    );
};

export default TopBar;
