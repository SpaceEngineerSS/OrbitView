"use client";

import React, { forwardRef, ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * GlassPanel - Base container component for all UI elements
 * Implements clean Glassmorphism design following ORBITAL GLASS 2.0
 * 
 * @design_reference Apple Vision Pro spatial interface aesthetic
 * Uses backdrop blur, semi-transparent backgrounds, subtle borders
 */

export type GlassPanelVariant = "default" | "elevated";

interface GlassPanelProps extends Omit<HTMLMotionProps<"div">, "children"> {
    children: ReactNode;
    variant?: GlassPanelVariant;
    className?: string;
    /** Disable default enter/exit animations */
    noAnimation?: boolean;
    /** Use as a static div instead of motion.div */
    asStatic?: boolean;
}

const variantStyles: Record<GlassPanelVariant, string> = {
    default: "glass-panel",
    elevated: "glass-panel-elevated",
};

// Smooth spring animation config
const springTransition = {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
    mass: 1,
};

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
    (
        {
            children,
            variant = "default",
            className,
            noAnimation = false,
            asStatic = false,
            ...motionProps
        },
        ref
    ) => {
        const baseClasses = twMerge(
            clsx(
                "relative overflow-hidden rounded-2xl",
                variantStyles[variant],
                className
            )
        );

        // Static version (no animations)
        if (asStatic) {
            return (
                <div ref={ref} className={baseClasses}>
                    {children}
                </div>
            );
        }

        // Animated version
        return (
            <motion.div
                ref={ref}
                className={baseClasses}
                initial={noAnimation ? false : { opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={noAnimation ? undefined : { opacity: 0, scale: 0.98, y: -8 }}
                transition={springTransition}
                {...motionProps}
            >
                {children}
            </motion.div>
        );
    }
);

GlassPanel.displayName = "GlassPanel";

export default GlassPanel;
