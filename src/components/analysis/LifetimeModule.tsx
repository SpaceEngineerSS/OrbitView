"use client";

import { useEffect, useMemo, useState } from "react";
import type { SpaceObject } from "@/lib/space-objects";
import { predictOrbitalDecay, lifetimeParts } from "@/lib/OrbitalDecay";
import { fetchSpaceWeather, type SpaceWeatherData } from "@/lib/SpaceWeather";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { useElements } from "@/hooks/useAnalysis";
import { useSimTimeBucket } from "@/store/timelineStore";
import { Readout, Row } from "@/components/ui/Readout";
import { Section, Note } from "@/components/ui/Panel";

function AltitudeChart({ history, label }: { history: { days: number; altitude: number }[]; label: string }) {
    if (history.length < 2) return null;
    const W = 280, H = 120, L = 30, B = 16, P = 6;
    const dMax = history[history.length - 1].days || 1;
    const hMax = Math.max(...history.map((p) => p.altitude));
    const hMin = 120;
    const x = (d: number) => L + (d / dMax) * (W - L - P);
    const y = (h: number) => P + (1 - (h - hMin) / Math.max(1, hMax - hMin)) * (H - B - P);
    const ticks = [hMin, Math.round((hMin + hMax) / 2), Math.round(hMax)];
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
            {ticks.map((h) => (
                <g key={h}>
                    <line x1={L} x2={W - P} y1={y(h)} y2={y(h)} stroke="var(--c-rule)" strokeWidth={0.6} strokeDasharray="2 3" />
                    <text x={L - 4} y={y(h) + 3} textAnchor="end" fontSize="8" className="num" fill="var(--c-text-faint)">{h}</text>
                </g>
            ))}
            <line x1={L} x2={W - P} y1={H - B} y2={H - B} stroke="var(--c-rule-strong)" strokeWidth={0.8} />
            <polyline
                points={history.map((p) => `${x(p.days).toFixed(1)},${y(p.altitude).toFixed(1)}`).join(" ")}
                fill="none" stroke="var(--c-accent)" strokeWidth={1.4}
            />
        </svg>
    );
}

export default function LifetimeModule({ obj }: { obj: SpaceObject }) {
    const t = useT();
    const f = useFormat();
    const el = useElements(obj);
    const day = useSimTimeBucket(86_400_000);
    const [weather, setWeather] = useState<SpaceWeatherData | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetchSpaceWeather().then((w) => { if (!cancelled) setWeather(w); });
        return () => { cancelled = true; };
    }, []);

    const decay = useMemo(
        () => (el ? predictOrbitalDecay(el.semiMajorAxisKm, el.eccentricity, el.bstar, new Date(day)) : null),
        [el, day]
    );

    if (!el || !decay) return <Section><Note>{t("errors.noTle")}</Note></Section>;

    const fmtLife = (days: number) => {
        const p = lifetimeParts(days);
        return t(`lifetime.unit.${p.unit}`, { n: f.num(p.value, p.unit === "year" ? 1 : 0) ?? "" });
    };

    return (
        <>
            <Section title={t("lifetime.title")}>
                {decay.dragUnknown ? (
                    <Note>{t("lifetime.dragUnknown")}</Note>
                ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <Readout className="col-span-2" size="lg" label={t("lifetime.estimate")} value={`≈ ${fmtLife(decay.estimatedLifetimeDays)}`} tone="accent" />
                        <Readout
                            className="col-span-2"
                            label={t("lifetime.range")}
                            value={decay.beyondHorizon ? fmtLife(Infinity) : `${fmtLife(decay.lifetimeRangeDays.min)} – ${fmtLife(decay.lifetimeRangeDays.max)}`}
                        />
                        <Readout label={t("lifetime.decayRate")} value={f.num(decay.decayRateKmPerDay * 1000, decay.decayRateKmPerDay < 0.01 ? 2 : 0)} unit={t("units.mPerDay")} />
                        <Readout label={t("lifetime.reentry")} value={decay.estimatedReentryDate ? `≈ ${decay.estimatedReentryDate.toISOString().slice(0, 7)}` : null} />
                    </div>
                )}
            </Section>

            {!decay.dragUnknown && decay.altitudeHistory.length > 1 && (
                <Section title={t("lifetime.chart")} aside={t("lifetime.chartAxis")}>
                    <AltitudeChart history={decay.altitudeHistory} label={t("lifetime.chart")} />
                </Section>
            )}

            <Section title={t("lifetime.inputs")}>
                <Row label={t("elements.perigee")} value={f.num(decay.perigeeAltitudeKm, 0)} unit="km" />
                <Row label={t("lifetime.density")} value={decay.currentDensity.toExponential(2)} unit="kg/m³" />
                <Row label={t("lifetime.ballistic")} value={f.num(decay.ballisticCoefficient, 4)} unit="m²/kg" />
            </Section>

            <Section title={t("lifetime.spaceWeather")} aside={weather ? (weather.isFallback ? t("lifetime.noLiveData") : t("lifetime.noaaLive")) : undefined}>
                <Row label="F10.7" value={weather?.f107IsLive ? f.num(weather.f107, 0) : null} unit="sfu" />
                <Row label={t("lifetime.f107avg")} value={weather?.f107IsLive ? f.num(weather.f107Average, 0) : null} unit="sfu" />
                <Row label="Kp" value={weather?.kpIsLive ? f.num(weather.kpIndex, 1) : null} />
            </Section>

            <div className="px-3 pb-3"><Note>{t("lifetime.note")}</Note></div>
        </>
    );
}
