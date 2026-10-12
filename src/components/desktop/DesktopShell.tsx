"use client";

import { useEffect, useRef } from "react";
import { MapPin, Settings2, Info } from "lucide-react";
import { useAppStore, useSelectedObject } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { useT } from "@/hooks/useLocale";
import { Wordmark } from "@/components/common/Logo";
import { SearchBox } from "@/components/common/SearchBox";
import { SimClock, TimeControls, TimeScrubber } from "@/components/common/TimeControls";
import { CatalogFilters, DataStatus } from "@/components/common/CatalogFilters";
import { InspectorHeader, InspectorTabs, InspectorBody } from "@/components/analysis/Inspector";
import { IconButton } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Controls";
import { featured } from "@/lib/catalog";

function ObserverChip() {
    const t = useT();
    const observer = useAppStore((s) => s.observer);
    const open = useUiStore((s) => s.openDialog);
    return (
        <button
            type="button"
            onClick={() => open("observer")}
            className="flex items-center gap-1.5 h-7 px-2 border border-rule-strong rounded-[2px] text-[12px] text-dim hover:text-ink max-w-[200px]"
            title={t("observer.title")}
        >
            <MapPin size={13} strokeWidth={1.5} className={observer ? "text-ink" : "text-accent"} />
            <span className="truncate">{observer ? observer.label : t("observer.set")}</span>
        </button>
    );
}

function IdleInspector() {
    const t = useT();
    const byId = useAppStore((s) => s.byId);
    const select = useAppStore((s) => s.select);
    const picks = featured(byId);
    return (
        <div className="p-4 text-[12.5px] text-dim leading-relaxed">
            <p className="text-ink mb-2">{t("idle.title")}</p>
            <p>{t("idle.body")}</p>
            {picks.length > 0 && (
                <>
                    <h3 className="label mt-5 mb-1.5">{t("search.featured")}</h3>
                    <ul>
                        {picks.map((o) => (
                            <li key={o.id}>
                                <button type="button" onClick={() => select(o.id)}
                                    className="w-full flex justify-between gap-2 py-1.5 border-b border-rule/70 text-left text-dim hover:text-ink">
                                    <span className="truncate">{o.name}</span>
                                    <span className="num text-[11px] text-faint">{o.id}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            )}
            <p className="mt-5 text-[11.5px] text-faint flex items-center gap-1.5">
                <Kbd>/</Kbd> {t("shortcuts.search")} · <Kbd>Space</Kbd> {t("shortcuts.play")}
            </p>
        </div>
    );
}

export default function DesktopShell() {
    const t = useT();
    const selected = useSelectedObject();
    const open = useUiStore((s) => s.openDialog);
    const searchRef = useRef<HTMLInputElement>(null);

    // "/" focuses search
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement | null)?.tagName;
            if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <>
            <header className="fixed top-0 inset-x-0 h-11 flex items-center gap-4 px-3 bg-surface border-b border-rule" style={{ zIndex: "var(--z-hud)" }}>
                <Wordmark />
                <SearchBox ref={searchRef} className="w-[340px]" />
                <div className="flex-1" />
                <SimClock />
                <span className="w-px h-5 bg-rule" aria-hidden />
                <ObserverChip />
                <DataStatus className="hidden xl:inline" />
                <div className="flex items-center">
                    <IconButton label={t("settings.title")} onClick={() => open("settings")}><Settings2 size={16} strokeWidth={1.5} /></IconButton>
                    <IconButton label={t("about.title")} onClick={() => open("about")}><Info size={16} strokeWidth={1.5} /></IconButton>
                </div>
            </header>

            <aside
                className="fixed left-0 top-11 bottom-[52px] w-[232px] hidden lg:flex flex-col bg-surface border-r border-rule"
                style={{ zIndex: "var(--z-hud)" }}
                aria-label={t("catalog.title")}
            >
                <div className="h-9 flex items-center px-3 border-b border-rule"><h2 className="label">{t("catalog.title")}</h2></div>
                <div className="flex-1 min-h-0 scroll"><CatalogFilters /></div>
                <div className="px-3 py-2 border-t border-rule space-y-1">
                    <DataStatus className="block xl:hidden" />
                    <p className="text-[10.5px] text-faint leading-snug">{t("about.mapCredit")}</p>
                </div>
            </aside>

            <aside
                className="fixed right-0 top-11 bottom-[52px] w-[360px] flex flex-col bg-surface border-l border-rule"
                style={{ zIndex: "var(--z-hud)" }}
                aria-label={t("inspector.title")}
            >
                {selected ? (
                    <>
                        <InspectorHeader obj={selected} />
                        <InspectorTabs />
                        <div className="flex-1 min-h-0 scroll"><InspectorBody obj={selected} /></div>
                    </>
                ) : (
                    <IdleInspector />
                )}
            </aside>

            <footer className="fixed bottom-0 inset-x-0 h-[52px] flex items-center gap-4 px-3 bg-surface border-t border-rule" style={{ zIndex: "var(--z-hud)" }}>
                <TimeControls />
                <div className="flex-1 min-w-[160px]"><TimeScrubber /></div>
            </footer>
        </>
    );
}
