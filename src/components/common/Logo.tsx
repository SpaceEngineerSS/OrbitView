/**
 * OrbitView app icon: a planet, one inclined orbit and the tracked object,
 * on a night-sky tile. Same drawing as public/favicon.svg and the PWA icons.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
            <defs>
                <linearGradient id="ov-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#24356f" />
                    <stop offset="1" stopColor="#0c1330" />
                </linearGradient>
            </defs>
            <rect width="64" height="64" rx="15" fill="url(#ov-sky)" />
            <g transform="rotate(-22 32 34)" fill="none" stroke="#f4f5f8" strokeWidth="2.2">
                {/* far half of the orbit, behind the planet */}
                <path d="M7 34 A25 8.5 0 0 1 57 34" strokeOpacity="0.35" />
            </g>
            <circle cx="32" cy="34" r="12" fill="#f4f5f8" />
            <g transform="rotate(-22 32 34)" fill="none" stroke="#f4f5f8" strokeWidth="2.2">
                {/* near half, in front */}
                <path d="M7 34 A25 8.5 0 0 0 57 34" strokeOpacity="0.8" />
            </g>
            <circle cx="54.9" cy="27.9" r="4.2" fill="#ffc94d" />
        </svg>
    );
}

export function Wordmark() {
    return (
        <span className="flex items-center gap-2.5 select-none">
            <LogoMark />
            <span className="text-[17px] font-semibold tracking-tight">OrbitView</span>
        </span>
    );
}
