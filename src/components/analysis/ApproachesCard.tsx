"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Target, CircleNotch } from "@phosphor-icons/react";
import type { SpaceObject } from "@/lib/space-objects";
import type { ConjunctionEvent } from "@/lib/ConjunctionAnalysis";
import { getEngine } from "@/lib/propagation";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { useAppStore } from "@/store/appStore";
import { useTimelineStore } from "@/store/timelineStore";
import { Card, Note } from "@/components/ui/Card";
import { Badge, type Tone } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { InfoButton } from "@/components/ui/Dialog";

type RunState =
    | { status: "idle" }
    | { status: "running" }
    | { status: "done"; events: ConjunctionEvent[]; ms: number }
    | { status: "error" };

const RISK: Record<ConjunctionEvent["riskLevel"], Tone> = { critical: "red", high: "orange", medium: "accent", low: "muted" };

/** Close-approach screen against the loaded catalog; heavy, so it only runs on request. */
export default function ApproachesCard({ obj, index }: { obj: SpaceObject; index: number }) {
    const t = useT();
    const f = useFormat();
    const select = useAppStore((s) => s.select);
    const seek = useTimelineStore((s) => s.seek);
    const [threshold, setThreshold] = useState(10);
    const [hours, setHours] = useState(24);
    const [run, setRun] = useState<RunState>({ status: "idle" });

    useEffect(() => { setRun({ status: "idle" }); }, [obj.id, threshold, hours]);

    const start = () => {
        const from = useTimelineStore.getState().currentTime;
        const t0 = performance.now();
        setRun({ status: "running" });
        getEngine().conjunctions(obj.id, from, hours, threshold)
            .then((events) => setRun({ status: "done", events, ms: performance.now() - t0 }))
            .catch(() => setRun({ status: "error" }));
    };

    return (
        <Card
            index={index}
            title={t("conj.title")}
            icon={<Target size={16} weight="bold" />}
            action={<InfoButton title={t("conj.title")} closeLabel={t("common.close")}><p>{t("conj.note")}</p></InfoButton>}
        >
            <Note>{t("conj.idle")}</Note>
            <div className="flex flex-wrap gap-2 mt-3">
                <Segmented size="sm" label={t("conj.threshold")} value={threshold} onChange={setThreshold}
                    options={[5, 10, 25].map((v) => ({ value: v, label: `${v} km` }))} />
                <Segmented size="sm" label={t("conj.window")} value={hours} onChange={setHours}
                    options={[12, 24, 72].map((v) => ({ value: v, label: `${v} h` }))} />
            </div>
            <Button variant="filled" className="w-full mt-3" onClick={start} disabled={run.status === "running"}
                icon={run.status === "running" ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : undefined}>
                {run.status === "running" ? t("conj.running") : t("conj.run")}
            </Button>

            <AnimatePresence initial={false}>
                {run.status === "done" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 36 }} className="overflow-hidden">
                        <div className="flex justify-between mt-4 mb-1 text-[12px] text-ink-3">
                            <span>{t("conj.results")}</span>
                            <span>{t("conj.took", { s: f.num(run.ms / 1000, 1) ?? "" })}</span>
                        </div>
                        {run.events.length === 0 && <Note>{t("conj.none", { km: threshold, h: hours })}</Note>}
                        <ul>
                            {run.events.map((e, i) => (
                                <motion.li key={e.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }} className="py-2.5 border-t border-separator first:border-t-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <button type="button" onClick={() => select(e.secondaryObject.noradId)}
                                            className="min-w-0 text-left text-[15px] font-semibold hover:text-accent truncate">
                                            {e.secondaryObject.name}
                                        </button>
                                        <Badge tone={RISK[e.riskLevel]}>{f.num(e.minRangeKm, 2)} km</Badge>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-0.5 text-[12.5px] text-ink-2">
                                        <button type="button" className="hover:text-accent" onClick={() => seek(new Date(e.tca.getTime() - 120_000))}>
                                            {f.dateTime(e.tca)}
                                        </button>
                                        <span>{t(`conj.kind.${e.secondaryObject.type}`)} · Δv {f.num(e.relativeVelocityKmS, 1)} km/s</span>
                                    </div>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
            {run.status === "error" && <Note className="mt-3">{t("errors.computation")}</Note>}
        </Card>
    );
}
