"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Globe, Settings, Crosshair, Radio, Database, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import GlassPanel from "../UI/GlassPanel";

const MAIN_ITEMS = [
    { icon: Globe, label: "Orbital", href: "/orbit" },
    { icon: Home, label: "Mission", href: "/" },
    { icon: Crosshair, label: "Analytics", href: "/analytics" },
    { icon: Settings, label: "Config", href: "/settings" },
];

const SECONDARY_ITEMS = [
    { icon: Radio, label: "Comms", href: "/comms" },
    { icon: Database, label: "Archive", href: "/archive" },
];

interface MobileNavBarProps {
    activeView?: string;
    onViewChange?: (view: 'globe' | 'analytics' | 'settings') => void;
}

const MobileNavBar: React.FC<MobileNavBarProps> = ({ activeView = 'globe', onViewChange }) => {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleNavigation = (href: string, label: string, e: React.MouseEvent) => {
        // Intercept logic for view changing without route change if needed
        if (href === '/orbit') {
            e.preventDefault();
            onViewChange?.('globe');
        } else if (href === '/analytics' || href === '/') { // Mission or Analytics opens Dashboard
            e.preventDefault();
            onViewChange?.('analytics');
        } else if (href === '/settings') {
            e.preventDefault();
            onViewChange?.('settings');
        }
        setIsMenuOpen(false);
    };

    return (
        <>
            {/* Main Bottom Bar */}
            <motion.nav
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none"
            >
                <GlassPanel
                    intensity="high"
                    borderGlow={true}
                    className="py-2 px-2 pointer-events-auto shadow-2xl bg-black/80 backdrop-blur-md"
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
                                    className="relative group p-2 flex flex-col items-center gap-1 min-w-[60px]"
                                >
                                    <div
                                        className={clsx(
                                            "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                                            isActive ? "text-cyan-400 bg-white/10 shadow-[0_0_15px_rgba(0,243,255,0.2)]" : "text-slate-400 active:text-white active:bg-white/5"
                                        )}
                                    >
                                        <item.icon
                                            size={20}
                                            className={clsx(
                                                "transition-transform",
                                                isActive && "drop-shadow-[0_0_5px_rgba(0,243,255,0.7)]"
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
                                    <span className={clsx("text-[10px] font-bold uppercase tracking-wider", isActive ? "text-cyan-400" : "text-slate-500")}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </GlassPanel>
            </motion.nav>
        </>
    );
};

export default MobileNavBar;
