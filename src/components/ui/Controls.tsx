"use client";

import { useId, type ReactNode, type InputHTMLAttributes } from "react";
import { motion } from "motion/react";
import { cx } from "./cx";

const SPRING = { type: "spring", stiffness: 500, damping: 38 } as const;

/** iOS-style switch with a visible label. */
export function Switch({ label, description, checked, onChange }: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    const id = useId();
    return (
        <div className="flex items-center justify-between gap-4 py-2.5">
            <label htmlFor={id} className="min-w-0 cursor-pointer">
                <div className="text-[15px] text-ink">{label}</div>
                {description && <div className="text-[13px] text-ink-2">{description}</div>}
            </label>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={cx(
                    "relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200",
                    checked ? "bg-green" : "bg-fill-strong"
                )}
            >
                <motion.span
                    className="absolute top-[2px] left-[2px] h-[26px] w-[26px] rounded-full bg-white shadow-card"
                    animate={{ x: checked ? 20 : 0 }}
                    transition={SPRING}
                />
            </button>
        </div>
    );
}

/** Mutually exclusive options with a sliding thumb. */
export function Segmented<T extends string | number>({ label, options, value, onChange, className, size = "md" }: {
    label: string;
    options: { value: T; label: ReactNode }[];
    value: T;
    onChange: (v: T) => void;
    className?: string;
    size?: "sm" | "md";
}) {
    const group = useId();
    return (
        <div role="radiogroup" aria-label={label}
            className={cx("inline-flex p-[3px] rounded-[10px] bg-fill", className)}>
            {options.map((o) => {
                const on = o.value === value;
                return (
                    <button
                        key={String(o.value)}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(o.value)}
                        className={cx(
                            "relative flex-1 rounded-[8px] font-semibold whitespace-nowrap transition-colors",
                            size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-8 px-3 text-[13px]",
                            on ? "text-ink" : "text-ink-2 hover:text-ink"
                        )}
                    >
                        {on && (
                            <motion.span layoutId={`seg-${group}`} transition={SPRING}
                                className="absolute inset-0 rounded-[8px] bg-card shadow-card" />
                        )}
                        <span className="relative">{o.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

/** Horizontal row of filter chips; the selected one gets a sliding background. */
export function ChipGroup<T extends string>({ label, options, value, onChange, className }: {
    label: string;
    options: { value: T; label: ReactNode; count?: string; color?: string }[];
    value: T;
    onChange: (v: T) => void;
    className?: string;
}) {
    const group = useId();
    return (
        <div role="radiogroup" aria-label={label} className={cx("flex gap-1.5", className)}>
            {options.map((o) => {
                const on = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(o.value)}
                        className={cx(
                            "relative shrink-0 h-8 px-3 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors",
                            on ? "text-on-accent" : "text-ink bg-card shadow-card hover:bg-card-2"
                        )}
                    >
                        {on && <motion.span layoutId={`chip-${group}`} transition={SPRING} className="absolute inset-0 rounded-full bg-accent" />}
                        <span className="relative flex items-center gap-1.5">
                            {o.color && <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: o.color }} />}
                            {o.label}
                            {o.count && <span className={cx("font-medium", on ? "opacity-75" : "text-ink-3")}>{o.count}</span>}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

/** Label on the left, control on the right. */
export function Field({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2.5">
            <div className="min-w-0">
                <div className="text-[15px] text-ink">{label}</div>
                {description && <div className="text-[13px] text-ink-2">{description}</div>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

/** Rounded input. 16px on touch screens so iOS doesn't zoom. */
export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...rest}
            className={cx(
                "h-11 w-full rounded-[var(--r-control)] bg-fill px-3.5 text-[16px] md:text-[15px] text-ink",
                "placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-accent",
                className
            )}
        />
    );
}

export function Kbd({ children }: { children: ReactNode }) {
    return (
        <kbd className="inline-flex items-center h-[22px] min-w-[22px] justify-center px-1.5 rounded-[6px] bg-fill text-[12px] font-semibold text-ink-2">
            {children}
        </kbd>
    );
}
