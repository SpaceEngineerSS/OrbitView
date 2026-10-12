"use client";

import type { SpaceObject } from "@/lib/space-objects";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { useElements } from "@/hooks/useAnalysis";
import { Row } from "@/components/ui/Readout";
import { Section, Note } from "@/components/ui/Panel";

export default function ElementsModule({ obj }: { obj: SpaceObject }) {
    const t = useT();
    const f = useFormat();
    const el = useElements(obj);
    if (!el) return <Section><Note>{t("errors.noTle")}</Note></Section>;

    return (
        <>
            <Section title={t("elements.title")} aside={t("elements.epoch", { d: el.epoch.toISOString().replace("T", " ").slice(0, 19) + " UTC" })}>
                <Row label={t("elements.semiMajorAxis")} value={f.num(el.semiMajorAxisKm, 1)} unit="km" />
                <Row label={t("elements.eccentricity")} value={f.num(el.eccentricity, 6)} />
                <Row label={t("elements.inclination")} value={f.num(el.inclinationDeg, 4)} unit="°" />
                <Row label={t("elements.raan")} value={f.num(el.raanDeg, 4)} unit="°" />
                <Row label={t("elements.argPerigee")} value={f.num(el.argPerigeeDeg, 4)} unit="°" />
                <Row label={t("elements.meanAnomaly")} value={f.num(el.meanAnomalyDeg, 4)} unit="°" />
                <Row label={t("elements.meanMotion")} value={f.num(el.meanMotionRevPerDay, 8)} unit={t("units.revPerDay")} />
            </Section>
            <Section title={t("elements.derived")}>
                <Row label={t("elements.period")} value={f.num(el.periodMin, 2)} unit={t("units.min")} />
                <Row label={t("elements.perigee")} value={f.num(el.perigeeAltKm, 1)} unit="km" />
                <Row label={t("elements.apogee")} value={f.num(el.apogeeAltKm, 1)} unit="km" />
                <Row label={t("elements.bstar")} value={el.bstar.toExponential(4)} unit="1/ER" />
            </Section>
            <div className="px-3 pb-3"><Note>{t("elements.note")}</Note></div>
        </>
    );
}
