"use client";

import { useState } from "react";
import { MoonStars, CalendarPlus, CaretDown } from "@phosphor-icons/react";
import { useTonight } from "@/store/tonightStore";
import { useAppStore } from "@/store/appStore";
import { useTimelineStore, useSimTimeBucket } from "@/store/timelineStore";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { useAddToCalendar } from "@/hooks/usePassActions";
import { Card, Note } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/Button";
import { InfoButton } from "@/components/ui/Dialog";
import { cx } from "@/components/ui/cx";
import ObserverPrompt from "@/components/analysis/ObserverPrompt";

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/** Visible passes of bright objects during the observer's next night. */
export default function TonightCard({ className, onPicked }: { className?: string; onPicked?: () => void }) {
    const t = useT();
    const f = useFormat();
    const { observer, status, window, passes: computed } = useTonight();
    // The list is recomputed every 30 min of sim time; drop what has already set.
    const simNow = useSimTimeBucket(60_000);
    const passes = computed.filter((p) => p.losTime.getTime() > simNow);
    const byId = useAppStore((s) => s.byId);
    const select = useAppStore((s) => s.select);
    const seek = useTimelineStore((s) => s.seek);
    const addToCalendar = useAddToCalendar();
    const [all, setAll] = useState(false);
    const dir = (az: number) => t(`compass.${COMPASS[Math.round(az / 45) % 8]}`);
    const list = all ? passes : passes.slice(0, 6);

    return (
        <Card
            className={className}
            title={t("tonight.title")}
            icon={<MoonStars size={16} weight="bold" />}
            action={
                <InfoButton title={t("tonight.title")} closeLabel={t("common.close")}>
                    <p>{t("tonight.about")}</p>
                </InfoButton>
            }
        >
            {!observer && <ObserverPrompt />}
            {observer && status === "loading" && <Note>{t("tonight.computing")}</Note>}
            {observer && status === "error" && <Note>{t("errors.computation")}</Note>}
            {observer && status === "ready" && !window && <Note>{t("tonight.noNight")}</Note>}
            {observer && status === "ready" && window && (
                <>
                    <div className="text-[13px] text-ink-2 -mt-1 mb-2">
                        {window.start <= simNow
                            ? t("tonight.windowNow", { to: f.time(window.end, false) })
                            : t("tonight.window", { from: f.time(window.start, false), to: f.time(window.end, false) })}
                    </div>
                    {passes.length === 0 && <Note>{t("tonight.none")}</Note>}
                    <ul>
                        {list.map((p) => {
                            const known = byId.has(p.id);
                            return (
                                <li key={`${p.id}-${p.aosTime.getTime()}`} className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (known) select(p.id);
                                            seek(new Date(p.aosTime.getTime() - 60_000));
                                            onPicked?.();
                                        }}
                                        className="flex-1 min-w-0 flex items-center gap-3 py-2 px-2 -mx-2 rounded-[12px] text-left hover:bg-fill"
                                    >
                                        <span className="figure text-[20px] w-[64px] shrink-0">{f.time(p.aosTime, false)}</span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                                            <span className="block text-[12px] text-ink-2">
                                                {dir(p.azimuthAOS)} → {dir(p.azimuthLOS)} · {f.duration(p.duration)}
                                            </span>
                                        </span>
                                        <span className={cx("text-[15px] font-semibold", p.maxElevation >= 45 ? "text-green" : "text-ink")}>
                                            {f.num(p.maxElevation, 0)}°
                                        </span>
                                    </button>
                                    <IconButton size="sm" variant="ghost" label={t("calendar.add")} onClick={() => addToCalendar(p.id, p.name, p)}>
                                        <CalendarPlus size={17} />
                                    </IconButton>
                                </li>
                            );
                        })}
                    </ul>
                    {passes.length > 6 && (
                        <button type="button" onClick={() => setAll((a) => !a)} aria-expanded={all}
                            className="mt-1 w-full flex items-center justify-center gap-1 py-2 text-[14px] font-semibold text-accent">
                            {all ? t("tonight.less") : t("tonight.more", { n: passes.length - 6 })}
                            <CaretDown size={14} weight="bold" className={all ? "rotate-180" : ""} />
                        </button>
                    )}
                </>
            )}
        </Card>
    );
}
