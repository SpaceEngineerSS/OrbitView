"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cx } from "./cx";

interface CardProps {
    title?: ReactNode;
    icon?: ReactNode;
    /** Right side of the header, e.g. an InfoButton */
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    /** Stagger index when cards enter together */
    index?: number;
}

/** Rounded surface with an optional small header. The basic unit of every panel. */
export function Card({ title, icon, action, children, className, index = 0 }: CardProps) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34, delay: index * 0.04 }}
            className={cx("bg-card rounded-[var(--r-card)] shadow-card p-4", className)}
        >
            {(title || action) && (
                <header className="flex items-center justify-between gap-2 mb-3 -mt-0.5">
                    <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
                        {icon}
                        {title}
                    </h3>
                    {action}
                </header>
            )}
            {children}
        </motion.section>
    );
}

/** Thin divider inside a card. */
export function Divider({ className }: { className?: string }) {
    return <div aria-hidden className={cx("h-px bg-separator my-3", className)} />;
}

/** "Label ...... value" row for details. */
export function Row({ label, value, unit }: { label: ReactNode; value: ReactNode | null | undefined; unit?: string }) {
    const missing = value === null || value === undefined || (typeof value === "number" && !Number.isFinite(value));
    return (
        <div className="flex items-baseline justify-between gap-3 py-[7px]">
            <span className="text-[14px] text-ink-2">{label}</span>
            <span className={cx("text-[14px] font-medium text-right", missing ? "text-ink-3" : "text-ink")}>
                {missing ? "—" : value}
                {!missing && unit && <span className="ml-1 text-ink-2 font-normal">{unit}</span>}
            </span>
        </div>
    );
}

/** Neutral explanatory text. */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
    return <p className={cx("text-[13px] leading-relaxed text-ink-2", className)}>{children}</p>;
}
