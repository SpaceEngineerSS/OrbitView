"use client";

import { IdentificationCard } from "@phosphor-icons/react";
import type { SpaceObject } from "@/lib/space-objects";
import { LAUNCH_SITES } from "@/lib/satcat";
import { useSatcatStore } from "@/store/satcatStore";
import { useLocale } from "@/hooks/useLocale";
import { Card, Row, Note } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Stat";

/** Owner country name from a SATCAT code, falling back to the code itself. */
export function useCountryName() {
    const { t } = useLocale();
    return (code: string) => {
        const name = t(`countries.${code}`);
        return name === `countries.${code}` ? code : name;
    };
}

function rcsSize(rcs: number | null): "small" | "medium" | "large" | null {
    if (rcs === null) return null;
    if (rcs < 0.1) return "small";
    if (rcs < 1) return "medium";
    return "large";
}

/** Who owns it, when and where it was launched, what kind of object it is. */
/** SATCAT operational status codes; "?" and blank say nothing. */
const STATUS: Record<string, string> = {
    "+": "active", "-": "inactive", P: "partial", B: "backup", S: "spare", X: "extended",
};

export default function IdentityCard({ obj, index }: { obj: SpaceObject; index: number }) {
    const { t, intl } = useLocale();
    const country = useCountryName();
    const status = useSatcatStore((s) => s.status);
    const info = useSatcatStore((s) => s.info.get(obj.id));

    const launch = info?.launchDate
        ? new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(info.launchDate + "T00:00:00Z"))
        : null;
    const size = rcsSize(info?.rcs ?? null);
    const statusKey = info ? STATUS[info.status] : undefined;

    return (
        <Card index={index} title={t("identity.title")} icon={<IdentificationCard size={16} weight="bold" />}>
            {status === "loading" && <Note>{t("identity.loading")}</Note>}
            {status === "error" && <Note>{t("identity.unavailable")}</Note>}
            {status === "ready" && !info && <Note>{t("identity.notFound")}</Note>}
            {info && (
                <>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        <Badge tone="accent">{country(info.owner)}</Badge>
                        <Badge>{t(`identity.kind.${info.kind}`)}</Badge>
                        {statusKey && <Badge tone={statusKey === "inactive" ? "muted" : "green"}>{t(`identity.${statusKey}`)}</Badge>}
                    </div>
                    <Row label={t("identity.launched")} value={launch} />
                    <Row label={t("identity.site")} value={LAUNCH_SITES[info.launchSite] ?? info.launchSite} />
                    <Row label={t("identity.designator")} value={info.intlDesignator} />
                    <Row label={t("identity.size")} value={size ? t(`identity.rcs.${size}`) : null} />
                </>
            )}
        </Card>
    );
}
