"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for merging tailwind classes
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface GlassPanelProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    intensity?: "low" | "medium" | "high";
    borderGlow?: boolean;
}

const GlassPanel: React.FC<GlassPanelProps> = ({
    children,
    className,
    intensity = "medium",
    borderGlow = true,
    ...props
}) => {
    // Performance optimization: lower blur for stability if requested, but default is 16px per user spec
    const blurAmount = intensity === "low" ? "8px" : intensity === "medium" ? "16px" : "24px";

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }} // Cubic-bezier for "Spring-like" feel without heavy spring calc
            style={{
                backdropFilter: `blur(${blurAmount})`,
                WebkitBackdropFilter: `blur(${blurAmount})`,
                willChange: "transform, opacity", // GPU Acceleration hint
            }}
            className={cn(
                "relative overflow-hidden rounded-xl bg-slate-900/40 border border-white/10 md:backdrop-blur-md backdrop-blur-none", // Mobile: No blur, rely on dark bg
                borderGlow && "shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:border-white/20 hover:shadow-[0_0_20px_rgba(0,243,255,0.1)] transition-colors duration-300",
                className
            )}
            {...props}
        >
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};

export default GlassPanel;
