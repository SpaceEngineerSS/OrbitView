"use client";

import React, { memo, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Satellite, ChevronRight, Star } from "lucide-react";
import { clsx } from "clsx";
import { SpaceObject } from "@/lib/space-objects";

/**
 * MobileSearchOverlay - Full-screen search interface for mobile
 * Opens when Search tab is active with auto-focus and real-time results
 */

interface MobileSearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    objects: SpaceObject[];
    favorites?: string[];
    onSelect: (obj: SpaceObject) => void;
}

const MobileSearchOverlay: React.FC<MobileSearchOverlayProps> = ({
    isOpen,
    onClose,
    objects,
    favorites = [],
    onSelect,
}) => {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when overlay opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            // Small delay to ensure animation has started
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Clear query when overlay closes
    useEffect(() => {
        if (!isOpen) {
            setQuery("");
        }
    }, [isOpen]);

    // Filter objects based on search query
    const filteredObjects = useMemo(() => {
        if (!query || query.length < 2) {
            // Show favorites first when no query
            const favoriteObjects = objects.filter(o => favorites.includes(o.id));
            return favoriteObjects.slice(0, 20);
        }

        const upperQuery = query.toUpperCase();
        return objects
            .filter(obj =>
                obj.name.toUpperCase().includes(upperQuery) ||
                obj.id.includes(upperQuery)
            )
            .slice(0, 50);
    }, [objects, query, favorites]);

    // Handle satellite selection
    const handleSelect = useCallback((obj: SpaceObject) => {
        onSelect(obj);
        onClose();
    }, [onSelect, onClose]);

    // Highlight matching text
    const highlightMatch = (text: string, searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 2) return text;

        const regex = new RegExp(`(${searchQuery})`, 'gi');
        const parts = text.split(regex);

        return parts.map((part, i) =>
            regex.test(part) ? (
                <span key={i} className="bg-cyan-500/30 text-cyan-300 px-0.5 rounded">
                    {part}
                </span>
            ) : part
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mobile-search-overlay pt-safe"
                >
                    {/* Search Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                        {/* Search Input */}
                        <div className="flex-1 relative">
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                                size={20}
                            />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search satellites..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                                className={clsx(
                                    "w-full bg-white/5 border border-white/10 rounded-xl",
                                    "py-3 pl-11 pr-4 text-white placeholder:text-gray-600",
                                    "focus:outline-none focus:border-cyan-500/50 focus:bg-white/10",
                                    "transition-all text-base"
                                )}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />

                            {/* Clear Button */}
                            {query && (
                                <button
                                    onClick={() => setQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Cancel Button */}
                        <button
                            onClick={onClose}
                            className="text-cyan-400 font-medium text-sm py-2 px-1 tap-target"
                        >
                            Cancel
                        </button>
                    </div>

                    {/* Results Section */}
                    <div className="flex-1 overflow-y-auto pb-20">
                        {/* Section Header */}
                        <div className="px-4 py-3 border-b border-white/5">
                            <span className="text-[11px] text-gray-500 uppercase tracking-wider">
                                {query.length >= 2
                                    ? `${filteredObjects.length} results`
                                    : favorites.length > 0
                                        ? 'Favorites'
                                        : 'Start typing to search'
                                }
                            </span>
                        </div>

                        {/* Results List */}
                        <div className="divide-y divide-white/5">
                            {filteredObjects.map((obj) => {
                                const isFavorite = favorites.includes(obj.id);
                                const isStarlink = obj.name.toUpperCase().includes('STARLINK');
                                const isISS = obj.name.toUpperCase().includes('ISS');

                                return (
                                    <button
                                        key={obj.id}
                                        onClick={() => handleSelect(obj)}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-4 py-3",
                                            "hover:bg-white/5 active:bg-white/10 transition-colors tap-target"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className={clsx(
                                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
                                            isStarlink ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                                isISS ? "bg-violet-500/10 border-violet-500/20 text-violet-400" :
                                                    "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                                        )}>
                                            <Satellite size={18} strokeWidth={1.5} />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex items-center gap-2">
                                                {isFavorite && (
                                                    <Star size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                                                )}
                                                <span className="text-white truncate">
                                                    {highlightMatch(obj.name, query)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-gray-500 font-mono">
                                                    #{obj.id}
                                                </span>
                                                {obj.category && (
                                                    <span className="text-[10px] text-gray-600 px-1.5 py-0.5 bg-white/5 rounded">
                                                        {obj.category}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
                                    </button>
                                );
                            })}

                            {/* Empty State */}
                            {query.length >= 2 && filteredObjects.length === 0 && (
                                <div className="px-4 py-12 text-center">
                                    <Satellite size={40} className="mx-auto text-gray-700 mb-3" />
                                    <p className="text-gray-500">No satellites found</p>
                                    <p className="text-gray-600 text-sm mt-1">
                                        Try a different search term
                                    </p>
                                </div>
                            )}

                            {/* Initial State - No Favorites */}
                            {query.length < 2 && favorites.length === 0 && (
                                <div className="px-4 py-12 text-center">
                                    <Search size={40} className="mx-auto text-gray-700 mb-3" />
                                    <p className="text-gray-500">Search satellites</p>
                                    <p className="text-gray-600 text-sm mt-1">
                                        Enter satellite name or NORAD ID
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default memo(MobileSearchOverlay);
