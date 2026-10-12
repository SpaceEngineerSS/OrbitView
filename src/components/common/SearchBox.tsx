"use client";

import { forwardRef, useDeferredValue, useId, useMemo, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { buildSearchIndex, searchCatalog, featured, regimeColor, type SearchHit } from "@/lib/catalog";
import type { SpaceObject } from "@/lib/space-objects";
import { useT } from "@/hooks/useLocale";
import { cx } from "@/components/ui/cx";
import { Kbd } from "@/components/ui/Controls";

function Highlight({ name, query, at }: { name: string; query: string; at: number }) {
    if (at < 0) return <>{name}</>;
    const len = query.trim().length;
    return (
        <>
            {name.slice(0, at)}
            <mark className="bg-transparent text-accent">{name.slice(at, at + len)}</mark>
            {name.slice(at + len)}
        </>
    );
}

interface SearchBoxProps {
    /** Called after an object is picked (e.g. to close a mobile overlay) */
    onPicked?: () => void;
    /** Results list is always open (mobile catalog) rather than a dropdown */
    inline?: boolean;
    autoFocus?: boolean;
    className?: string;
}

/**
 * Catalog search. Matches name or NORAD id as plain text; arrow keys move
 * through results, Enter selects.
 */
export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(function SearchBox(
    { onPicked, inline = false, autoFocus, className },
    ref
) {
    const t = useT();
    const objects = useAppStore((s) => s.objects);
    const byId = useAppStore((s) => s.byId);
    const select = useAppStore((s) => s.select);
    const [query, setQuery] = useState("");
    const [focused, setFocused] = useState(false);
    const [active, setActive] = useState(0);
    const deferred = useDeferredValue(query);
    const listId = useId();

    const index = useMemo(() => buildSearchIndex(objects), [objects]);
    const hits: SearchHit[] = useMemo(() => searchCatalog(index, deferred, 40), [index, deferred]);
    const suggestions: SpaceObject[] = useMemo(() => featured(byId), [byId]);

    const showingFeatured = deferred.trim() === "";
    const rows: { object: SpaceObject; at: number }[] = showingFeatured ? suggestions.map((o) => ({ object: o, at: -1 })) : hits;
    const open = inline || (focused && (rows.length > 0 || !showingFeatured));

    const pick = (o: SpaceObject) => {
        select(o.id);
        setQuery("");
        setActive(0);
        onPicked?.();
        (document.activeElement as HTMLElement | null)?.blur?.();
    };

    const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown" && rows.length) { e.preventDefault(); setActive((a) => (a + 1) % rows.length); }
        else if (e.key === "ArrowUp" && rows.length) { e.preventDefault(); setActive((a) => (a - 1 + rows.length) % rows.length); }
        else if (e.key === "Enter" && rows[active]) { e.preventDefault(); pick(rows[active].object); }
        else if (e.key === "Escape") { e.stopPropagation(); setQuery(""); (e.target as HTMLInputElement).blur(); }
    };

    return (
        <div className={cx("relative", className)}>
            <div className="flex items-center h-9 bg-bg border border-rule-strong focus-within:border-accent rounded-[2px]">
                <Search size={14} strokeWidth={1.5} className="ml-2.5 text-dim shrink-0" aria-hidden />
                <input
                    ref={ref}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-activedescendant={rows[active] ? `${listId}-${rows[active].object.id}` : undefined}
                    aria-autocomplete="list"
                    aria-label={t("search.label")}
                    placeholder={t("search.placeholder")}
                    value={query}
                    autoFocus={autoFocus}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setTimeout(() => setFocused(false), 120)}
                    onKeyDown={onKey}
                    className="flex-1 min-w-0 h-full bg-transparent px-2 text-[16px] md:text-[13px] text-ink placeholder:text-faint outline-none"
                />
                {query ? (
                    <button type="button" aria-label={t("search.clear")} onClick={() => setQuery("")} className="h-full px-2 text-dim hover:text-ink">
                        <X size={14} strokeWidth={1.5} />
                    </button>
                ) : (
                    !inline && <span className="mr-2 hidden md:inline-flex"><Kbd>/</Kbd></span>
                )}
            </div>

            {open && (
                <div
                    className={cx(
                        inline ? "mt-2" : "absolute left-0 right-0 top-full mt-1 bg-surface border border-rule-strong",
                    )}
                    style={inline ? undefined : { zIndex: "var(--z-overlay)" }}
                >
                    <div className="label px-2.5 pt-2 pb-1">
                        {showingFeatured
                            ? t("search.featured")
                            : t("search.results", { n: hits.length >= 40 ? "40+" : hits.length })}
                    </div>
                    <ul id={listId} role="listbox" aria-label={t("search.label")} className={cx(!inline && "max-h-[60vh] scroll")}>
                        {rows.map((r, i) => (
                            <li
                                key={r.object.id}
                                id={`${listId}-${r.object.id}`}
                                role="option"
                                aria-selected={i === active}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pick(r.object)}
                                onMouseMove={() => setActive(i)}
                                className={cx(
                                    "flex items-center gap-2.5 px-2.5 h-10 md:h-8 cursor-pointer text-[13px]",
                                    i === active ? "bg-raised text-ink" : "text-dim"
                                )}
                            >
                                <span aria-hidden className="h-1.5 w-1.5 shrink-0" style={{ background: regimeColor(r.object) }} />
                                <span className="truncate flex-1"><Highlight name={r.object.name} query={deferred} at={r.at} /></span>
                                <span className="num text-[11px] text-faint">{r.object.id}</span>
                            </li>
                        ))}
                        {!showingFeatured && hits.length === 0 && (
                            <li className="px-2.5 py-3 text-[12px] text-dim">{t("search.none")}</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
});
