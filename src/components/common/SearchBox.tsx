"use client";

import { forwardRef, useDeferredValue, useId, useMemo, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useAppStore } from "@/store/appStore";
import { buildSearchIndex, searchCatalog, featured, regimeColor, isDebris, type SearchHit } from "@/lib/catalog";
import { useSatcatStore } from "@/store/satcatStore";
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
            <span className="text-accent">{name.slice(at, at + len)}</span>
            {name.slice(at + len)}
        </>
    );
}

interface SearchBoxProps {
    onPicked?: () => void;
    /** Results always shown below the field (phone sheet) instead of a dropdown */
    inline?: boolean;
    autoFocus?: boolean;
    className?: string;
    /** Called when the field gains/loses focus (the phone sheet expands on focus) */
    onFocusChange?: (focused: boolean) => void;
}

/**
 * Catalog search by name or NORAD id. Plain substring matching, so names with
 * brackets are just text. Arrow keys move through results, Enter selects.
 */
export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(function SearchBox(
    { onPicked, inline = false, autoFocus, className, onFocusChange },
    ref
) {
    const t = useT();
    const objects = useAppStore((s) => s.objects);
    const byId = useAppStore((s) => s.byId);
    const kinds = useSatcatStore((s) => s.kinds);
    const select = useAppStore((s) => s.select);
    const [query, setQuery] = useState("");
    const [focused, setFocused] = useState(false);
    const [active, setActive] = useState(0);
    const deferred = useDeferredValue(query);
    const listId = useId();

    const index = useMemo(() => buildSearchIndex(objects), [objects]);
    const hits: SearchHit[] = useMemo(() => searchCatalog(index, deferred, 40), [index, deferred]);
    const suggestions = useMemo(() => featured(byId), [byId]);

    const showingFeatured = deferred.trim() === "";
    const rows: { object: SpaceObject; at: number }[] = showingFeatured ? suggestions.map((o) => ({ object: o, at: -1 })) : hits;
    const open = inline ? !showingFeatured : focused && (rows.length > 0 || !showingFeatured);

    const setFocus = (f: boolean) => { setFocused(f); onFocusChange?.(f); };

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

    const list = (
        <ul id={listId} role="listbox" aria-label={t("search.label")} className={cx(inline ? "max-h-[40dvh] scroll -mx-1.5" : "max-h-[56vh] scroll", "py-1.5")}>
            {!showingFeatured && hits.length === 0 && <li className="px-4 py-3 text-[14px] text-ink-2">{t("search.none")}</li>}
            {rows.map((r, i) => (
                <li
                    key={r.object.id}
                    id={`${listId}-${r.object.id}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(r.object)}
                    onMouseMove={() => setActive(i)}
                    className={cx("flex items-center gap-3 mx-1.5 px-2.5 h-12 rounded-[12px] cursor-pointer", i === active && !inline ? "bg-fill" : "")}
                >
                    <span aria-hidden className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${regimeColor(r.object)}26` }}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: regimeColor(r.object) }} />
                    </span>
                    <span className="flex-1 min-w-0">
                        <span className="block truncate text-[15px] font-medium"><Highlight name={r.object.name} query={deferred} at={r.at} /></span>
                        <span className="block text-[12px] text-ink-2">NORAD {r.object.id}{r.object.regime ? ` · ${t(`regime.${isDebris(r.object, kinds) ? "DEBRIS" : r.object.regime}`)}` : ""}</span>
                    </span>
                </li>
            ))}
        </ul>
    );

    return (
        <div className={cx("relative", className)}>
            <div className={cx(
                "flex items-center h-12 rounded-full transition-shadow",
                inline ? "bg-fill" : "bg-card shadow-float",
                focused && !inline && "ring-2 ring-accent"
            )}>
                <MagnifyingGlass size={19} weight="bold" className="ml-4 text-ink-2 shrink-0" aria-hidden />
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
                    enterKeyHint="search"
                    onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                    onFocus={() => setFocus(true)}
                    onBlur={() => setTimeout(() => setFocus(false), 120)}
                    onKeyDown={onKey}
                    className="flex-1 min-w-0 h-full bg-transparent px-2.5 text-[16px] text-ink placeholder:text-ink-3 outline-none"
                />
                {query ? (
                    <button type="button" aria-label={t("search.clear")} onClick={() => setQuery("")}
                        className="mr-2 h-8 w-8 flex items-center justify-center rounded-full text-ink-2 hover:bg-fill">
                        <X size={15} weight="bold" />
                    </button>
                ) : (
                    !inline && <span className="mr-4 hidden md:inline-flex"><Kbd>/</Kbd></span>
                )}
            </div>

            {inline ? (open && list) : (
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 500, damping: 36 }}
                            className="absolute left-0 right-0 top-full mt-2 bg-card rounded-[20px] shadow-pop origin-top"
                            style={{ zIndex: "var(--z-overlay)" }}
                        >
                            <div className="px-4 pt-3 text-[13px] font-semibold text-ink-2">
                                {showingFeatured ? t("search.featured") : t("search.results", { n: hits.length >= 40 ? "40+" : hits.length })}
                            </div>
                            {list}
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
});
