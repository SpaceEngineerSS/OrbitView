"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, ArrowRight, CalendarBlank, CalendarPlus } from "@phosphor-icons/react";
import { useAddToCalendar } from "@/hooks/usePassActions";
import type { SpaceObject } from "@/lib/space-objects";
import { getSatrec } from "@/lib/orbit";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { usePasses } from "@/hooks/useAnalysis";
import { useAppStore } from "@/store/appStore";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useTimelineStore, useSimTimeBucket } from "@/store/timelineStore";
import { Card, Note } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { InfoButton } from "@/components/ui/Dialog";
import { cx } from "@/components/ui/cx";
import { PassStrip } from "./viz";
import Skyplot from "./Skyplot";

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
const WINDOW = 48 * 3600_000;

export default function PassesCard({ obj, index }: { obj: SpaceObject; index: number }) {
    const t = useT();
    const f = useFormat();
    const observer = useAppStore((s) => s.observer);
    const minEl = useAppStore((s) => s.settings.minElevation);
    const passes = usePasses(obj, observer);
    const look = useTelemetryStore((s) => (s.telemetry?.id === obj.id ? s.telemetry.look : null));
    const seek = useTimelineStore((s) => s.seek);
    const now = useSimTimeBucket(60_000);
    const [picked, setPicked] = useState(0);
    const addToCalendar = useAddToCalendar();

    const rec = useMemo(() => (obj.tle ? getSatrec(obj.tle.line1, obj.tle.line2) : null), [obj]);
    if (!observer) return null;

    const list = passes.status === "ready" ? passes.data : [];
    const sel = list[Math.min(picked, Math.max(0, list.length - 1))] ?? null;
    const dir = (az: number) => t(`compass.${COMPASS[Math.round(az / 45) % 8]}`);
    const visibleCount = list.filter((p) => p.visible).length;

    return (
        <Card
            index={index}
            title={t("passes.title")}
            icon={<CalendarBlank size={16} weight="bold" />}
            action={
                <InfoButton title={t("passes.title")} closeLabel={t("common.close")}>
                    <p>{t("passes.note")}</p>
                    <p>{t("passes.visibleHint")}.</p>
                    <p>{t("passes.window", { el: minEl })}</p>
                </InfoButton>
            }
        >
            {passes.status === "loading" && <Note>{t("passes.computing")}</Note>}
            {passes.status === "error" && <Note>{t("errors.computation")}</Note>}
            {passes.status === "ready" && list.length === 0 && <Note>{t("passes.noneIn48h")}</Note>}

            {list.length > 0 && observer && (
                <>
                    <div className="flex items-baseline justify-between mb-2">
                        <div className="text-[15px]">
                            <span className="font-semibold">{t("passes.count", { n: list.length })}</span>
                            {visibleCount > 0 && <span className="text-green font-semibold"> · {t("passes.visibleCount", { n: visibleCount })}</span>}
                        </div>
                    </div>
                    <PassStrip
                        passes={list}
                        observer={observer}
                        start={now}
                        end={now + WINDOW}
                        now={now}
                        selected={picked}
                        onSelect={setPicked}
                        tickLabel={(ts) => f.time(ts, false)}
                        label={t("passes.stripLabel")}
                    />
                    <div className="flex gap-3 mt-1.5 text-[12px] text-ink-2">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green" />{t("passes.legendVisible")}</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" />{t("passes.legendRadio")}</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-[2px] bg-indigo-soft" />{t("passes.legendNight")}</span>
                    </div>

                    <AnimatePresence mode="popLayout" initial={false}>
                        {sel && rec && (
                            <motion.div
                                key={sel.aosTime.getTime()}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ type: "spring", stiffness: 400, damping: 34 }}
                                className="mt-4 rounded-[16px] bg-card-2 p-3.5"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-[13px] text-ink-2">{f.date(sel.aosTime)}</div>
                                        <div className="figure text-[28px] mt-0.5 flex items-center gap-2">
                                            {f.time(sel.aosTime, false)}
                                            <ArrowRight size={18} className="text-ink-3" />
                                            {f.time(sel.losTime, false)}
                                        </div>
                                    </div>
                                    {sel.visible
                                        ? <Badge tone="green" icon={<Eye size={14} weight="bold" />}>{t("passes.visibleShort")}</Badge>
                                        : <Badge tone="accent">{t("passes.radioOnly")}</Badge>}
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                                    <div className="rounded-[12px] bg-card py-2">
                                        <div className="figure text-[20px]">{f.num(sel.maxElevation, 0)}°</div>
                                        <div className="text-[12px] text-ink-2 mt-0.5">{t("passes.maxEl")}</div>
                                    </div>
                                    <div className="rounded-[12px] bg-card py-2">
                                        <div className="figure text-[20px]">{f.duration(sel.duration)}</div>
                                        <div className="text-[12px] text-ink-2 mt-0.5">{t("passes.duration")}</div>
                                    </div>
                                    <div className="rounded-[12px] bg-card py-2">
                                        <div className="figure text-[20px]">{dir(sel.azimuthAOS)} → {dir(sel.azimuthLOS)}</div>
                                        <div className="text-[12px] text-ink-2 mt-0.5">{t("passes.path")}</div>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <Skyplot rec={rec} observer={observer} pass={sel} now={look} title={t("passes.skyplot")}
                                        labels={{ n: t("compass.N"), e: t("compass.E"), s: t("compass.S"), w: t("compass.W") }} />
                                    <p className="mt-1 text-[12px] text-ink-3 text-center">{t("passes.skyplotLegend")}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    <Button size="sm" variant="tinted" onClick={() => seek(new Date(sel.aosTime.getTime() - 60_000))}>
                                        {t("passes.jumpTo")}
                                    </Button>
                                    <Button size="sm" variant="tinted" icon={<CalendarPlus size={15} weight="bold" />}
                                        onClick={() => addToCalendar(obj.id, obj.name, sel)}>
                                        {t("calendar.add")}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <ul className="mt-3">
                        {list.slice(0, 8).map((p, i) => (
                            <li key={p.aosTime.getTime()}>
                                <button type="button" onClick={() => setPicked(i)}
                                    className={cx("w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-[10px] text-left transition-colors",
                                        i === picked ? "bg-accent-soft" : "hover:bg-fill")}>
                                    <span className={cx("h-8 w-1 rounded-full", p.visible ? "bg-green" : "bg-accent")}
                                        style={{ opacity: 0.35 + 0.65 * (p.maxElevation / 90) }} />
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[15px] font-semibold">{f.time(p.aosTime, false)}</span>
                                        <span className="block text-[12px] text-ink-2">{f.date(p.aosTime)} · {f.duration(p.duration)}</span>
                                    </span>
                                    <span className="text-[15px] font-semibold">{f.num(p.maxElevation, 0)}°</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Card>
    );
}
