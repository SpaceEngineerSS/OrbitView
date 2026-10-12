"use client";

import { useRef, type KeyboardEvent } from "react";
import { cx } from "./cx";

interface TabsProps<T extends string> {
    tabs: { id: T; label: string }[];
    value: T;
    onChange: (id: T) => void;
    label: string;
    className?: string;
}

/** Underlined tab strip with arrow-key navigation. */
export function Tabs<T extends string>({ tabs, value, onChange, label, className }: TabsProps<T>) {
    const ref = useRef<HTMLDivElement>(null);
    const onKey = (e: KeyboardEvent) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        e.stopPropagation();
        const i = tabs.findIndex((t) => t.id === value);
        const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        onChange(next.id);
        ref.current?.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
    };
    return (
        <div
            ref={ref}
            role="tablist"
            aria-label={label}
            onKeyDown={onKey}
            className={cx("flex flex-wrap border-b border-rule shrink-0", className)}
        >
            {tabs.map((t) => {
                const on = t.id === value;
                return (
                    <button
                        key={t.id}
                        data-tab={t.id}
                        role="tab"
                        type="button"
                        aria-selected={on}
                        tabIndex={on ? 0 : -1}
                        onClick={() => onChange(t.id)}
                        className={cx(
                            "relative h-9 px-2.5 text-[12px] whitespace-nowrap transition-colors duration-[140ms]",
                            on ? "text-ink" : "text-dim hover:text-ink"
                        )}
                    >
                        {t.label}
                        {on && <span aria-hidden className="absolute left-2 right-2 bottom-0 h-[2px] bg-accent" />}
                    </button>
                );
            })}
        </div>
    );
}
