"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bell, Search, Satellite, X } from "lucide-react";
import { SpaceObject } from "@/lib/space-objects";

interface TopBarProps {
    onSearch?: (query: string) => void;
    objects?: SpaceObject[];
    onSelect?: (obj: SpaceObject) => void;
    searchQuery?: string;
}

const TopBar: React.FC<TopBarProps> = ({ onSearch, objects = [], onSelect, searchQuery = "" }) => {
    const [time, setTime] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchValue, setSearchValue] = useState(searchQuery);
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Sync input with external searchQuery prop
    useEffect(() => {
        setSearchValue(searchQuery);
        if (!searchQuery) {
            setIsSearchOpen(false);
        } else {
            setIsSearchOpen(true);
        }
    }, [searchQuery]);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString("en-US", { hour12: false }) + " UTC");
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filtered suggestions list
    const suggestions = useMemo(() => {
        if (!searchValue || searchValue.length < 2 || !objects) return [];
        const upperQuery = searchValue.toUpperCase();
        return objects
            .filter(obj =>
                obj.name.toUpperCase().includes(upperQuery) ||
                obj.id.includes(upperQuery)
            )
            .slice(0, 8);
    }, [searchValue, objects]);

    // Reset highlight when suggestions change
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [suggestions]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            handleSelect(suggestions[highlightedIndex]);
        } else {
            onSearch?.(searchValue);
            setShowDropdown(false);
        }
    };

    const handleSelect = (obj: SpaceObject) => {
        onSelect?.(obj);
        setSearchValue("");
        onSearch?.("");
        setIsSearchOpen(false);
        setShowDropdown(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex(prev => (prev + 1) % suggestions.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === "Escape") {
            setShowDropdown(false);
        }
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
                    <div ref={searchContainerRef} className="relative z-50">
                        <div className={`flex items-center transition-all duration-300 ${isSearchOpen ? 'w-64 bg-slate-900/80 border-cyan-500/50' : 'w-8 bg-transparent border-transparent'} border rounded-full overflow-hidden`}>
                            <button
                                onClick={() => {
                                    setIsSearchOpen(!isSearchOpen);
                                    if (!isSearchOpen) {
                                        setShowDropdown(true);
                                    }
                                }}
                                className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                            >
                                <Search size={18} />
                            </button>
                            {isSearchOpen && (
                                <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center pr-2">
                                    <input
                                        type="text"
                                        value={searchValue}
                                        onChange={(e) => {
                                            setSearchValue(e.target.value);
                                            setShowDropdown(true);
                                        }}
                                        onFocus={() => setShowDropdown(true)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="SEARCH TARGET OR ID..."
                                        className="w-full bg-transparent text-white font-mono text-sm outline-none placeholder:text-slate-600 uppercase pr-1"
                                        autoFocus
                                    />
                                    {searchValue && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchValue("");
                                                onSearch?.("");
                                            }}
                                            className="text-slate-500 hover:text-white"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </form>
                            )}
                        </div>

                        {/* Suggestions Dropdown */}
                        <AnimatePresence>
                            {isSearchOpen && showDropdown && suggestions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-12 right-0 w-72 bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col z-50 divide-y divide-white/5"
                                >
                                    <div className="px-3 py-1.5 bg-black/40 text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                                        Matching Targets
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {suggestions.map((obj, index) => {
                                            const isHighlighted = index === highlightedIndex;
                                            return (
                                                <button
                                                    key={obj.id}
                                                    onClick={() => handleSelect(obj)}
                                                    onMouseEnter={() => setHighlightedIndex(index)}
                                                    className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                                                        isHighlighted ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-300 hover:bg-white/5'
                                                    }`}
                                                >
                                                    <Satellite size={14} className="text-cyan-400 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-rajdhani font-bold truncate uppercase">
                                                            {obj.name}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-500">
                                                            ID: {obj.id} {obj.category && `| ${obj.category}`}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
