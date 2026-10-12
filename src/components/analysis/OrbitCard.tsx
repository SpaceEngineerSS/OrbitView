"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Planet, CaretDown } from "@phosphor-icons/react";
import type { SpaceObject } from "@/lib/space-objects";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { useElements } from "@/hooks/useAnalysis";
import { useTimelineStore } from "@/store/timelineStore";
import { getSatrec, stateAt, type Vec3 } from "@/lib/orbit";
import { Segmented } from "@/components/ui/Controls";
import { Card, Row, Note } from "@/components/ui/Card";
import { Stat, Badge } from "@/components/ui/Stat";
import { InfoButton } from "@/components/ui/Dialog";
import { OrbitShape } from "./viz";

export default function OrbitCard({ obj, index }: { obj: SpaceObject; index: number }) {
    const t = useT();
    const f = useFormat();
    const el = useElements(obj);
    const day = useTimelineStore((s) => Math.floor(s.currentTime.getTime() / 3_600_000));
    const [open, setOpen] = useState(false);
    const [vecOpen, setVecOpen] = useState(false);
    const [frame, setFrame] = useState<"teme" | "ecef">("teme");
    const [copied, setCopied] = useState(false);
    const second = useTimelineStore((s) => Math.floor(s.currentTime.getTime() / 1000) * 1000);
    const rec = useMemo(() => (obj.tle ? getSatrec(obj.tle.line1, obj.tle.line2) : null), [obj]);
    const state = useMemo(() => (vecOpen && rec ? stateAt(rec, new Date(second)) : null), [vecOpen, rec, second]);
    if (!el) return null;

    const r: Vec3 | undefined = state ? (frame === "teme" ? state.positionEci : state.positionEcf) : undefined;
    const v: Vec3 | undefined = state ? (frame === "teme" ? state.velocityEci : state.velocityEcf) : undefined;
    const copyVector = async () => {
        if (!r || !v) return;
        const line = [new Date(second).toISOString(), frame.toUpperCase(), r.x, r.y, r.z, v.x, v.y, v.z].map((x) => typeof x === "number" ? x.toFixed(6) : x).join(",");
        try { await navigator.clipboard.writeText(line); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ }
    };

    const ageDays = (day * 3_600_000 - el.epoch.getTime()) / 86_400_000;
    const ageTone = Math.abs(ageDays) > 14 ? "red" : Math.abs(ageDays) > 3 ? "orange" : "green";

    return (
        <Card
            index={index}
            title={t("orbit.title")}
            icon={<Planet size={16} weight="bold" />}
            action={<InfoButton title={t("orbit.title")} closeLabel={t("common.close")}><p>{t("elements.note")}</p></InfoButton>}
        >
            <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <Stat size="sm" label={t("elements.perigee")} value={el.perigeeAltKm} format={(v) => f.num(v, 0) ?? ""} unit="km" tone="orange" />
                    <Stat size="sm" label={t("elements.apogee")} value={el.apogeeAltKm} format={(v) => f.num(v, 0) ?? ""} unit="km" tone="green" />
                    <Stat size="sm" label={t("elements.inclination")} value={el.inclinationDeg} format={(v) => `${f.num(v, 1)}°`} />
                    <Stat size="sm" label={t("elements.period")} value={el.periodMin} format={(v) => f.num(v, 1) ?? ""} unit={t("units.min")} />
                </div>
                <div className="w-[110px]">
                    <OrbitShape perigeeKm={el.perigeeAltKm} apogeeKm={el.apogeeAltKm} inclinationDeg={el.inclinationDeg} label={t("orbit.shape")} />
                </div>
            </div>

            <div className="flex items-center justify-between mt-4">
                <span className="text-[14px] text-ink-2">{t("elements.tleAge")}</span>
                <Badge tone={ageTone}>{t("orbit.ageDays", { n: f.num(Math.abs(ageDays), 1) ?? "" })}</Badge>
            </div>
            {Math.abs(ageDays) > 14 && <Note className="mt-2">{t("overview.oldTle", { d: Math.round(ageDays) })}</Note>}

            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
                className="mt-3 w-full flex items-center justify-between py-2 text-[14px] font-semibold text-accent">
                {t("orbit.meanElements")}
                <motion.span animate={{ rotate: open ? 180 : 0 }}><CaretDown size={16} weight="bold" /></motion.span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 38 }} className="overflow-hidden">
                        <Row label={t("elements.epoch", { d: "" }).trim()} value={el.epoch.toISOString().replace("T", " ").slice(0, 19)} unit="UTC" />
                        <Row label={t("elements.semiMajorAxis")} value={f.num(el.semiMajorAxisKm, 1)} unit="km" />
                        <Row label={t("elements.eccentricity")} value={f.num(el.eccentricity, 6)} />
                        <Row label={t("elements.raan")} value={f.num(el.raanDeg, 4)} unit="°" />
                        <Row label={t("elements.argPerigee")} value={f.num(el.argPerigeeDeg, 4)} unit="°" />
                        <Row label={t("elements.meanAnomaly")} value={f.num(el.meanAnomalyDeg, 4)} unit="°" />
                        <Row label={t("elements.meanMotion")} value={f.num(el.meanMotionRevPerDay, 8)} unit={t("units.revPerDay")} />
                        <Row label={t("elements.bstar")} value={el.bstar.toExponential(4)} unit="1/ER" />
                    </motion.div>
                )}
            </AnimatePresence>

            <button type="button" onClick={() => setVecOpen((o) => !o)} aria-expanded={vecOpen}
                className="w-full flex items-center justify-between py-2 text-[14px] font-semibold text-accent">
                {t("orbit.stateVector")}
                <motion.span animate={{ rotate: vecOpen ? 180 : 0 }}><CaretDown size={16} weight="bold" /></motion.span>
            </button>
            <AnimatePresence initial={false}>
                {vecOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 38 }} className="overflow-hidden">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <Segmented size="sm" label={t("orbit.frame")} value={frame} onChange={setFrame}
                                options={[{ value: "teme", label: "TEME (ECI)" }, { value: "ecef", label: "ECEF" }]} />
                            <button type="button" onClick={copyVector} className="text-[13px] font-semibold text-accent">
                                {copied ? t("data.copied") : t("orbit.copy")}
                            </button>
                        </div>
                        <Row label="x" value={f.num(r?.x, 3)} unit="km" />
                        <Row label="y" value={f.num(r?.y, 3)} unit="km" />
                        <Row label="z" value={f.num(r?.z, 3)} unit="km" />
                        <Row label="vx" value={f.num(v?.x, 5)} unit="km/s" />
                        <Row label="vy" value={f.num(v?.y, 5)} unit="km/s" />
                        <Row label="vz" value={f.num(v?.z, 5)} unit="km/s" />
                        <Note className="mt-1">{t("orbit.frameNote")}</Note>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
