"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, useReducedMotion } from "motion/react";
import { cx } from "./cx";

export type Tone = "default" | "accent" | "green" | "indigo" | "orange" | "red" | "muted";

const TONE: Record<Tone, string> = {
    default: "text-ink",
    accent: "text-accent",
    green: "text-green",
    indigo: "text-indigo",
    orange: "text-orange",
    red: "text-red",
    muted: "text-ink-2",
};

/**
 * A number that glides to its new value instead of jumping. Rendering goes
 * straight to the DOM node, so a ticking value doesn't re-render React.
 */
export function AnimatedNumber({ value, format, className }: {
    value: number;
    format: (v: number) => string;
    className?: string;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const from = useRef<number | null>(null);
    const reduce = useReducedMotion();
    const formatRef = useRef(format);
    useEffect(() => { formatRef.current = format; }, [format]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const start = from.current;
        from.current = value;
        // First paint, reduced motion, or a big jump (new object): no tween.
        if (start === null || reduce || !Number.isFinite(start) || Math.abs(value - start) > Math.abs(start) * 0.5 + 1e-9) {
            el.textContent = formatRef.current(value);
            return;
        }
        const controls = animate(start, value, {
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (v) => { el.textContent = formatRef.current(v); },
        });
        return () => controls.stop();
    }, [value, reduce]);

    return <span ref={ref} className={className}>{format(value)}</span>;
}

interface StatProps {
    label: ReactNode;
    /** null / NaN show an em dash — we never invent a number */
    value: number | string | null | undefined;
    format?: (v: number) => string;
    unit?: string;
    tone?: Tone;
    size?: "sm" | "md" | "lg" | "xl";
    hint?: ReactNode;
    className?: string;
}

/** Big figure with a small label underneath, Flighty-style. */
export function Stat({ label, value, format, unit, tone = "default", size = "md", hint, className }: StatProps) {
    const missing = value === null || value === undefined || (typeof value === "number" && !Number.isFinite(value));
    return (
        <div className={cx("min-w-0", className)}>
            <div className={cx(
                "figure truncate",
                size === "sm" && "text-[19px]",
                size === "md" && "text-[26px]",
                size === "lg" && "text-[34px]",
                size === "xl" && "text-[44px]",
                missing ? "text-ink-3" : TONE[tone]
            )}>
                {missing ? "—" : typeof value === "number" && format
                    ? <AnimatedNumber value={value} format={format} />
                    : value}
                {!missing && unit && <span className="ml-1 text-[0.5em] font-medium text-ink-2 tracking-normal">{unit}</span>}
            </div>
            <div className="mt-1 text-[13px] text-ink-2 truncate">{label}</div>
            {hint && <div className="text-[12px] text-ink-3 truncate">{hint}</div>}
        </div>
    );
}

/** Small coloured pill: status, counts, flags. */
export function Badge({ tone = "muted", children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
    const bg: Record<Tone, string> = {
        default: "bg-fill text-ink",
        accent: "bg-accent-soft text-accent",
        green: "bg-green-soft text-green",
        indigo: "bg-indigo-soft text-indigo",
        orange: "bg-orange-soft text-orange",
        red: "bg-red-soft text-red",
        muted: "bg-fill text-ink-2",
    };
    return (
        <span className={cx("inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[12px] font-semibold whitespace-nowrap", bg[tone], className)}>
            {icon}
            {children}
        </span>
    );
}
