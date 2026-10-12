"use client";

import { useId, type ReactNode } from "react";
import { cx } from "./cx";

/** On/off switch with a visible label. */
export function Toggle({ label, description, checked, onChange }: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    const id = useId();
    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <label htmlFor={id} className="min-w-0 cursor-pointer">
                <div className="text-[13px] text-ink">{label}</div>
                {description && <div className="text-[11.5px] text-dim">{description}</div>}
            </label>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={cx(
                    "relative h-5 w-9 shrink-0 border rounded-[2px] transition-colors duration-[140ms]",
                    checked ? "bg-accent border-accent" : "bg-bg border-rule-strong"
                )}
            >
                <span className={cx(
                    "absolute top-[2px] left-0 h-[14px] w-[14px] rounded-[1px] transition-transform duration-[140ms]",
                    checked ? "translate-x-[18px] bg-accent-ink" : "translate-x-[2px] bg-dim"
                )} />
            </button>
        </div>
    );
}

/** A row of mutually exclusive options (radio group). */
export function Segmented<T extends string | number>({ label, options, value, onChange, className }: {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
    className?: string;
}) {
    return (
        <div role="radiogroup" aria-label={label} className={cx("inline-flex border border-rule-strong rounded-[2px]", className)}>
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
                            "num h-7 px-2.5 text-[12px] border-r border-rule-strong last:border-r-0 transition-colors duration-[140ms]",
                            on ? "bg-accent text-accent-ink" : "text-dim hover:text-ink"
                        )}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/** Settings-style row: label on the left, control on the right. */
export function Field({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <div className="min-w-0">
                <div className="text-[13px] text-ink">{label}</div>
                {description && <div className="text-[11.5px] text-dim">{description}</div>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

export function Kbd({ children }: { children: ReactNode }) {
    return (
        <kbd className="num inline-flex items-center h-[18px] px-1 border border-rule-strong rounded-[2px] text-[10.5px] text-dim">
            {children}
        </kbd>
    );
}

/** Text / number input in console style. 16px on touch screens so iOS doesn't zoom. */
export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    const { className, ...rest } = props;
    return (
        <input
            {...rest}
            className={cx(
                "h-9 w-full bg-bg border border-rule-strong rounded-[2px] px-2.5 text-[16px] md:text-[13px] text-ink",
                "placeholder:text-faint focus:border-accent focus:outline-none",
                className
            )}
        />
    );
}
