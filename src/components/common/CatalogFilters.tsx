"use client";

import { useMemo } from "react";
import { useAppStore, type FilterKey } from "@/store/appStore";
import { FILTERS, countByFilter, REGIME_COLORS } from "@/lib/catalog";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { cx } from "@/components/ui/cx";

const SWATCH: Partial<Record<FilterKey, string>> = {
    stations: REGIME_COLORS.station,
    leo: REGIME_COLORS.LEO,
    meo: REGIME_COLORS.MEO,
    geo: REGIME_COLORS.GEO,
    heo: REGIME_COLORS.HEO,
    debris: REGIME_COLORS.DEBRIS,
};

/** Which part of the catalog is drawn on the globe, with live counts. */
export function CatalogFilters() {
    const t = useT();
    const f = useFormat();
    const objects = useAppStore((s) => s.objects);
    const favorites = useAppStore((s) => s.favorites);
    const filter = useAppStore((s) => s.filter);
    const setFilter = useAppStore((s) => s.setFilter);
    const counts = useMemo(() => countByFilter(objects, new Set(favorites)), [objects, favorites]);

    return (
        <ul role="radiogroup" aria-label={t("catalog.filters")} className="py-1">
            {FILTERS.map((key) => {
                const on = key === filter;
                return (
                    <li key={key}>
                        <button
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setFilter(key)}
                            className={cx(
                                "w-full flex items-center gap-2.5 h-9 md:h-8 px-3 text-[13px] transition-colors duration-[140ms]",
                                on ? "bg-raised text-ink" : "text-dim hover:text-ink"
                            )}
                        >
                            <span aria-hidden className={cx("w-[2px] h-4 -ml-3 mr-[10px]", on ? "bg-accent" : "bg-transparent")} />
                            <span aria-hidden className="h-1.5 w-1.5 shrink-0 border border-rule-strong"
                                style={SWATCH[key] ? { background: SWATCH[key], borderColor: SWATCH[key] } : undefined} />
                            <span className="flex-1 text-left">{t(`filter.${key}`)}</span>
                            <span className="num text-[11px] text-faint">{f.num(counts[key], 0)}</span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

/** Catalog size, data age and source problems, in one line. */
export function DataStatus({ className }: { className?: string }) {
    const t = useT();
    const f = useFormat();
    const status = useAppStore((s) => s.catalogStatus);
    const count = useAppStore((s) => s.objects.length);
    const fetchedAt = useAppStore((s) => s.catalogFetchedAt);
    const stale = useAppStore((s) => s.catalogStale);
    // Age is relative to real time, not sim time; refresh the label once a minute.
    const nowMin = useMemo(() => Math.floor(Date.now() / 60_000), [fetchedAt, status]); // eslint-disable-line react-hooks/exhaustive-deps

    if (status === "loading" || status === "idle") {
        return <span className={cx("text-[11.5px] text-dim", className)}>{t("data.loading")}</span>;
    }
    if (status === "error") {
        return (
            <span className={cx("text-[11.5px] text-alert", className)}>
                {t("data.failed")}{" "}
                <button type="button" className="underline underline-offset-2" onClick={() => location.reload()}>{t("common.retry")}</button>
            </span>
        );
    }
    const ageH = fetchedAt ? (nowMin * 60_000 - fetchedAt) / 3_600_000 : null;
    const old = stale || (ageH !== null && ageH > 24);
    return (
        <span className={cx("num text-[11.5px]", old ? "text-warn" : "text-dim", className)}
            title={fetchedAt ? new Date(fetchedAt).toISOString() : undefined}>
            {t("data.objects", { n: f.num(count, 0) ?? "" })}
            {ageH !== null && <> · {ageH < 1 ? t("data.ageMin", { n: Math.max(1, Math.round(ageH * 60)) }) : t("data.ageH", { n: Math.round(ageH) })}</>}
            {stale && <> · {t("data.stale")}</>}
        </span>
    );
}
