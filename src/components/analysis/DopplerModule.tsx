"use client";

import { useMemo, useState } from "react";
import type { SpaceObject } from "@/lib/space-objects";
import { getSatrec } from "@/lib/orbit";
import { computeDoppler, COMMON_FREQUENCIES } from "@/lib/DopplerCalculator";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { usePasses } from "@/hooks/useAnalysis";
import { useAppStore } from "@/store/appStore";
import { useTimelineStore } from "@/store/timelineStore";
import { Readout } from "@/components/ui/Readout";
import { Section, Note } from "@/components/ui/Panel";
import { TextInput } from "@/components/ui/Controls";
import { cx } from "@/components/ui/cx";
import ObserverPrompt from "./ObserverPrompt";

const PRESETS: { key: string; hz: number }[] = [
    { key: "issVoice", hz: COMMON_FREQUENCIES.ISS_VOICE },
    { key: "issAprs", hz: COMMON_FREQUENCIES.ISS_PACKET },
    { key: "noaaApt", hz: COMMON_FREQUENCIES.NOAA_APT },
    { key: "meteorLrpt", hz: COMMON_FREQUENCIES.METEOR_LRPT },
    { key: "gpsL1", hz: COMMON_FREQUENCIES.GPS_L1 },
    { key: "kuBand", hz: COMMON_FREQUENCIES.STARLINK_KU },
];

/** Shift (Hz) across one pass, sampled every few seconds. */
function DopplerCurve({ points, label }: { points: { t: number; hz: number }[]; label: string }) {
    if (points.length < 2) return null;
    const t0 = points[0].t, t1 = points[points.length - 1].t;
    const max = Math.max(...points.map((p) => Math.abs(p.hz))) || 1;
    const W = 280, H = 110, P = 6;
    const x = (t: number) => P + ((t - t0) / (t1 - t0)) * (W - 2 * P);
    const y = (hz: number) => H / 2 - (hz / max) * (H / 2 - P);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
            <line x1={P} x2={W - P} y1={H / 2} y2={H / 2} stroke="var(--c-rule-strong)" strokeWidth={0.8} />
            {[0.25, 0.5, 0.75].map((k) => (
                <line key={k} x1={P + k * (W - 2 * P)} x2={P + k * (W - 2 * P)} y1={P} y2={H - P} stroke="var(--c-rule)" strokeWidth={0.6} strokeDasharray="2 3" />
            ))}
            <polyline
                points={points.map((p) => `${x(p.t).toFixed(1)},${y(p.hz).toFixed(1)}`).join(" ")}
                fill="none" stroke="var(--c-accent)" strokeWidth={1.4}
            />
        </svg>
    );
}

export default function DopplerModule({ obj }: { obj: SpaceObject }) {
    const t = useT();
    const f = useFormat();
    const observer = useAppStore((s) => s.observer);
    const passes = usePasses(obj, observer);
    const simMs = useTimelineStore((s) => Math.floor(s.currentTime.getTime() / 1000) * 1000);
    const [hz, setHz] = useState<number>(COMMON_FREQUENCIES.ISS_VOICE);
    const [draft, setDraft] = useState<string>((COMMON_FREQUENCIES.ISS_VOICE / 1e6).toFixed(3));

    const rec = useMemo(() => (obj.tle ? getSatrec(obj.tle.line1, obj.tle.line2) : null), [obj]);
    const live = useMemo(
        () => (rec && observer ? computeDoppler(rec, new Date(simMs), observer, hz) : null),
        [rec, observer, simMs, hz]
    );

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

    if (!observer) return <Section><ObserverPrompt /></Section>;

    const commit = () => {
        const v = parseFloat(draft.replace(",", "."));
        if (Number.isFinite(v) && v > 0 && v < 100_000) setHz(v * 1e6);
        else setDraft((hz / 1e6).toFixed(3));
    };

    const shiftKHz = live ? live.dopplerShiftHz / 1000 : null;

    return (
        <>
            <Section title={t("doppler.frequency")}>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {PRESETS.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => { setHz(p.hz); setDraft((p.hz / 1e6).toFixed(3)); }}
                            className={cx(
                                "h-7 px-2 border rounded-[2px] text-[11.5px] transition-colors duration-[140ms]",
                                hz === p.hz ? "border-accent text-accent" : "border-rule-strong text-dim hover:text-ink"
                            )}
                        >
                            {t(`doppler.presets.${p.key}`)}
                        </button>
                    ))}
                </div>
                <label className="flex items-center gap-2">
                    <TextInput
                        inputMode="decimal"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
                        aria-label={t("doppler.customMHz")}
                        className="num max-w-[160px]"
                    />
                    <span className="text-[12px] text-dim">MHz</span>
                </label>
            </Section>

            <Section title={t("doppler.now")} aside={live && !live.aboveHorizon ? t("doppler.belowHorizon") : undefined}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Readout
                        className="col-span-2"
                        size="lg"
                        label={t("doppler.received")}
                        value={live ? f.num(live.receivedFreqHz / 1e6, 6) : null}
                        unit="MHz"
                        tone={live?.aboveHorizon ? "accent" : "dim"}
                    />
                    <Readout label={t("doppler.shift")} value={f.signed(shiftKHz, 3)} unit="kHz" tone={live?.aboveHorizon ? "default" : "dim"} />
                    <Readout label={t("doppler.rangeRate")} value={f.signed(live ? live.rangeRateMps / 1000 : null, 3)} unit="km/s"
                        hint={live ? (live.isApproaching ? t("doppler.approaching") : t("doppler.receding")) : undefined} />
                    <Readout label={t("look.elevation")} value={f.num(live?.elevationDeg, 1)} unit="°" />
                </div>
            </Section>

            {pass && curve.length > 1 && (
                <Section title={t("doppler.curveTitle")} aside={`${f.time(pass.aosTime, false)}–${f.time(pass.losTime, false)}`}>
                    <DopplerCurve points={curve} label={t("doppler.curveTitle")} />
                    <div className="flex justify-between num text-[11px] text-dim mt-1">
                        <span>{f.signed(curve[0].hz / 1000, 2)} kHz</span>
                        <span>{f.signed(curve[curve.length - 1].hz / 1000, 2)} kHz</span>
                    </div>
                </Section>
            )}

            <div className="px-3 pb-3"><Note>{t("doppler.note")}</Note></div>
        </>
    );
}
