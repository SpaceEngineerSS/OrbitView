"use client";

import { useMemo, useState } from "react";
import { WaveSine } from "@phosphor-icons/react";
import type { SpaceObject } from "@/lib/space-objects";
import { getSatrec } from "@/lib/orbit";
import { computeDoppler, COMMON_FREQUENCIES } from "@/lib/DopplerCalculator";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { usePasses } from "@/hooks/useAnalysis";
import { useAppStore } from "@/store/appStore";
import { useTimelineStore } from "@/store/timelineStore";
import { Card, Row } from "@/components/ui/Card";
import { Stat, Badge } from "@/components/ui/Stat";
import { TextInput } from "@/components/ui/Controls";
import { InfoButton } from "@/components/ui/Dialog";
import { cx } from "@/components/ui/cx";

const PRESETS: { key: string; hz: number }[] = [
    { key: "issVoice", hz: COMMON_FREQUENCIES.ISS_VOICE },
    { key: "issAprs", hz: COMMON_FREQUENCIES.ISS_PACKET },
    { key: "noaaApt", hz: COMMON_FREQUENCIES.NOAA_APT },
    { key: "meteorLrpt", hz: COMMON_FREQUENCIES.METEOR_LRPT },
    { key: "gpsL1", hz: COMMON_FREQUENCIES.GPS_L1 },
    { key: "kuBand", hz: COMMON_FREQUENCIES.STARLINK_KU },
];

function Curve({ points, label }: { points: { t: number; hz: number }[]; label: string }) {
    if (points.length < 2) return null;
    const W = 300, H = 96, P = 8;
    const t0 = points[0].t, t1 = points[points.length - 1].t;
    const max = Math.max(...points.map((p) => Math.abs(p.hz))) || 1;
    const x = (t: number) => P + ((t - t0) / (t1 - t0)) * (W - 2 * P);
    const y = (hz: number) => H / 2 - (hz / max) * (H / 2 - P);
    const d = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.hz).toFixed(1)}`).join(" ");
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" role="img" aria-label={label}>
            <rect x={0} y={0} width={W} height={H / 2} fill="var(--green-soft)" opacity={0.5} rx={10} />
            <rect x={0} y={H / 2} width={W} height={H / 2} fill="var(--orange-soft)" opacity={0.5} rx={10} />
            <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="var(--separator)" strokeWidth={1.5} />
            <path d={d} fill="none" stroke="var(--text)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default function DopplerCard({ obj, index }: { obj: SpaceObject; index: number }) {
    const t = useT();
    const f = useFormat();
    const observer = useAppStore((s) => s.observer);
    const passes = usePasses(obj, observer);
    const simMs = useTimelineStore((s) => Math.floor(s.currentTime.getTime() / 1000) * 1000);
    const [hz, setHz] = useState<number>(COMMON_FREQUENCIES.ISS_VOICE);
    const [draft, setDraft] = useState((COMMON_FREQUENCIES.ISS_VOICE / 1e6).toFixed(3));

    const rec = useMemo(() => (obj.tle ? getSatrec(obj.tle.line1, obj.tle.line2) : null), [obj]);
    const live = useMemo(() => (rec && observer ? computeDoppler(rec, new Date(simMs), observer, hz) : null), [rec, observer, simMs, hz]);
    const pass = passes.status === "ready" ? passes.data[0] : undefined;
    const curve = useMemo(() => {
        if (!rec || !observer || !pass) return [];
        const pts: { t: number; hz: number }[] = [];
        const a = pass.aosTime.getTime(), b = pass.losTime.getTime();
        const step = Math.max(2000, (b - a) / 150);
        for (let tt = a; tt <= b; tt += step) {
            const d = computeDoppler(rec, new Date(tt), observer, hz);
            if (d) pts.push({ t: tt, hz: d.dopplerShiftHz });
        }
        return pts;
    }, [rec, observer, pass, hz]);

    if (!observer) return null;

    const commit = () => {
        const v = parseFloat(draft.replace(",", "."));
        if (Number.isFinite(v) && v > 0 && v < 100_000) setHz(v * 1e6);
        else setDraft((hz / 1e6).toFixed(3));
    };

    return (
        <Card
            index={index}
            title={t("doppler.title")}
            icon={<WaveSine size={16} weight="bold" />}
            action={<InfoButton title={t("doppler.title")} closeLabel={t("common.close")}><p>{t("doppler.note")}</p></InfoButton>}
        >
            <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none]">
                {PRESETS.map((p) => (
                    <button key={p.key} type="button"
                        onClick={() => { setHz(p.hz); setDraft((p.hz / 1e6).toFixed(3)); }}
                        className={cx("shrink-0 h-8 px-3 rounded-full text-[13px] font-semibold transition-colors",
                            hz === p.hz ? "bg-accent text-on-accent" : "bg-fill text-ink hover:bg-fill-strong")}>
                        {t(`doppler.presets.${p.key}`)}
                    </button>
                ))}
            </div>
            <label className="flex items-center gap-2 mt-2.5">
                <TextInput inputMode="decimal" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
                    onKeyDown={(e) => { if (e.key === "Enter") commit(); }} aria-label={t("doppler.customMHz")} className="max-w-[150px]" />
                <span className="text-[14px] text-ink-2">MHz</span>
            </label>

            <div className="mt-4">
                <div className="flex items-center gap-2 mb-1.5">
                    {live && (live.aboveHorizon
                        ? <Badge tone="green">{t("hero.aboveHorizon")}</Badge>
                        : <Badge>{t("doppler.belowHorizon")}</Badge>)}
                    {live && <Badge tone={live.isApproaching ? "green" : "orange"}>{live.isApproaching ? t("doppler.approaching") : t("doppler.receding")}</Badge>}
                </div>
                <Stat size="lg" label={t("doppler.received")} value={live ? live.receivedFreqHz / 1e6 : null}
                    format={(v) => f.num(v, 6) ?? ""} unit="MHz" tone={live?.aboveHorizon ? "default" : "muted"} />
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <Stat size="sm" label={t("doppler.shift")} value={live ? live.dopplerShiftHz / 1000 : null}
                        format={(v) => f.signed(v, 2) ?? ""} unit="kHz" />
                    <Stat size="sm" label={t("doppler.rangeRate")} value={live ? live.rangeRateMps / 1000 : null}
                        format={(v) => f.signed(v, 2) ?? ""} unit="km/s" />
                </div>
            </div>

            {/* A geostationary object has no meaningful shift curve. */}
            {pass && curve.length > 1 && Math.max(...curve.map((c) => Math.abs(c.hz))) > 50 && (
                <div className="mt-4">
                    <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-[13px] font-semibold text-ink-2">{t("doppler.curveTitle")}</span>
                        <span className="text-[12px] text-ink-3">{f.time(pass.aosTime, false)}–{f.time(pass.losTime, false)}</span>
                    </div>
                    <Curve points={curve} label={t("doppler.curveTitle")} />
                    <Row label={t("doppler.atRise")} value={f.signed(curve[0].hz / 1000, 2)} unit="kHz" />
                    <Row label={t("doppler.atSet")} value={f.signed(curve[curve.length - 1].hz / 1000, 2)} unit="kHz" />
                </div>
            )}
        </Card>
    );
}
