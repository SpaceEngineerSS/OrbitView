"use client";

import { useMemo, useState } from "react";
import type { SpaceObject } from "@/lib/space-objects";
import { getSatrec } from "@/lib/orbit";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { usePasses } from "@/hooks/useAnalysis";
import { useAppStore } from "@/store/appStore";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useTimelineStore } from "@/store/timelineStore";
import { Section, Note } from "@/components/ui/Panel";
import { cx } from "@/components/ui/cx";
import Skyplot from "./Skyplot";
import ObserverPrompt from "./ObserverPrompt";

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export default function PassesModule({ obj }: { obj: SpaceObject }) {
    const t = useT();
    const f = useFormat();
    const observer = useAppStore((s) => s.observer);
    const minEl = useAppStore((s) => s.settings.minElevation);
    const passes = usePasses(obj, observer);
    const look = useTelemetryStore((s) => (s.telemetry?.id === obj.id ? s.telemetry.look : null));
    const seek = useTimelineStore((s) => s.seek);
    const [picked, setPicked] = useState<number>(0);

    const rec = useMemo(() => (obj.tle ? getSatrec(obj.tle.line1, obj.tle.line2) : null), [obj]);
    const list = passes.status === "ready" ? passes.data : [];
    const current = list[Math.min(picked, Math.max(0, list.length - 1))] ?? null;
    const dir = (az: number) => t(`compass.${COMPASS[Math.round(az / 45) % 8]}`);

    if (!observer) return <Section><ObserverPrompt /></Section>;

    return (
        <>
            <Section title={t("passes.skyplot")} aside={current ? f.dateTime(current.aosTime) : undefined}>
                {rec && (
                    <Skyplot
                        rec={rec}
                        observer={observer}
                        pass={current}
                        now={look}
                        title={t("passes.skyplot")}
                        labels={{ n: t("compass.N"), e: t("compass.E"), s: t("compass.S"), w: t("compass.W") }}
                    />
                )}
                <p className="mt-2 text-[11px] text-faint text-center">{t("passes.skyplotLegend")}</p>
            </Section>

            <Section title={t("passes.title")} aside={t("passes.window", { el: minEl })}>
                {passes.status === "loading" && <p className="text-[12px] text-dim">{t("passes.computing")}</p>}
                {passes.status === "error" && <Note tone="warn">{t("errors.computation")}</Note>}
                {passes.status === "ready" && list.length === 0 && <p className="text-[12px] text-dim">{t("passes.noneIn48h")}</p>}
                {list.length > 0 && (
                    <table className="w-full text-[12px]">
                        <thead>
                            <tr className="text-left">
                                <th className="label font-medium pb-1.5">{t("passes.aos")}</th>
                                <th className="label font-medium pb-1.5 text-right">{t("passes.maxEl")}</th>
                                <th className="label font-medium pb-1.5 text-right">{t("passes.duration")}</th>
                                <th className="label font-medium pb-1.5 text-right">{t("passes.path")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((p, i) => (
                                <tr
                                    key={p.aosTime.getTime()}
                                    onClick={() => setPicked(i)}
                                    className={cx("cursor-pointer border-t border-rule/70", i === picked ? "text-ink" : "text-dim hover:text-ink")}
                                    aria-selected={i === picked}
                                >
                                    <td className="num py-1.5">
                                        {i === picked && <span aria-hidden className="inline-block w-1 h-3 bg-accent mr-1.5 align-[-2px]" />}
                                        <span className="text-faint">{f.date(p.aosTime)}</span> {f.time(p.aosTime, false)}
                                        {p.startsBeforeWindow && <span className="text-faint"> *</span>}
                                    </td>
                                    <td className={cx("num py-1.5 text-right", p.maxElevation >= 45 && "text-accent")}>{f.num(p.maxElevation, 0)}°</td>
                                    <td className="num py-1.5 text-right">{f.duration(p.duration)}</td>
                                    <td className="num py-1.5 text-right">
                                        {dir(p.azimuthAOS)}→{dir(p.azimuthLOS)}
                                        {p.visible && <span className="ml-1.5 text-accent" title={t("passes.visibleHint")}>{t("passes.visibleShort")}</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {current && (
                    <div className="mt-3 flex justify-end">
                        <button
                            type="button"
                            onClick={() => seek(new Date(current.aosTime.getTime() - 60_000))}
                            className="text-[12px] text-accent hover:underline underline-offset-2"
                        >
                            {t("passes.jumpTo")}
                        </button>
                    </div>
                )}
            </Section>

            <div className="px-3 pb-3">
                <Note>{t("passes.note")}</Note>
            </div>
        </>
    );
}
