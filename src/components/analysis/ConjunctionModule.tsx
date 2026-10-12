"use client";

import { useEffect, useState } from "react";
import type { SpaceObject } from "@/lib/space-objects";
import type { ConjunctionEvent } from "@/lib/ConjunctionAnalysis";
import { getEngine } from "@/lib/propagation";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { useAppStore } from "@/store/appStore";
import { useTimelineStore } from "@/store/timelineStore";
import { Section, Note } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { cx } from "@/components/ui/cx";

type RunState =
    | { status: "idle" }
    | { status: "running" }
    | { status: "done"; events: ConjunctionEvent[]; start: number; ms: number }
    | { status: "error" };

const RISK_TONE: Record<ConjunctionEvent["riskLevel"], string> = {
    critical: "text-alert",
    high: "text-warn",
    medium: "text-accent",
    low: "text-dim",
};

/**
 * Close-approach screen against the loaded catalog. It's a heavy job (tens of
 * thousands of propagations), so it only runs when asked.
 */
export default function ConjunctionModule({ obj }: { obj: SpaceObject }) {
    const t = useT();
    const f = useFormat();
    const select = useAppStore((s) => s.select);
    const seek = useTimelineStore((s) => s.seek);
    const [threshold, setThreshold] = useState(10);
    const [hours, setHours] = useState(24);
    const [run, setRun] = useState<RunState>({ status: "idle" });

    // A new object or new settings invalidate the previous result.
    useEffect(() => { setRun({ status: "idle" }); }, [obj.id, threshold, hours]);

    const start = () => {
        const from = useTimelineStore.getState().currentTime;
        const t0 = performance.now();
        setRun({ status: "running" });
        getEngine().conjunctions(obj.id, from, hours, threshold)
            .then((events) => setRun({ status: "done", events, start: from.getTime(), ms: performance.now() - t0 }))
            .catch(() => setRun({ status: "error" }));
    };

    return (
        <>
            <Section title={t("conj.setup")}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] text-dim">{t("conj.threshold")}</span>
                        <Segmented label={t("conj.threshold")} value={threshold} onChange={setThreshold}
                            options={[5, 10, 25].map((v) => ({ value: v, label: `${v} km` }))} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] text-dim">{t("conj.window")}</span>
                        <Segmented label={t("conj.window")} value={hours} onChange={setHours}
                            options={[12, 24, 72].map((v) => ({ value: v, label: `${v} h` }))} />
                    </div>
                </div>
                <div className="mt-3">
                    <Button variant="accent" size="sm" onClick={start} disabled={run.status === "running"}>
                        {run.status === "running" ? t("conj.running") : t("conj.run")}
                    </Button>
                </div>
            </Section>

            <Section
                title={t("conj.results")}
                aside={run.status === "done" ? t("conj.took", { s: f.num(run.ms / 1000, 1) ?? "" }) : undefined}
            >
                {run.status === "idle" && <p className="text-[12px] text-dim">{t("conj.idle")}</p>}
                {run.status === "running" && <p className="text-[12px] text-dim">{t("conj.runningHint")}</p>}
                {run.status === "error" && <Note tone="warn">{t("errors.computation")}</Note>}
                {run.status === "done" && run.events.length === 0 && (
                    <p className="text-[12px] text-dim">{t("conj.none", { km: threshold, h: hours })}</p>
                )}
                {run.status === "done" && run.events.length > 0 && (
                    <ul className="divide-y divide-rule/70">
                        {run.events.map((e) => (
                            <li key={e.id} className="py-2">
                                <div className="flex items-baseline justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => select(e.secondaryObject.noradId)}
                                        className="text-[13px] text-ink hover:text-accent truncate text-left"
                                    >
                                        {e.secondaryObject.name}
                                        <span className="num text-[11px] text-faint ml-1.5">{e.secondaryObject.noradId}</span>
                                    </button>
                                    <span className={cx("num text-[13px] shrink-0", RISK_TONE[e.riskLevel])}>{f.num(e.minRangeKm, 2)} km</span>
                                </div>
                                <div className="flex items-baseline justify-between gap-2 mt-0.5 text-[11.5px] text-dim">
                                    <button type="button" className="num hover:text-ink" onClick={() => seek(new Date(e.tca.getTime() - 120_000))}>
                                        TCA {f.dateTime(e.tca)}
                                    </button>
                                    <span className="num">{t("conj.relSpeed")} {f.num(e.relativeVelocityKmS, 2)} km/s · {t(`conj.kind.${e.secondaryObject.type}`)}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            <div className="px-3 pb-3"><Note>{t("conj.note")}</Note></div>
        </>
    );
}
