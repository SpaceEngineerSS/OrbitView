import type { ReactNode } from "react";
import { cx } from "./cx";

interface PanelProps {
    title?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
    as?: "section" | "aside" | "div";
}

/** Flat surface with an optional title strip. The body is a flex column that scrolls. */
export function Panel({ title, actions, children, className, bodyClassName, as: Tag = "section" }: PanelProps) {
    return (
        <Tag className={cx("flex flex-col min-h-0 bg-surface border border-rule", className)}>
            {(title || actions) && (
                <header className="flex items-center justify-between gap-2 h-9 px-3 border-b border-rule shrink-0">
                    <h2 className="label truncate">{title}</h2>
                    {actions && <div className="flex items-center gap-1">{actions}</div>}
                </header>
            )}
            <div className={cx("flex-1 min-h-0 scroll", bodyClassName)}>{children}</div>
        </Tag>
    );
}

/** A labelled group inside a panel. */
export function Section({ title, children, className, aside }: {
    title?: ReactNode;
    children: ReactNode;
    className?: string;
    aside?: ReactNode;
}) {
    return (
        <div className={cx("px-3 py-3 border-b border-rule last:border-b-0", className)}>
            {(title || aside) && (
                <div className="flex items-baseline justify-between gap-2 mb-2">
                    {title && <h3 className="label">{title}</h3>}
                    {aside && <div className="text-[11px] text-faint">{aside}</div>}
                </div>
            )}
            {children}
        </div>
    );
}

/** Neutral note for empty or unavailable states. */
export function Note({ children, tone = "dim" }: { children: ReactNode; tone?: "dim" | "warn" }) {
    return (
        <p className={cx(
            "text-[12px] leading-relaxed border-l-2 pl-2.5 py-0.5",
            tone === "warn" ? "border-warn text-ink" : "border-rule-strong text-dim"
        )}>
            {children}
        </p>
    );
}
