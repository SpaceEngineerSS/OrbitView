"use client";

import dynamic from "next/dynamic";
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
            <span className="num text-[12px] text-dim">{t("app.loadingGlobe")}</span>
        </div>
    );
}

export default function Home() {
    useAppBoot();
    const isMobile = useIsMobile();
    const mobileTab = useUiStore((s) => s.mobileTab);
    const compass = useUiStore((s) => s.compass);
    const setCompass = useUiStore((s) => s.setCompass);

    // On phones the catalog/settings tabs cover the globe completely.
    const globeHidden = isMobile === true && mobileTab !== "globe";

    return (
        <main className="fixed inset-0 bg-bg overflow-hidden">
            <div className="globe-region" style={{ zIndex: "var(--z-globe)" }}>
                <GlobeBoundary>
                    <Globe paused={globeHidden} compass={compass} onCompassExit={() => setCompass(false)} />
                </GlobeBoundary>
            </div>

            {isMobile === false && <DesktopShell />}
            {isMobile === true && <MobileShell />}

            <ObserverDialog />
            <SettingsDialog />
            <AboutDialog />
        </main>
    );
}
