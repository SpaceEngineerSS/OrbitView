"use client";

import { useState } from "react";
import { Pause, Play, CaretLeft, CaretRight, ClockCounterClockwise } from "@phosphor-icons/react";
import { useTimelineStore, SPEEDS } from "@/store/timelineStore";
import { useAppStore, useSelectedObject } from "@/store/appStore";
import { usePasses } from "@/hooks/useAnalysis";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { IconButton, Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { Badge } from "@/components/ui/Stat";
import { cx } from "@/components/ui/cx";

const HOUR = 3_600_000;
const SPAN_MIN = 12 * 60;

/** Simulation clock with a status badge: live, paused, fast-forward or offset. */
export function SimClock({ compact = false, className }: { compact?: boolean; className?: string }) {
    const t = useT();
    const f = useFormat();
    const time = useTimelineStore((s) => s.currentTime);
    const multiplier = useTimelineStore((s) => s.multiplier);
    const playing = useTimelineStore((s) => s.isPlaying);
    const live = playing && multiplier === 1 && Math.abs(time.getTime() - Date.now()) < 5_000;

    return (
        <div className={cx("flex items-center gap-2.5 min-w-0", className)}>
            <div className="min-w-0">
                <div className={cx("figure", compact ? "text-[19px]" : "text-[24px]")}>{f.time(time)}</div>
                {!compact && <div className="text-[12px] text-ink-2 mt-0.5">{f.date(time)} · {f.zone}</div>}
            </div>
            {live ? <Badge tone="green">{t("time.live")}</Badge>
                : !playing ? <Badge tone="muted">{t("time.paused")}</Badge>
                    : multiplier !== 1 ? <Badge tone="orange">×{multiplier}</Badge>
                        : <Badge tone="accent">{t("time.offset")}</Badge>}
        </div>
    );
}

/**
 * Jog scrubber: drag up to ±12 h from where you grabbed it; on release it
 * re-centres at the new time. Ticks mark the selected object's passes.
 */
export function TimeScrubber() {
    const t = useT();
    const f = useFormat();
    const time = useTimelineStore((s) => s.currentTime);
    const seek = useTimelineStore((s) => s.seek);
    const [anchor, setAnchor] = useState<number | null>(null);
    const obj = useSelectedObject();
    const observer = useAppStore((s) => s.observer);
    const passes = usePasses(obj, observer);

    const base = anchor ?? time.getTime();
    const offsetMin = anchor === null ? 0 : Math.round((time.getTime() - anchor) / 60_000);
    const pct = (ms: number) => 50 + ((ms - base) / (SPAN_MIN * 60_000)) * 50;
    const marks = passes.status === "ready"
        ? passes.data.filter((p) => Math.abs(p.aosTime.getTime() - base) < SPAN_MIN * 60_000)
        : [];

    const begin = () => setAnchor(useTimelineStore.getState().currentTime.getTime());
    const end = () => setAnchor(null);

    return (
        <div className="relative w-full h-7">
            <div aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-fill" />
            {marks.map((p) => (
                <span key={p.aosTime.getTime()} aria-hidden
                    className={cx("absolute top-1/2 -translate-y-1/2 h-3.5 w-1.5 rounded-full", p.visible ? "bg-green" : "bg-accent")}
                    style={{ left: `calc(${pct(p.aosTime.getTime())}% - 3px)` }} />
            ))}
            <input
                type="range"
                min={-SPAN_MIN}
                max={SPAN_MIN}
                step={1}
                value={Math.max(-SPAN_MIN, Math.min(SPAN_MIN, offsetMin))}
                aria-label={t("time.scrub")}
                aria-valuetext={f.dateTime(time)}
                onPointerDown={begin}
                onPointerUp={end}
                onPointerCancel={end}
                onKeyDown={() => { if (anchor === null) begin(); }}
                onKeyUp={end}
                onBlur={end}
                onChange={(e) => {
                    const b = anchor ?? useTimelineStore.getState().currentTime.getTime();
                    if (anchor === null) setAnchor(b);
                    seek(new Date(b + Number(e.target.value) * 60_000));
                }}
                className="scrubber absolute inset-0 w-full"
            />
        </div>
    );
}

/** Transport, speed and "now". */
export function TimeControls({ compact = false }: { compact?: boolean }) {
    const t = useT();
    const playing = useTimelineStore((s) => s.isPlaying);
    const multiplier = useTimelineStore((s) => s.multiplier);
    const { togglePlay, jump, now, setMultiplier } = useTimelineStore.getState();

    return (
        <div className={cx("flex items-center gap-2", compact && "flex-wrap justify-between")}>
            <div className="flex items-center gap-1">
                <IconButton label={t("time.back1h")} onClick={() => jump(-HOUR)}><CaretLeft size={18} weight="bold" /></IconButton>
                <IconButton label={playing ? t("time.pause") : t("time.play")} onClick={togglePlay} size="lg" variant="inverse">
                    {playing ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
                </IconButton>
                <IconButton label={t("time.fwd1h")} onClick={() => jump(HOUR)}><CaretRight size={18} weight="bold" /></IconButton>
            </div>
            <Segmented size="sm" label={t("time.speed")} value={multiplier} onChange={setMultiplier}
                options={SPEEDS.map((s) => ({ value: s, label: `×${s}` }))} />
            <Button size="sm" variant="tinted" icon={<ClockCounterClockwise size={15} weight="bold" />} onClick={now}>{t("time.now")}</Button>
        </div>
    );
}
