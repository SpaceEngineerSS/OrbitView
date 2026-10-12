"use client";

import { useEffect, useRef, useState } from "react";
import { Compass, GearSix } from "@phosphor-icons/react";
import { useAppStore, useSelectedObject } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";
import { useT } from "@/hooks/useLocale";
import { SensorManager } from "@/lib/SensorManager";
import { SearchBox } from "@/components/common/SearchBox";
import { SimClock, TimeControls, TimeScrubber } from "@/components/common/TimeControls";
import { FilterChips, FeaturedList, DataStatus } from "@/components/common/Catalog";
import { SettingsBody } from "@/components/common/SettingsDialog";
import { AboutBody } from "@/components/common/AboutDialog";
import { InspectorHeader, InspectorCards } from "@/components/analysis/Inspector";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/Button";
import { BottomSheet, type BottomSheetHandle } from "./BottomSheet";

const TOP_GAP = 64; // the full sheet stops below the floating top controls

function useViewportHeight() {
    const [h, setH] = useState(700);
    useEffect(() => {
        const read = () => setH(Math.round(window.visualViewport?.height ?? window.innerHeight));
        read();
        window.visualViewport?.addEventListener("resize", read);
        window.addEventListener("resize", read);
        return () => {
            window.visualViewport?.removeEventListener("resize", read);
            window.removeEventListener("resize", read);
        };
    }, []);
    return h;
}

function TimeDialog() {
    const t = useT();
    const open = useUiStore((s) => s.dialog === "time");
    const close = useUiStore((s) => s.closeDialog);
    return (
        <Dialog open={open} onClose={close} title={t("time.title")} closeLabel={t("common.close")}>
            <SimClock className="mb-4" />
            <TimeControls compact />
            <div className="mt-4"><TimeScrubber /></div>
        </Dialog>
    );
}

function SettingsSheet() {
    const t = useT();
    const open = useUiStore((s) => s.dialog === "settings");
    const close = useUiStore((s) => s.closeDialog);
    return (
        <Dialog open={open} onClose={close} title={t("settings.title")} closeLabel={t("common.close")}>
            <SettingsBody />
            <div className="mt-6"><AboutBody /></div>
        </Dialog>
    );
}

export default function MobileShell() {
    const t = useT();
    const selected = useSelectedObject();
    const observer = useAppStore((s) => s.observer);
    const openDialog = useUiStore((s) => s.openDialog);
    const compass = useUiStore((s) => s.compass);
    const setCompass = useUiStore((s) => s.setCompass);
    const vh = useViewportHeight();
    const sheet = useRef<BottomSheetHandle>(null);
    const [compassError, setCompassError] = useState<string | null>(null);

    // A new selection shows its summary; clearing it goes back to browsing.
    useEffect(() => { sheet.current?.snapTo(selected ? "half" : "peek"); }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleCompass = async () => {
        if (compass) { setCompass(false); return; }
        if (!observer) { openDialog("observer"); return; }
        const ok = await SensorManager.getInstance().requestPermission();
        if (ok) { setCompassError(null); setCompass(true); }
        else setCompassError(t("compassMode.denied"));
    };

    const available = Math.max(300, vh - TOP_GAP - 0);

    return (
        <>
            {/* Floating top controls */}
            <div className="fixed inset-x-3 flex items-center gap-2" style={{ top: "calc(var(--safe-top) + 10px)", zIndex: "var(--z-hud)" }}>
                <button type="button" onClick={() => openDialog("time")} aria-label={t("time.title")}
                    className="h-11 pl-4 pr-2 rounded-full bg-card shadow-float flex items-center">
                    <SimClock compact />
                </button>
                <div className="flex-1" />
                <IconButton variant="float" label={compass ? t("compassMode.exit") : t("compassMode.enter")} active={compass} onClick={toggleCompass}>
                    <Compass size={20} weight="bold" />
                </IconButton>
                <IconButton variant="float" label={t("settings.title")} onClick={() => openDialog("settings")}>
                    <GearSix size={20} weight="bold" />
                </IconButton>
            </div>

            {compassError && (
                <div role="alert" onClick={() => setCompassError(null)}
                    className="fixed inset-x-3 rounded-[16px] bg-card shadow-float px-4 py-3 text-[14px] text-orange"
                    style={{ top: "calc(var(--safe-top) + 64px)", zIndex: "var(--z-overlay)" }}>
                    {compassError}
                </div>
            )}

            {!compass && (
                <div className="fixed inset-x-0 bottom-0 pointer-events-none" style={{ height: available, zIndex: "var(--z-sheet)" }}>
                    <div className="relative h-full pointer-events-none [&>*]:pointer-events-auto">
                        <BottomSheet
                            ref={sheet}
                            available={available}
                            peek={selected ? 132 : 150}
                            label={selected ? selected.name : t("search.label")}
                            expandLabel={t("sheet.expand")}
                            collapseLabel={t("sheet.collapse")}
                            header={selected
                                ? <div className="pb-3"><InspectorHeader obj={selected} /></div>
                                : (
                                    <div className="pb-2">
                                        <SearchBox inline onFocusChange={(f) => { if (f) sheet.current?.snapTo("full"); }}
                                            onPicked={() => sheet.current?.snapTo("half")} />
                                        <FilterChips className="mt-2.5" />
                                    </div>
                                )}
                        >
                            {selected ? (
                                <div className="pt-1"><InspectorCards obj={selected} /></div>
                            ) : (
                                <div className="pt-3 space-y-5">
                                    <FeaturedList onPicked={() => sheet.current?.snapTo("half")} />
                                    <div className="space-y-1">
                                        <DataStatus className="block" />
                                        <p className="text-[11px] text-ink-3">{t("about.mapCredit")}</p>
                                    </div>
                                </div>
                            )}
                        </BottomSheet>
                    </div>
                </div>
            )}

            <TimeDialog />
            <SettingsSheet />
        </>
    );
}
