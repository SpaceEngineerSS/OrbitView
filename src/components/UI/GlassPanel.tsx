"use client";

import React, { forwardRef, ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * GlassPanel - Base container component for all HUD elements
 * Implements Glassmorphism design with Sci-Fi aesthetics
 * 
 * @design_reference Based on "Sci-Fi HUD" and "Glassmorphism" design principles
 * Uses backdrop blur, semi-transparent backgrounds, and subtle borders
 */

export type GlassPanelVariant = "default" | "elevated" | "sunken" | "neon";

interface GlassPanelProps extends Omit<HTMLMotionProps<"div">, "children"> {
    children: ReactNode;
    variant?: GlassPanelVariant;
    className?: string;
    neonColor?: "cyan" | "rose" | "emerald" | "purple";
    withScanLine?: boolean;
    withGlow?: boolean;
}

const variantStyles: Record<GlassPanelVariant, string> = {
    default: "bg-slate-900/60 border-white/5 shadow-lg",
    elevated: "bg-slate-800/70 border-white/10 shadow-2xl shadow-cyan-500/5",
    sunken: "bg-slate-950/80 border-white/5",
    neon: "bg-slate-900/40 border-cyan-500/30 shadow-2xl shadow-cyan-500/10",
};

const neonColors = {
    cyan: {
        border: "border-cyan-500/40",
        glow: "shadow-[0_0_30px_rgba(6,182,212,0.3)]",
        scanLine: "from-cyan-500/20",
    },
    rose: {
        border: "border-rose-500/40",
        glow: "shadow-[0_0_30px_rgba(244,63,94,0.3)]",
        scanLine: "from-rose-500/20",
    },
    emerald: {
        border: "border-emerald-500/40",
        glow: "shadow-[0_0_30px_rgba(16,185,129,0.3)]",
        scanLine: "from-emerald-500/20",
    },
    purple: {
        border: "border-purple-500/40",
        glow: "shadow-[0_0_30px_rgba(168,85,247,0.3)]",
        scanLine: "from-purple-500/20",
    },
};

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
    (
        {
            children,
            variant = "default",
            className,
            neonColor = "cyan",
            withScanLine = false,
            withGlow = false,
            ...motionProps
        },
        ref
    ) => {
        const colors = neonColors[neonColor];

        return (
            <motion.div
                ref={ref}
                className={twMerge(
                    clsx(
                        // Base styles
                        "relative overflow-hidden rounded-xl",
                        "backdrop-blur-2xl",
                        "border",
                        "transition-all duration-300",
                        // Variant styles
                        variantStyles[variant],
                        // Neon variant override
                        variant === "neon" && colors.border,
                        // Glow effect
                        withGlow && colors.glow,
                        // Custom className
                        className
                    )
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                {...motionProps}
            >
                {/* Scan Line Effect */}
                {withScanLine && (
                    <div
                        className={clsx(
                            "absolute inset-0 pointer-events-none",
                            "bg-gradient-to-b from-transparent via-transparent to-transparent",
                            "animate-scan-line opacity-30"
                        )}
                        style={{
                            background: `linear-gradient(180deg, transparent 0%, ${neonColor === "cyan"
                                ? "rgba(6,182,212,0.1)"
                                : neonColor === "rose"
                                    ? "rgba(244,63,94,0.1)"
                                    : neonColor === "emerald"
                                        ? "rgba(16,185,129,0.1)"
                                        : "rgba(168,85,247,0.1)"
                                } 50%, transparent 100%)`,
                        }}
                    />
                )}

                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-current opacity-30 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-current opacity-30 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-current opacity-30 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-current opacity-30 rounded-br-lg" />

                {/* Content */}
                <div className="relative z-10">{children}</div>
            </motion.div>
        );
    }
);

GlassPanel.displayName = "GlassPanel";

export default GlassPanel;
