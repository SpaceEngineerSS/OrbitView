"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, GearSix, Info, GlobeHemisphereEast, MapTrifold } from "@phosphor-icons/react";
import TonightCard from "@/components/common/TonightCard";
import { useAppStore, useSelectedObject } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { useT } from "@/hooks/useLocale";
import { Wordmark } from "@/components/common/Logo";
import { SearchBox } from "@/components/common/SearchBox";
import { SimClock, TimeControls, TimeScrubber } from "@/components/common/TimeControls";
import { FilterChips, DataStatus } from "@/components/common/Catalog";
import { InspectorHeader, InspectorCards } from "@/components/analysis/Inspector";
import { IconButton } from "@/components/ui/Button";

const PANEL_W = 400;
const SPRING = { type: "spring", stiffness: 380, damping: 38 } as const;

function ObserverChip() {
    const t = useT();
    const observer = useAppStore((s) => s.observer);
    const open = useUiStore((s) => s.openDialog);
    return (
        <button
            type="button"
            onClick={() => open("observer")}
            className="flex items-center gap-2 h-10 pl-3 pr-4 rounded-full bg-card shadow-float text-[14px] font-semibold max-w-[240px] hover:bg-card-2"
        >
            <MapPin size={18} weight="fill" className={observer ? "text-accent" : "text-orange"} />
            <span className="truncate">{observer ? observer.label : t("observer.set")}</span>
        </button>
    );
}

export default function DesktopShell() {
    const t = useT();
    const selected = useSelectedObject();
    const open = useUiStore((s) => s.openDialog);
    const view = useAppStore((s) => s.settings.view);
    const updateSettings = useAppStore((s) => s.updateSettings);
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
            {/* Top left: identity, search, filters */}
            <div className="fixed top-4 left-4 w-[min(760px,calc(100vw-470px))] min-w-[420px] flex flex-col gap-3" style={{ zIndex: "var(--z-hud)" }}>
                <div className="flex items-center gap-3">
                    <div className="h-12 pl-2 pr-4 flex items-center rounded-full bg-card shadow-float shrink-0">
                        <Wordmark />
                    </div>
                    <SearchBox ref={searchRef} className="w-[300px] shrink-0" />
                </div>
                <FilterChips />
                <DataStatus className="px-2 !text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]" />
                <AnimatePresence>
                    {!selected && (
                        <motion.div key="tonight" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                            transition={SPRING} className="w-[380px] max-h-[calc(100dvh-300px)] scroll rounded-[var(--r-card)] [scrollbar-width:none]">
                            <TonightCard />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Top right: location and app controls */}
            <div className="fixed top-4 right-4 flex items-center gap-2" style={{ zIndex: "var(--z-hud)" }}>
                <ObserverChip />
                <IconButton variant="float" label={view === "3d" ? t("settings.view2d") : t("settings.view3d")}
                    onClick={() => updateSettings({ view: view === "3d" ? "2d" : "3d" })}>
                    {view === "3d" ? <MapTrifold size={20} weight="bold" /> : <GlobeHemisphereEast size={20} weight="bold" />}
                </IconButton>
                <IconButton variant="float" label={t("settings.title")} onClick={() => open("settings")}><GearSix size={20} weight="bold" /></IconButton>
                <IconButton variant="float" label={t("about.title")} onClick={() => open("about")}><Info size={20} weight="bold" /></IconButton>
            </div>

            {/* Right: inspector card stack */}
            <AnimatePresence>
                {selected && (
                    <motion.aside
                        key="inspector"
                        aria-label={t("inspector.title")}
                        initial={{ x: PANEL_W + 32, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: PANEL_W + 32, opacity: 0 }}
                        transition={SPRING}
                        className="fixed right-4 top-[72px] bottom-6 scroll rounded-[24px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        style={{ width: PANEL_W, zIndex: "var(--z-hud)" }}
                    >
                        <div className="flex flex-col gap-3 pb-1">
                            <div className="bg-card rounded-[var(--r-card)] shadow-card p-4 sticky top-0 z-10">
                                <InspectorHeader obj={selected} />
                            </div>
                            <InspectorCards obj={selected} />
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Bottom: time pill, centred in the space the inspector leaves free */}
            <motion.div
                className="fixed bottom-6 w-[680px] max-w-[calc(100vw-2rem)] bg-card rounded-[24px] shadow-float px-4 pt-3 pb-2"
                style={{ zIndex: "var(--z-hud)", left: "50%" }}
                animate={{ x: selected ? `calc(-50% - ${(PANEL_W + 16) / 2}px)` : "-50%" }}
                transition={SPRING}
            >
                <div className="flex items-center justify-between gap-4">
                    <SimClock />
                    <TimeControls />
                </div>
                <div className="mt-1.5"><TimeScrubber /></div>
            </motion.div>

            {/* Map attribution, required by the tile provider */}
            <div className="fixed bottom-1.5 left-4 text-[10.5px] text-white/60 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] pointer-events-none"
                style={{ zIndex: "var(--z-hud)" }}>
                {t("about.mapCredit")}
            </div>
        </>
    );
}
