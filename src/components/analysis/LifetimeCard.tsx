"use client";

import { useEffect, useMemo, useState } from "react";
import { Hourglass } from "@phosphor-icons/react";
import type { SpaceObject } from "@/lib/space-objects";
import { predictOrbitalDecay, lifetimeParts, DECAY_HORIZON_DAYS } from "@/lib/OrbitalDecay";
import { fetchSpaceWeather, type SpaceWeatherData } from "@/lib/SpaceWeather";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { useElements } from "@/hooks/useAnalysis";
import { useSimTimeBucket } from "@/store/timelineStore";
import { Card, Row, Note } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Stat";
import { InfoButton } from "@/components/ui/Dialog";
import { RangeBar } from "./viz";
import { isStation } from "@/lib/catalog";

function AltitudeChart({ history, label }: { history: { days: number; altitude: number }[]; label: string }) {
    if (history.length < 2) return null;
    const W = 300, H = 90, P = 4;
    const dMax = history[history.length - 1].days || 1;
    const hMax = Math.max(...history.map((p) => p.altitude)), hMin = 120;
    const x = (d: number) => P + (d / dMax) * (W - 2 * P);
    const y = (h: number) => P + (1 - (h - hMin) / Math.max(1, hMax - hMin)) * (H - 2 * P);
    const line = history.map((p, i) => `${i ? "L" : "M"}${x(p.days).toFixed(1)},${y(p.altitude).toFixed(1)}`).join(" ");
    const area = `${line} L${x(dMax)},${H} L${x(0)},${H} Z`;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" role="img" aria-label={label}>
            <path d={area} fill="var(--orange-soft)" />
            <path d={line} fill="none" stroke="var(--orange)" strokeWidth={2.4} strokeLinecap="round" />
        </svg>
    );
}

export default function LifetimeCard({ obj, index }: { obj: SpaceObject; index: number }) {
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

    const decay = useMemo(() => (el ? predictOrbitalDecay(el.semiMajorAxisKm, el.eccentricity, el.bstar, new Date(day)) : null), [el, day]);
    if (!el || !decay) return null;

    const fmt = (days: number) => {
        const p = lifetimeParts(days);
        return t(`lifetime.unit.${p.unit}`, { n: f.num(p.value, p.unit === "year" ? 1 : 0) ?? "" });
    };
    // Stations and constellations re-boost; drag alone says little about them.
    const manoeuvres = isStation(obj) || /^STARLINK|^ONEWEB/i.test(obj.name);
    const tone = decay.riskLevel === "critical" ? "red" : decay.riskLevel === "high" ? "orange" : decay.riskLevel === "medium" ? "orange" : "green";

    return (
        <Card
            index={index}
            title={t("lifetime.title")}
            icon={<Hourglass size={16} weight="bold" />}
            action={<InfoButton title={t("lifetime.title")} closeLabel={t("common.close")}><p>{t("lifetime.note")}</p></InfoButton>}
        >
            {manoeuvres && <Note className="mb-3 rounded-[12px] bg-orange-soft text-orange px-3 py-2">{t("lifetime.manoeuvres")}</Note>}
            {decay.dragUnknown ? (
                <Note>{t("lifetime.dragUnknown")}</Note>
            ) : (
                <>
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <div className="figure text-[34px]">{decay.beyondHorizon ? fmt(Infinity) : `≈ ${fmt(decay.estimatedLifetimeDays)}`}</div>
                            <div className="mt-1 text-[13px] text-ink-2">
                                {decay.estimatedReentryDate
                                    ? t("lifetime.reentryAround", { d: decay.estimatedReentryDate.toISOString().slice(0, 7) })
                                    : t("lifetime.estimate")}
                            </div>
                        </div>
                        <Badge tone={tone}>{t(`lifetime.risk.${decay.riskLevel}`)}</Badge>
                    </div>
                    {!decay.beyondHorizon && (
                        <div className="mt-4">
                            <RangeBar min={decay.lifetimeRangeDays.min} value={decay.estimatedLifetimeDays} max={decay.lifetimeRangeDays.max}
                                maxScale={DECAY_HORIZON_DAYS} label={t("lifetime.range")} />
                            <div className="flex justify-between mt-1.5 text-[12px] text-ink-2">
                                <span>{fmt(decay.lifetimeRangeDays.min)}</span>
                                <span>{t("lifetime.range")}</span>
                                <span>{fmt(decay.lifetimeRangeDays.max)}</span>
                            </div>
                        </div>
                    )}
                    {decay.altitudeHistory.length > 1 && !decay.beyondHorizon && (
                        <div className="mt-4">
                            <div className="text-[13px] font-semibold text-ink-2 mb-1.5">{t("lifetime.chart")}</div>
                            <AltitudeChart history={decay.altitudeHistory} label={t("lifetime.chart")} />
                        </div>
                    )}
                    <div className="mt-3">
                        <Row label={t("lifetime.decayRate")} value={f.num(decay.decayRateKmPerDay * 1000, decay.decayRateKmPerDay < 0.01 ? 2 : 0)} unit={t("units.mPerDay")} />
                        <Row label={t("lifetime.density")} value={decay.currentDensity.toExponential(2)} unit="kg/m³" />
                        <Row label={t("lifetime.ballistic")} value={f.num(decay.ballisticCoefficient, 4)} unit="m²/kg" />
                    </div>
                </>
            )}

            <div className="mt-3 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink-2">{t("lifetime.spaceWeather")}</span>
                <span className="text-[12px] text-ink-3">{weather ? (weather.isFallback ? t("lifetime.noLiveData") : t("lifetime.noaaLive")) : ""}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge tone={weather?.f107IsLive ? "default" : "muted"}>F10.7 {weather?.f107IsLive ? f.num(weather.f107, 0) : "—"}</Badge>
                <Badge tone={weather?.f107IsLive ? "default" : "muted"}>{t("lifetime.f107avg")} {weather?.f107IsLive ? f.num(weather.f107Average, 0) : "—"}</Badge>
                <Badge tone={weather?.kpIsLive ? (weather.kpIndex >= 5 ? "red" : weather.kpIndex >= 4 ? "orange" : "default") : "muted"}>
                    Kp {weather?.kpIsLive ? f.num(weather.kpIndex, 1) : "—"}
                </Badge>
            </div>
        </Card>
    );
}
