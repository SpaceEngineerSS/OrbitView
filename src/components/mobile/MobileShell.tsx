"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { Search, Globe2, List, SlidersHorizontal, Compass, ArrowLeft } from "lucide-react";
import { useAppStore, useSelectedObject } from "@/store/appStore";
import { useUiStore, type MobileTab } from "@/store/uiStore";
import { useT } from "@/hooks/useLocale";
import { useBackClose } from "@/hooks/useBackClose";
import { SensorManager } from "@/lib/SensorManager";
import { LogoMark } from "@/components/common/Logo";
import { SearchBox } from "@/components/common/SearchBox";
import { SimClock, TimeControls, TimeScrubber } from "@/components/common/TimeControls";
import { CatalogFilters, DataStatus } from "@/components/common/CatalogFilters";
import { SettingsBody } from "@/components/common/SettingsDialog";
import { AboutBody } from "@/components/common/AboutDialog";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import SelectionSheet from "./SelectionSheet";

export const MOBILE_TOP = 48;
export const MOBILE_NAV = 56;

/** Live height of an element (the region between the top bar and the nav). */
function useElementHeight<T extends HTMLElement>() {
    const [el, setEl] = useState<T | null>(null);
    const [h, setH] = useState(600);
    useEffect(() => {
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => setH(Math.round(entry.contentRect.height)));
        ro.observe(el);
        return () => ro.disconnect();
    }, [el]);
    return [setEl, h] as const;
}

function SearchOverlay() {
    const t = useT();
    const open = useUiStore((s) => s.searchOpen);
    const setOpen = useUiStore((s) => s.setSearchOpen);
    const setTab = useUiStore((s) => s.setMobileTab);
    useBackClose(open, () => setOpen(false));
    if (!open || typeof document === "undefined") return null;
    return createPortal(
        <div className="fixed inset-0 flex flex-col bg-surface pt-[var(--safe-top)]" style={{ zIndex: "var(--z-overlay)" }}
            role="dialog" aria-modal="true" aria-label={t("search.label")}>
            <div className="flex items-center gap-1 h-12 px-1.5 border-b border-rule shrink-0">
                <IconButton label={t("common.back")} onClick={() => setOpen(false)}><ArrowLeft size={18} strokeWidth={1.5} /></IconButton>
                <span className="text-[13px] font-medium">{t("search.label")}</span>
            </div>
            <div className="flex-1 min-h-0 scroll px-3 pt-3 pb-[calc(var(--safe-bottom)+12px)]">
                <SearchBox inline autoFocus onPicked={() => { setOpen(false); setTab("globe"); }} />
            </div>
        </div>,
        document.body
    );
}

function TimeDialog() {
    const t = useT();
    const open = useUiStore((s) => s.dialog === "time");
    const close = useUiStore((s) => s.closeDialog);
    return (
        <Dialog open={open} onClose={close} title={t("time.title")} closeLabel={t("common.close")}>
            <SimClock className="mb-4" />
            <TimeControls layout="stack" />
            <div className="mt-4"><TimeScrubber /></div>
        </Dialog>
    );
}

const TABS: { id: MobileTab; icon: typeof Globe2 }[] = [
    { id: "globe", icon: Globe2 },
    { id: "catalog", icon: List },
    { id: "settings", icon: SlidersHorizontal },
];

export default function MobileShell() {
    const t = useT();
    const tab = useUiStore((s) => s.mobileTab);
    const setTab = useUiStore((s) => s.setMobileTab);
    const setSearchOpen = useUiStore((s) => s.setSearchOpen);
    const openDialog = useUiStore((s) => s.openDialog);
    const compass = useUiStore((s) => s.compass);
    const setCompass = useUiStore((s) => s.setCompass);
    const observer = useAppStore((s) => s.observer);
    const selected = useSelectedObject();
    const [regionRef, available] = useElementHeight<HTMLDivElement>();
    const [compassError, setCompassError] = useState<string | null>(null);

    // Selecting something (from a list or a link) brings the globe back.
    useEffect(() => { if (selected) setTab("globe"); }, [selected, setTab]);

    const toggleCompass = async () => {
        if (compass) { setCompass(false); return; }
        if (!observer) { openDialog("observer"); return; }
        const ok = await SensorManager.getInstance().requestPermission();
        if (ok) { setCompassError(null); setCompass(true); }
        else setCompassError(t("compassMode.denied"));
    };

    return (
        <>
            <header
                className="fixed top-0 inset-x-0 flex items-center gap-2 px-2 bg-surface border-b border-rule pt-[var(--safe-top)]"
                style={{ height: `calc(${MOBILE_TOP}px + var(--safe-top))`, zIndex: "var(--z-nav)" }}
            >
                <span className="pl-1"><LogoMark size={22} /></span>
                <button type="button" onClick={() => openDialog("time")} className="flex-1 min-w-0 flex justify-center" aria-label={t("time.title")}>
                    <SimClock compact />
                </button>
                <IconButton label={compass ? t("compassMode.exit") : t("compassMode.enter")} active={compass} onClick={toggleCompass}>
                    <Compass size={18} strokeWidth={1.5} />
                </IconButton>
                <IconButton label={t("search.label")} onClick={() => setSearchOpen(true)}>
                    <Search size={18} strokeWidth={1.5} />
                </IconButton>
            </header>

            {compassError && (
                <div className="fixed inset-x-3 top-[calc(var(--safe-top)+56px)] bg-surface border border-warn px-3 py-2 text-[12px]" style={{ zIndex: "var(--z-overlay)" }}
                    role="alert" onClick={() => setCompassError(null)}>
                    {compassError}
                </div>
            )}

            {/* Region between bars: the sheet lives here so it never covers the nav */}
            <div
                ref={regionRef}
                className="fixed inset-x-0 pointer-events-none"
                style={{ top: `calc(${MOBILE_TOP}px + var(--safe-top))`, bottom: `calc(${MOBILE_NAV}px + var(--safe-bottom))`, zIndex: "var(--z-sheet)" }}
            >
                <div className="relative h-full pointer-events-none [&>*]:pointer-events-auto">
                    <AnimatePresence>
                        {tab === "globe" && selected && !compass && <SelectionSheet key="sheet" obj={selected} available={available} />}
                    </AnimatePresence>

                    {tab === "catalog" && (
                        <div className="absolute inset-0 flex flex-col bg-surface">
                            <div className="px-3 pt-3 pb-2 border-b border-rule">
                                <button type="button" onClick={() => setSearchOpen(true)}
                                    className="w-full flex items-center gap-2 h-10 px-2.5 bg-bg border border-rule-strong text-[14px] text-faint text-left">
                                    <Search size={15} strokeWidth={1.5} /> {t("search.placeholder")}
                                </button>
                                <DataStatus className="block mt-2" />
                            </div>
                            <div className="flex-1 min-h-0 scroll">
                                <h2 className="label px-3 pt-3">{t("catalog.showOnGlobe")}</h2>
                                <CatalogFilters />
                            </div>
                        </div>
                    )}

                    {tab === "settings" && (
                        <div className="absolute inset-0 bg-surface scroll px-4 py-3">
                            <SettingsBody />
                            <div className="mt-6 pt-4 border-t border-rule"><AboutBody /></div>
                            <p className="mt-4 text-[10.5px] text-faint">{t("about.mapCredit")}</p>
                        </div>
                    )}
                </div>
            </div>

            <nav
                aria-label={t("nav.label")}
                className="fixed bottom-0 inset-x-0 flex bg-surface border-t border-rule pb-[var(--safe-bottom)]"
                style={{ height: `calc(${MOBILE_NAV}px + var(--safe-bottom))`, zIndex: "var(--z-nav)" }}
            >
                {TABS.map(({ id, icon: Icon }) => {
                    const on = id === tab;
                    return (
                        <button
                            key={id}
                            type="button"
                            aria-current={on ? "page" : undefined}
                            onClick={() => setTab(id)}
                            className={cx("relative flex-1 flex flex-col items-center justify-center gap-1 text-[11px]", on ? "text-ink" : "text-dim")}
                        >
                            {on && <span aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-accent" />}
                            <Icon size={19} strokeWidth={1.5} />
                            {t(`nav.${id}`)}
                        </button>
                    );
                })}
            </nav>

            <SearchOverlay />
            <TimeDialog />
        </>
    );
}
