"use client";

import { useState } from "react";
import { Pause, Play, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useTimelineStore, SPEEDS } from "@/store/timelineStore";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { IconButton, Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { cx } from "@/components/ui/cx";

const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Simulation clock readout. Shows the offset from real time when not live. */
export function SimClock({ className, compact = false }: { className?: string; compact?: boolean }) {
    const t = useT();
    const f = useFormat();
    const time = useTimelineStore((s) => s.currentTime);
    const multiplier = useTimelineStore((s) => s.multiplier);
    const playing = useTimelineStore((s) => s.isPlaying);
    const offset = time.getTime() - Date.now();
    const live = playing && multiplier === 1 && Math.abs(offset) < 5_000;

    return (
        <div className={cx("flex items-baseline gap-2", className)}>
            <span className={cx("num tabular-nums", compact ? "text-[13px]" : "text-[15px]")}>{f.time(time)}</span>
            <span className="num text-[11px] text-dim">{f.zone}</span>
            {!compact && <span className="num text-[11px] text-dim">{f.date(time)}</span>}
            <span className={cx("num text-[10.5px] px-1 border rounded-[2px]",
                live ? "border-ok/50 text-ok" : "border-accent/50 text-accent")}>
                {live ? t("time.live") : !playing ? t("time.paused") : multiplier !== 1 ? `×${multiplier}` : t("time.offset")}
            </span>
        </div>
    );
}

/** Play/pause, jumps, speed and "now". */
export function TimeControls({ layout = "bar" }: { layout?: "bar" | "stack" }) {
    const t = useT();
    const playing = useTimelineStore((s) => s.isPlaying);
    const multiplier = useTimelineStore((s) => s.multiplier);
    const { togglePlay, jump, now, setMultiplier } = useTimelineStore.getState();

    const speed = (
        <Segmented
            label={t("time.speed")}
            value={multiplier}
            onChange={setMultiplier}
            options={SPEEDS.map((s) => ({ value: s, label: `×${s}` }))}
        />
    );

    const transport = (
        <div className="flex items-center gap-0.5">
            <IconButton label={t("time.back1d")} onClick={() => jump(-DAY)}><ChevronsLeft size={16} strokeWidth={1.5} /></IconButton>
            <IconButton label={t("time.back1h")} onClick={() => jump(-HOUR)}><ChevronLeft size={16} strokeWidth={1.5} /></IconButton>
            <IconButton label={playing ? t("time.pause") : t("time.play")} onClick={togglePlay} active={!playing} size="md">
                {playing ? <Pause size={15} strokeWidth={1.5} /> : <Play size={15} strokeWidth={1.5} />}
            </IconButton>
            <IconButton label={t("time.fwd1h")} onClick={() => jump(HOUR)}><ChevronRight size={16} strokeWidth={1.5} /></IconButton>
            <IconButton label={t("time.fwd1d")} onClick={() => jump(DAY)}><ChevronsRight size={16} strokeWidth={1.5} /></IconButton>
        </div>
    );

    if (layout === "stack") {
        return (
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">{transport}<Button size="sm" onClick={now}>{t("time.now")}</Button></div>
                <div className="overflow-x-auto">{speed}</div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            {transport}
            {speed}
            <Button size="sm" onClick={now}>{t("time.now")}</Button>
        </div>
    );
}

/**
 * Jog scrubber: grab the thumb and drag up to ±12 h from where you grabbed
 * it. On release it springs back to the centre at the new time.
 */
export function TimeScrubber() {
    const t = useT();
    const f = useFormat();
    const time = useTimelineStore((s) => s.currentTime);
    const seek = useTimelineStore((s) => s.seek);
    const [anchor, setAnchor] = useState<number | null>(null);
    const span = 12 * 60; // minutes
    const offsetMin = anchor === null ? 0 : Math.round((time.getTime() - anchor) / 60_000);

    const begin = () => setAnchor(useTimelineStore.getState().currentTime.getTime());
    const end = () => setAnchor(null);

    return (
        <div className="flex items-center gap-3 w-full">
            <span className="num text-[11px] text-faint w-10 text-right">−12 h</span>
            <div className="relative flex-1 h-6">
                <div aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-1/2 ticks" />
                <div aria-hidden className="absolute left-1/2 top-0 bottom-0 w-px bg-rule-strong" />
                <input
                    type="range"
                    min={-span}
                    max={span}
                    step={1}
                    value={Math.max(-span, Math.min(span, offsetMin))}
                    aria-label={t("time.scrub")}
                    aria-valuetext={f.dateTime(time)}
                    onPointerDown={begin}
                    onPointerUp={end}
                    onPointerCancel={end}
                    onKeyDown={() => { if (anchor === null) begin(); }}
                    onKeyUp={end}
                    onBlur={end}
                    onChange={(e) => {
                        const base = anchor ?? useTimelineStore.getState().currentTime.getTime();
                        if (anchor === null) setAnchor(base);
                        seek(new Date(base + Number(e.target.value) * 60_000));
                    }}
                    className="scrubber absolute inset-0 w-full"
                />
            </div>
            <span className="num text-[11px] text-faint w-10">+12 h</span>
        </div>
    );
}
