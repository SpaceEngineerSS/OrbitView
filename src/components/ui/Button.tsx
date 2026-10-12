"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";

type Variant = "default" | "accent" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: "sm" | "md";
    icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
    default: "border-rule-strong bg-raised text-ink hover:border-dim",
    accent: "border-accent bg-accent text-accent-ink hover:bg-[#f5b45c]",
    ghost: "border-transparent bg-transparent text-dim hover:text-ink hover:bg-raised",
    danger: "border-alert/60 bg-transparent text-alert hover:bg-alert/10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = "default", size = "md", icon, className, children, type = "button", ...rest },
    ref
) {
    return (
        <button
            ref={ref}
            type={type}
            className={cx(
                "inline-flex items-center justify-center gap-2 border rounded-[2px] font-medium whitespace-nowrap",
                "transition-colors duration-[140ms] disabled:opacity-40 disabled:pointer-events-none",
                size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-[13px]",
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
    size?: "sm" | "md" | "lg";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    { label, active, size = "md", className, children, type = "button", ...rest },
    ref
) {
    return (
        <button
            ref={ref}
            type={type}
            aria-label={label}
            title={label}
            className={cx(
                "inline-flex items-center justify-center shrink-0 rounded-[2px] border transition-colors duration-[140ms]",
                "disabled:opacity-40 disabled:pointer-events-none",
                size === "sm" && "h-7 w-7",
                size === "md" && "h-9 w-9",
                size === "lg" && "h-11 w-11",
                active
                    ? "border-accent text-accent bg-accent/10"
                    : "border-transparent text-dim hover:text-ink hover:bg-raised",
                className
            )}
            {...rest}
        >
            {children}
        </button>
    );
});
