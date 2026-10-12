/**
 * OrbitView mark: a planet seen edge-on, one inclined orbit, and the tracked
 * object as a small square — the same square used for LOS on the sky plot.
 */
export function LogoMark({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="6.5" fill="none" stroke="var(--c-text)" strokeWidth="1.6" />
            <ellipse cx="16" cy="16" rx="14" ry="5.2" fill="none" stroke="var(--c-text-dim)" strokeWidth="1.2"
                transform="rotate(-24 16 16)" />
            <rect x="23.9" y="6.6" width="4.2" height="4.2" fill="var(--c-accent)" />
        </svg>
    );
}

export function Wordmark() {
    return (
        <span className="flex items-center gap-2 select-none">
            <LogoMark />
            <span className="text-[13px] font-semibold tracking-[0.14em]">ORBITVIEW</span>
        </span>
    );
}
