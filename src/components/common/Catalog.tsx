"use client";

import { useEffect, useMemo, useState } from "react";
import { CloudWarning, ArrowClockwise, Flag, Check } from "@phosphor-icons/react";
import { useSatcatStore, countByOwner } from "@/store/satcatStore";
import { COUNTRY_FILTERS } from "@/lib/satcat";
import { useCountryName } from "@/components/analysis/IdentityCard";
import { useAppStore, type FilterKey } from "@/store/appStore";
import { FILTERS, countByFilter, REGIME_COLORS, featured, regimeColor } from "@/lib/catalog";
import { useT } from "@/hooks/useLocale";
import { useFormat } from "@/hooks/useFormat";
import { ChipGroup, TextInput } from "@/components/ui/Controls";
import { Dialog } from "@/components/ui/Dialog";
import { cx } from "@/components/ui/cx";

const SWATCH: Partial<Record<FilterKey, string>> = {
    stations: REGIME_COLORS.station,
    leo: REGIME_COLORS.LEO,
    meo: REGIME_COLORS.MEO,
    geo: REGIME_COLORS.GEO,
    heo: REGIME_COLORS.HEO,
    debris: REGIME_COLORS.DEBRIS,
};

/**
 * Owner-country filter: a chip that opens our own list (a sheet on phones).
 * A native <select> drew its pop-up in the system colours, white and
 * unreadable in dark mode.
 */
function CountrySelect() {
    const t = useT();
    const f = useFormat();
    const country = useAppStore((s) => s.country);
    const setCountry = useAppStore((s) => s.setCountry);
    const objects = useAppStore((s) => s.objects);
    const owners = useSatcatStore((s) => s.owners);
    const name = useCountryName();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const counts = useMemo(() => countByOwner(objects.map((o) => o.id), owners), [objects, owners]);
    if (!owners) return null;

    const q = query.trim().toLocaleLowerCase();
    const rows = COUNTRY_FILTERS
        .filter((c) => (counts.get(c) ?? 0) > 0)
        .filter((c) => !q || name(c).toLocaleLowerCase().includes(q) || c.toLowerCase().includes(q));
    const pick = (c: string | null) => { setCountry(c); setOpen(false); setQuery(""); };
    const row = (key: string, label: string, count: number | null, on: boolean, value: string | null) => (
        <li key={key}>
            <button type="button" onClick={() => pick(value)} aria-pressed={on}
                className={cx("w-full flex items-center gap-3 h-12 px-3 rounded-[14px] text-left transition-colors",
                    on ? "bg-accent-soft" : "hover:bg-fill")}>
                <span className={cx("flex-1 min-w-0 truncate text-[15px]", on ? "font-semibold text-accent" : "font-medium")}>{label}</span>
                {count !== null && <span className="text-[13px] text-ink-2 tabular-nums">{f.num(count, 0)}</span>}
                <Check size={16} weight="bold" className={cx("shrink-0 text-accent", !on && "invisible")} />
            </button>
        </li>
    );

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
                className={cx(
                    "shrink-0 h-8 px-3 rounded-full text-[13px] font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors",
                    country ? "bg-accent text-on-accent" : "bg-card text-ink shadow-card hover:bg-card-2"
                )}>
                <Flag size={14} weight={country ? "fill" : "bold"} />
                <span>{country ? name(country) : t("filter.country")}</span>
                {country && <span className="opacity-75">{f.num(counts.get(country) ?? 0, 0)}</span>}
            </button>
            <Dialog open={open} onClose={() => setOpen(false)} title={t("filter.country")} closeLabel={t("common.close")} width="sm">
                <TextInput type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("filter.searchCountry")} aria-label={t("filter.searchCountry")} className="mb-2" />
                <ul className="-mx-2">
                    {!q && row("all", t("filter.allCountries"), null, country === null, null)}
                    {rows.map((c) => row(c, name(c), counts.get(c) ?? 0, country === c, c))}
                </ul>
                {rows.length === 0 && <p className="py-6 text-center text-[14px] text-ink-2">{t("search.nothing")}</p>}
            </Dialog>
        </>
    );
}

/** Which part of the catalog is drawn, as a scrollable row of chips. */
export function FilterChips({ className }: { className?: string }) {
    const t = useT();
    const f = useFormat();
    const objects = useAppStore((s) => s.objects);
    const favorites = useAppStore((s) => s.favorites);
    const filter = useAppStore((s) => s.filter);
    const setFilter = useAppStore((s) => s.setFilter);
    const kinds = useSatcatStore((s) => s.kinds);
    const counts = useMemo(() => countByFilter(objects, new Set(favorites), kinds), [objects, favorites, kinds]);

    return (
        <div className={cx("scroll-fade-x flex gap-1.5 overflow-x-auto [scrollbar-width:none] -mx-1 pl-1 py-1", className)}>
            <CountrySelect />
            <ChipGroup
                label={t("catalog.filters")}
                value={filter}
                onChange={setFilter}
                options={FILTERS
                    .filter((k) => k === "all" || k === filter || counts[k] > 0)
                    .map((k) => ({ value: k, label: t(`filter.${k}`), count: f.num(counts[k], 0) ?? "", color: SWATCH[k] }))}
            />
        </div>
    );
}

/** Quick picks for a first visit. */
export function FeaturedList({ onPicked }: { onPicked?: () => void }) {
    const t = useT();
    const byId = useAppStore((s) => s.byId);
    const select = useAppStore((s) => s.select);
    const picks = featured(byId);
    if (!picks.length) return null;
    return (
        <div>
            <div className="text-[13px] font-semibold text-ink-2 mb-1">{t("search.featured")}</div>
            <ul>
                {picks.map((o) => (
                    <li key={o.id}>
                        <button type="button" onClick={() => { select(o.id); onPicked?.(); }}
                            className="w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-[12px] text-left hover:bg-fill">
                            <span aria-hidden className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${regimeColor(o)}26` }}>
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: regimeColor(o) }} />
                            </span>
                            <span className="flex-1 min-w-0 truncate text-[15px] font-medium">{o.name}</span>
                            <span className="text-[12px] text-ink-3">{o.id}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Catalog size and data age; a clear warning when the source is down. */
export function DataStatus({ className }: { className?: string }) {
    const t = useT();
    const f = useFormat();
    const status = useAppStore((s) => s.catalogStatus);
    const count = useAppStore((s) => s.objects.length);
    const fetchedAt = useAppStore((s) => s.catalogFetchedAt);
    const stale = useAppStore((s) => s.catalogStale);
    const [nowMin, setNowMin] = useState(() => Math.floor(Date.now() / 60_000));
    useEffect(() => {
        const id = window.setInterval(() => setNowMin(Math.floor(Date.now() / 60_000)), 60_000);
        return () => window.clearInterval(id);
    }, []);

    if (status === "loading" || status === "idle") {
        return <span className={cx("text-[13px] text-ink-2", className)}>{t("data.loading")}</span>;
    }
    if (status === "error") {
        return (
            <span className={cx("inline-flex items-center gap-1.5 text-[13px] text-red", className)}>
                <CloudWarning size={16} weight="bold" /> {t("data.failed")}
                <button type="button" onClick={() => location.reload()} className="inline-flex items-center gap-1 font-semibold">
                    <ArrowClockwise size={14} weight="bold" />{t("common.retry")}
                </button>
            </span>
        );
    }
    const ageH = fetchedAt ? (nowMin * 60_000 - fetchedAt) / 3_600_000 : null;
    const old = stale || (ageH !== null && ageH > 24);
    return (
        <span className={cx("inline-flex items-center gap-1.5 text-[13px]", old ? "text-orange" : "text-ink-2", className)}
            title={fetchedAt ? new Date(fetchedAt).toISOString() : undefined}>
            {old && <CloudWarning size={15} weight="bold" />}
            {t("data.objects", { n: f.num(count, 0) ?? "" })}
            {ageH !== null && <> · {ageH < 1 ? t("data.ageMin", { n: Math.max(1, Math.round(ageH * 60)) }) : t("data.ageH", { n: Math.round(ageH) })}</>}
            {stale && <> · {t("data.stale")}</>}
        </span>
    );
}
