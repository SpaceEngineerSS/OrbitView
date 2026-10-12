"use client";

import dynamic from "next/dynamic";
import { MotionConfig } from "motion/react";
import { useLowPower } from "@/store/perfStore";
import { usePassAlerts } from "@/hooks/usePassActions";
import { useAppBoot, useIsMobile } from "@/hooks/useAppBoot";
import { useUiStore } from "@/store/uiStore";
import { useT } from "@/hooks/useLocale";
import DesktopShell from "@/components/desktop/DesktopShell";
import MobileShell from "@/components/mobile/MobileShell";
import ObserverDialog from "@/components/common/ObserverDialog";
import SettingsDialog from "@/components/common/SettingsDialog";
import AboutDialog from "@/components/common/AboutDialog";
import GlobeBoundary from "@/components/common/ErrorBoundary";

// Cesium touches `window` at import time, so the globe is client-only.
const Globe = dynamic(() => import("@/components/globe/Globe"), {
    ssr: false,
    loading: () => <GlobePlaceholder />,
});

function GlobePlaceholder() {
    const t = useT();
    return (
        <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[14px] font-medium text-white/70">{t("app.loadingGlobe")}</span>
        </div>
    );
}

/** Pass notifications run for the whole session, whatever is on screen. */
function PassAlerts() {
    usePassAlerts();
    return null;
}

export default function Home() {
    useAppBoot();
    const isMobile = useIsMobile();
    const compass = useUiStore((s) => s.compass);
    const setCompass = useUiStore((s) => s.setCompass);
    const lowPower = useLowPower();

    return (
        <MotionConfig reducedMotion={lowPower ? "always" : "user"}>
        <main className="fixed inset-0 overflow-hidden bg-[#020306]">
            <div className="globe-region" style={{ zIndex: "var(--z-globe)" }}>
                <GlobeBoundary>
                    <Globe compass={compass} onCompassExit={() => setCompass(false)} />
                </GlobeBoundary>
            </div>

            {isMobile === false && <DesktopShell />}
            {isMobile === true && <MobileShell />}

            <PassAlerts />
            <ObserverDialog />
            {isMobile === false && <SettingsDialog />}
            {isMobile === false && <AboutDialog />}
        </main>
        </MotionConfig>
    );
}
