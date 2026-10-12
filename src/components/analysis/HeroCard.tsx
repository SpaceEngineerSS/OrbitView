"use client";

import { Sun, Moon, Eye } from "@phosphor-icons/react";
import type { SpaceObject } from "@/lib/space-objects";
import type { SatellitePass } from "@/lib/PassPrediction";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { usePasses, useElements } from "@/hooks/useAnalysis";
import { useAppStore } from "@/store/appStore";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useTimelineStore } from "@/store/timelineStore";
import { Card } from "@/components/ui/Card";
import { Stat, Badge } from "@/components/ui/Stat";
import { ElevationArc } from "./viz";
import ObserverPrompt from "./ObserverPrompt";

type HeroState =
    | { kind: "overhead"; pass: SatellitePass; progress: number; leftS: number }
    | { kind: "visibleSoon"; pass: SatellitePass; inS: number }
    | { kind: "next"; pass: SatellitePass; inS: number }
    | { kind: "none" }
    | { kind: "loading" };

/** Pick what matters most right now, the way a flight app does. */
function heroState(passes: SatellitePass[] | null, now: number): HeroState {
    if (!passes) return { kind: "loading" };
    const current = passes.find((p) => p.aosTime.getTime() <= now && p.losTime.getTime() >= now);
    if (current) {
        const a = current.aosTime.getTime(), b = current.losTime.getTime();
        return { kind: "overhead", pass: current, progress: (now - a) / (b - a), leftS: (b - now) / 1000 };
    }
    const upcoming = passes.filter((p) => p.aosTime.getTime() > now);
    const visible = upcoming.find((p) => p.visible && p.aosTime.getTime() - now < 24 * 3600_000);
    if (visible) return { kind: "visibleSoon", pass: visible, inS: (visible.aosTime.getTime() - now) / 1000 };
    if (upcoming[0]) return { kind: "next", pass: upcoming[0], inS: (upcoming[0].aosTime.getTime() - now) / 1000 };
    return { kind: "none" };
}

export default function HeroCard({ obj }: { obj: SpaceObject }) {
    const t = useT();
    const f = useFormat();
    const observer = useAppStore((s) => s.observer);
    const passes = usePasses(obj, observer);
    const tel = useTelemetryStore((s) => (s.telemetry?.id === obj.id ? s.telemetry : null));
    const el = useElements(obj);
    const now = useTimelineStore((s) => Math.floor(s.currentTime.getTime() / 1000) * 1000);

    const state = observer ? heroState(passes.status === "ready" ? passes.data : null, now) : null;

    return (
        <Card index={0} className="overflow-hidden">
            {/* Headline: changes with the situation */}
            {!observer && <ObserverPrompt />}
            {state?.kind === "loading" && <p className="text-[15px] text-ink-2">{t("passes.computing")}</p>}
            {state?.kind === "none" && <p className="text-[15px] text-ink-2">{t("passes.noneIn48h")}</p>}

            {state?.kind === "overhead" && (
                <div>
                    <Badge tone={state.pass.visible ? "green" : "accent"} icon={state.pass.visible ? <Eye size={14} weight="bold" /> : undefined}>
                        {state.pass.visible ? t("hero.overheadVisible") : t("hero.overhead")}
                    </Badge>
                    <div className="mt-2 text-[22px] font-semibold tracking-tight">
                        {t("hero.setsIn", { d: f.duration(state.leftS) })}
                    </div>
                    <div className="text-[14px] text-ink-2">
                        {t("hero.nowAt", {
                            el: f.num(tel?.look?.elevationDeg, 0) ?? "—",
                            az: f.num(tel?.look?.azimuthDeg, 0) ?? "—",
                        })}
                    </div>
                    <div className="mt-2 -mx-1">
                        <ElevationArc progress={state.progress} maxElevation={state.pass.maxElevation}
                            tone={state.pass.visible ? "green" : "accent"} label={t("hero.arcLabel")} />
                    </div>
                </div>
            )}

            {(state?.kind === "visibleSoon" || state?.kind === "next") && (
                <div>
                    <Badge tone={state.kind === "visibleSoon" ? "green" : "accent"}
                        icon={state.kind === "visibleSoon" ? <Eye size={14} weight="bold" /> : undefined}>
                        {state.kind === "visibleSoon" ? t("hero.visiblePass") : t("passes.next")}
                    </Badge>
                    <div className="mt-2 flex items-end justify-between gap-3">
                        <div>
                            <div className="figure text-[44px]">{f.time(state.pass.aosTime, false)}</div>
                            <div className="mt-1 text-[14px] text-ink-2">
                                {t("hero.inAndMax", { d: f.duration(state.inS), el: f.num(state.pass.maxElevation, 0) ?? "" })}
                            </div>
                        </div>
                        <div className="text-right text-[13px] text-ink-2 pb-0.5">{f.date(state.pass.aosTime)}</div>
                    </div>
                </div>
            )}

            {/* Live state */}
            <div className="mt-4 pt-4 border-t border-separator grid grid-cols-2 gap-x-4 gap-y-4">
                <Stat label={t("telemetry.altitude")} value={tel?.altitudeKm} format={(v) => f.num(v, 0) ?? ""} unit="km" />
                <Stat label={t("telemetry.speed")} value={tel?.speedKmS} format={(v) => f.num(v, 2) ?? ""} unit="km/s" />
                <Stat size="sm" label={t("hero.position")} value={tel ? `${f.lat(tel.latitude)}, ${f.lon(tel.longitude)}` : null} />
                <Stat size="sm" label={t("elements.period")} value={el?.periodMin} format={(v) => f.num(v, 1) ?? ""} unit={t("units.min")} />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
                {tel && (tel.sunlit
                    ? <Badge tone="orange" icon={<Sun size={14} weight="fill" />}>{t("telemetry.sunlit")}</Badge>
                    : <Badge tone="indigo" icon={<Moon size={14} weight="fill" />}>{t("telemetry.eclipsed")}</Badge>)}
                {tel?.look && (tel.look.elevationDeg > 0
                    ? <Badge tone="green">{t("hero.aboveHorizon")}</Badge>
                    : <Badge>{t("hero.belowHorizon")}</Badge>)}
                {obj.category && <Badge>{t(`regime.${obj.category}`)}</Badge>}
            </div>
        </Card>
    );
}
