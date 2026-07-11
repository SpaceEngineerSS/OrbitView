"use client";

import React from "react";
import { motion } from "framer-motion";
import { Globe, Settings, Crosshair } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import GlassPanel from "../UI/GlassPanel";

const MAIN_ITEMS = [
    { icon: Globe, label: "Orbital", href: "/orbit" },
    { icon: Crosshair, label: "Dashboard", href: "/analytics" },
    { icon: Settings, label: "Config", href: "/settings" },
];

interface MobileNavBarProps {
    activeView?: string;
    onViewChange?: (view: 'globe' | 'analytics' | 'settings') => void;
}

const MobileNavBar: React.FC<MobileNavBarProps> = ({ activeView = 'globe', onViewChange }) => {
    const handleNavigation = (href: string, label: string, e: React.MouseEvent) => {
        if (href === '/orbit') {
            e.preventDefault();
            onViewChange?.('globe');
        } else if (href === '/analytics') {
            e.preventDefault();
            onViewChange?.('analytics');
        } else if (href === '/settings') {
            e.preventDefault();
            onViewChange?.('settings');
        }
    };

    return (
        <motion.nav
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none pb-[env(safe-area-inset-bottom)]"
        >
            <GlassPanel
                intensity="high"
                borderGlow={true}
                className="py-1.5 px-3 pointer-events-auto shadow-2xl bg-black/75 backdrop-blur-lg rounded-2xl border-white/10"
            >
                <div className="flex items-center justify-around w-full">
                    {MAIN_ITEMS.map((item) => {
                        const isActive = (item.href === '/orbit' && activeView === 'globe') ||
                            (item.href === '/analytics' && activeView === 'analytics') ||
                            (item.href === '/settings' && activeView === 'settings');

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={(e) => handleNavigation(item.href, item.label, e)}
                                className="relative group py-1 flex flex-col items-center gap-0.5 min-w-[70px]"
                            >
                                <div
                                    className={clsx(
                                        "relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200",
                                        isActive ? "text-cyan-400 bg-white/10 shadow-[0_0_15px_rgba(0,243,255,0.25)]" : "text-slate-400 active:text-white active:bg-white/5"
                                    )}
                                >
                                    <item.icon
                                        size={18}
                                        className={clsx(
                                            "transition-transform",
                                            isActive && "drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]"
                                        )}
                                        strokeWidth={1.5}
                                    />
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobile-nav-indicator"
                                            className="absolute -bottom-1 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_5px_#00f3ff]"
                                        />
                                    )}
                                </div>
                                <span className={clsx("text-[9px] font-bold uppercase tracking-wider transition-colors", isActive ? "text-cyan-400" : "text-slate-500")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </GlassPanel>
        </motion.nav>
    );
};

export default MobileNavBar;
