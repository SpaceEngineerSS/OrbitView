"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";

type Variant = "filled" | "tinted" | "plain" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: "sm" | "md" | "lg";
    icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
    filled: "bg-accent text-on-accent hover:brightness-110 active:brightness-95",
    tinted: "bg-accent-soft text-accent hover:brightness-105",
    plain: "bg-fill text-ink hover:bg-fill-strong",
    ghost: "bg-transparent text-accent hover:bg-accent-soft",
};

/** Pill button. `filled` for the one main action on a surface, `tinted`/`plain` otherwise. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = "plain", size = "md", icon, className, children, type = "button", ...rest },
    ref
) {
    return (
        <button
            ref={ref}
            type={type}
            className={cx(
                "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap select-none",
                "transition-[filter,background-color,transform] duration-150 active:scale-[0.97]",
                "disabled:opacity-40 disabled:pointer-events-none",
                size === "sm" && "h-8 px-3.5 text-[13px]",
                size === "md" && "h-10 px-4 text-[14px]",
                size === "lg" && "h-12 px-5 text-[15px]",
                VARIANTS[variant],
                className
            )}
            {...rest}
        >
            {icon}
            {children}
        </button>
    );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Required: read by screen readers and shown as a tooltip */
    label: string;
    active?: boolean;
    /** float: a card-coloured circle with a shadow, for controls over the globe */
    variant?: "plain" | "ghost" | "float" | "inverse";
    size?: "sm" | "md" | "lg";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    { label, active, variant = "plain", size = "md", className, children, type = "button", ...rest },
    ref
) {
    return (
        <button
            ref={ref}
            type={type}
            aria-label={label}
            title={label}
            className={cx(
                "inline-flex items-center justify-center shrink-0 rounded-full select-none",
                "transition-[background-color,color,transform] duration-150 active:scale-[0.94]",
                "disabled:opacity-40 disabled:pointer-events-none",
                size === "sm" && "h-8 w-8",
                size === "md" && "h-10 w-10",
                size === "lg" && "h-12 w-12",
                active
                    ? "bg-accent text-on-accent"
                    : variant === "inverse"
                        ? "bg-ink text-card hover:opacity-90"
                        : variant === "float"
                        ? "bg-card text-ink shadow-float hover:bg-card-2"
                        : variant === "plain"
                            ? "bg-fill text-ink hover:bg-fill-strong"
                            : "text-ink-2 hover:text-ink hover:bg-fill",
                className
            )}
            {...rest}
        >
            {children}
        </button>
    );
});
