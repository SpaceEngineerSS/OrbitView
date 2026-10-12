"use client";

import type { SpaceObject } from "@/lib/space-objects";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { useElements, usePasses } from "@/hooks/useAnalysis";
import { useAppStore } from "@/store/appStore";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useTimelineStore } from "@/store/timelineStore";
import { Readout, Row } from "@/components/ui/Readout";
import { Section, Note } from "@/components/ui/Panel";
import ObserverPrompt from "./ObserverPrompt";

export default function OverviewModule({ obj }: { obj: SpaceObject }) {
    const t = useT();
    const f = useFormat();
    const tel = useTelemetryStore((s) => (s.telemetry?.id === obj.id ? s.telemetry : null));
    const el = useElements(obj);
    const observer = useAppStore((s) => s.observer);
    const passes = usePasses(obj, observer);
    const simMs = useTimelineStore((s) => Math.floor(s.currentTime.getTime() / 1000) * 1000);

    const tleAge = el ? (simMs - el.epoch.getTime()) / 86_400_000 : null;
    const next = passes.status === "ready" ? passes.data[0] : undefined;
    const inPass = next && next.aosTime.getTime() <= simMs;

    return (
        <>
            <Section>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Readout size="lg" label={t("telemetry.altitude")} value={f.num(tel?.altitudeKm, 1)} unit="km" />
                    <Readout size="lg" label={t("telemetry.speed")} value={f.num(tel?.speedKmS, 3)} unit="km/s" />
                    <Readout label={t("telemetry.latitude")} value={tel ? f.lat(tel.latitude) : null} />
                    <Readout label={t("telemetry.longitude")} value={tel ? f.lon(tel.longitude) : null} />
                    <Readout
                        label={t("telemetry.illumination")}
                        value={tel ? (tel.sunlit ? t("telemetry.sunlit") : t("telemetry.eclipsed")) : null}
                        tone={tel?.sunlit ? "default" : "dim"}
                    />
                    <Readout label={t("elements.period")} value={f.num(el?.periodMin, 1)} unit={t("units.min")} />
                </div>
            </Section>

            <Section title={t("overview.fromObserver")} aside={observer?.label}>
                {!observer ? <ObserverPrompt /> : (
                    <>
                        <div className="grid grid-cols-3 gap-x-4">
                            <Readout label={t("look.azimuth")} value={tel?.look ? f.num(tel.look.azimuthDeg, 1) : null} unit="°" />
                            <Readout
                                label={t("look.elevation")}
                                value={tel?.look ? f.num(tel.look.elevationDeg, 1) : null}
                                unit="°"
                                tone={tel?.look && tel.look.elevationDeg > 0 ? "accent" : "dim"}
                            />
                            <Readout label={t("look.range")} value={tel?.look ? f.num(tel.look.rangeKm, 0) : null} unit="km" />
                        </div>
                        <div className="mt-3">
                            {passes.status === "loading" && <p className="text-[12px] text-dim">{t("passes.computing")}</p>}
                            {passes.status === "ready" && !next && <p className="text-[12px] text-dim">{t("passes.noneIn48h")}</p>}
                            {next && (
                                <div className="flex items-baseline justify-between gap-3 border-t border-rule pt-2">
                                    <span className="label">{inPass ? t("passes.inProgress") : t("passes.next")}</span>
                                    <span className="num text-[13px]">
                                        {inPass
                                            ? t("passes.losIn", { d: f.duration((next.losTime.getTime() - simMs) / 1000) })
                                            : t("passes.aosIn", { d: f.duration((next.aosTime.getTime() - simMs) / 1000) })}
                                        <span className="text-dim"> · {t("passes.maxEl")} {f.num(next.maxElevation, 0)}°</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </Section>

            <Section title={t("overview.orbit")}>
                <Row label={t("overview.regime")} value={obj.category ? t(`regime.${obj.category}`) : null} />
                <Row label={t("elements.inclination")} value={f.num(el?.inclinationDeg, 2)} unit="°" />
                <Row label={t("elements.perigee")} value={f.num(el?.perigeeAltKm, 0)} unit="km" />
                <Row label={t("elements.apogee")} value={f.num(el?.apogeeAltKm, 0)} unit="km" />
                <Row label={t("elements.tleAge")} value={tleAge !== null ? f.num(tleAge, 1) : null} unit={t("units.days")} />
            </Section>

            {tleAge !== null && Math.abs(tleAge) > 14 && (
                <div className="px-3 pb-3"><Note tone="warn">{t("overview.oldTle", { d: Math.round(tleAge) })}</Note></div>
            )}
        </>
    );
}
