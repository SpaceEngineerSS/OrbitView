"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Globe, Settings, Crosshair, Radio, Database, Menu } from "lucide-react";
import { clsx } from "clsx";
import GlassPanel from "@/components/ui/GlassPanel";

const MENU_ITEMS = [
    { icon: Home, label: "Mission Control", href: "/" },
    { icon: Globe, label: "Orbital View", href: "/orbit" },
    { icon: Crosshair, label: "Targeting", href: "/targeting" },
    { icon: Radio, label: "Communication", href: "/comms" },
    { icon: Database, label: "Data Archive", href: "/archive" },
    { icon: Settings, label: "System Config", href: "/settings" },
];

interface ModernSidebarProps {
    activeView?: string;
    onViewChange?: (view: 'globe' | 'analytics' | 'settings') => void;
}

const ModernSidebar: React.FC<ModernSidebarProps> = ({ activeView = 'globe', onViewChange }) => {
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const handleNavigation = (href: string, label: string) => {
        // Intercept logic for view changing without route change if needed
        if (href === '/orbit') {
            onViewChange?.('globe');
        } else if (href === '/' || href === '/analytics' || href === '/targeting' || href === '/comms' || href === '/archive') {
            onViewChange?.('analytics');
        } else if (href === '/settings') {
            onViewChange?.('settings');
        }
    };

    return (
        <motion.aside
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="fixed left-0 top-16 bottom-0 z-50 w-16 flex flex-col items-center py-4 pointer-events-none"
        >
            <GlassPanel
                intensity="medium"
                borderGlow={false}
                className="h-full w-full flex flex-col items-center py-6 rounded-l-none border-l-0 pointer-events-auto"
            >
                {/* Menu Items */}
                <nav className="flex-1 w-full flex flex-col items-center gap-4">
                    {MENU_ITEMS.map((item) => {
                        const isActive = (item.href === '/orbit' && activeView === 'globe') ||
                            (item.href === '/' && activeView === 'analytics') ||
                            (item.href === '/settings' && activeView === 'settings');
                        const isHovered = hoveredItem === item.label;

                        return (
                            <button
                                key={item.href}
                                onClick={() => handleNavigation(item.href, item.label)}
                                className="relative group w-full flex justify-center bg-transparent border-0 cursor-pointer focus:outline-none"
                            >
                                <div
                                    className={clsx(
                                        "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                                        isActive ? "text-cyan-400 bg-white/10 shadow-[0_0_15px_rgba(0,243,255,0.2)]" : "text-slate-400 hover:text-white hover:bg-white/5"
                                    )}
                                    onMouseEnter={() => setHoveredItem(item.label)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                >
                                    <item.icon
                                        size={20}
                                        className={clsx(
                                            "transition-transform",
                                            isActive && "drop-shadow-[0_0_5px_rgba(0,243,255,0.7)]"
                                        )}
                                        strokeWidth={1.5}
                                    />

                                    {/* Active Indicator Bar */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-nav-indicator"
                                            className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full shadow-[0_0_10px_#00f3ff]"
                                        />
                                    )}
                                </div>

                                {/* Tooltip (Right Side) */}
                                <AnimatePresence>
                                    {isHovered && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 10, scale: 0.9 }}
                                            animate={{ opacity: 1, x: 20, scale: 1 }}
                                            exit={{ opacity: 0, x: 10, scale: 0.9 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute left-full top-1/2 -translate-y-1/2 z-50 ml-2"
                                        >
                                            <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 text-cyan-400 text-xs font-rajdhani font-bold tracking-widest px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl border-l-2 border-l-cyan-400">
                                                {item.label}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom Action */}
                <div className="mt-auto w-full flex justify-center">
                    <button className="p-2 text-slate-500 hover:text-white transition-colors">
                        <Menu size={20} strokeWidth={1.5} />
                    </button>
                </div>
            </GlassPanel>
        </motion.aside>
    );
};

export default ModernSidebar;
