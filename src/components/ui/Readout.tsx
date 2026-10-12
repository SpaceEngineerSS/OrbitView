import type { ReactNode } from "react";
import { cx } from "./cx";

type Value = ReactNode | null | undefined;

const isMissing = (v: Value) => v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v));

interface ReadoutProps {
    label: ReactNode;
    /** null / undefined / NaN render as an em dash: we never invent a number */
    value: Value;
    unit?: string;
    hint?: ReactNode;
    tone?: "default" | "accent" | "alert" | "warn" | "ok" | "dim";
    size?: "sm" | "md" | "lg";
    className?: string;
}

const TONES = {
    default: "text-ink",
    accent: "text-accent",
    alert: "text-alert",
    warn: "text-warn",
    ok: "text-ok",
    dim: "text-dim",
};

export function Readout({ label, value, unit, hint, tone = "default", size = "md", className }: ReadoutProps) {
    const missing = isMissing(value);
    return (
        <div className={cx("min-w-0", className)}>
            <div className="label truncate">{label}</div>
            <div className={cx(
                "num leading-tight truncate",
                size === "sm" && "text-[13px]",
                size === "md" && "text-[15px]",
                size === "lg" && "text-[22px]",
                missing ? "text-faint" : TONES[tone]
            )}>
                {missing ? "—" : value}
                {!missing && unit && <span className="ml-1 text-[0.72em] text-dim">{unit}</span>}
            </div>
            {hint && <div className="text-[11px] text-faint mt-0.5 truncate">{hint}</div>}
        </div>
    );
}

/** label …… value rows, for dense tables of numbers */
export function Row({ label, value, unit }: { label: ReactNode; value: Value; unit?: string }) {
    const missing = isMissing(value);
    return (
        <div className="flex items-baseline justify-between gap-3 py-[5px] border-b border-rule/60 last:border-b-0">
            <span className="text-[12px] text-dim">{label}</span>
            <span className={cx("num text-[13px] text-right", missing ? "text-faint" : "text-ink")}>
                {missing ? "—" : value}
                {!missing && unit && <span className="ml-1 text-[11px] text-dim">{unit}</span>}
            </span>
        </div>
    );
}
