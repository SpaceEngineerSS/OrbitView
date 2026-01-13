"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

/**
 * Dock - macOS-style floating navigation dock
 * ORBITAL GLASS 2.0 - Capsule-shaped glass container at bottom-center
 */

interface DockItem {
    id: string;
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick: () => void;
}

interface DockProps {
    items: DockItem[];
    className?: string;
}

const DockButton: React.FC<DockItem> = memo(({
    icon,
    label,
    isActive,
    onClick,
}) => (
    <motion.button
        onClick={onClick}
        className={clsx(
            "relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors",
            isActive
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/5"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={label}
    >
        {icon}
        <span className="font-heading text-[9px] tracking-widest uppercase">
            {label}
        </span>
        {isActive && (
            <motion.div
                layoutId="dock-indicator"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-sky-400 rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
        )}
    </motion.button>
));

DockButton.displayName = "DockButton";

const Dock: React.FC<DockProps> = memo(({ items, className }) => {
    return (
        <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.2 }}
            className={clsx(
                "fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none",
                className
            )}
        >
            <div className="glass-panel-elevated rounded-full px-2 py-1 pointer-events-auto">
                <div className="flex items-center gap-1">
                    {items.map((item) => (
                        <DockButton key={item.id} {...item} />
                    ))}
                </div>
            </div>
        </motion.div>
    );
});

Dock.displayName = "Dock";

export default Dock;
