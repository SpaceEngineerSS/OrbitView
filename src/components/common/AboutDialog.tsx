"use client";

import { GithubLogo } from "@phosphor-icons/react";
import { useUiStore } from "@/store/uiStore";
import { useT } from "@/hooks/useLocale";
import { Dialog } from "@/components/ui/Dialog";
import { LogoMark } from "./Logo";

export const APP_VERSION = "4.0.0";

/** About, data sources and attribution. Reused in the phone's settings sheet. */
export function AboutBody() {
    const t = useT();
    return (
        <div className="text-[14px] leading-relaxed text-ink-2 space-y-4">
            <div className="flex items-center gap-3 text-ink">
                <LogoMark size={52} />
                <div>
                    <div className="text-[20px] font-semibold tracking-tight">OrbitView</div>
                    <div className="text-[13px] text-ink-2">{t("about.version", { v: APP_VERSION })}</div>
                </div>
            </div>
            <p>{t("about.what")}</p>
            <p>{t("about.accuracy")}</p>
            <div className="rounded-[16px] bg-card-2 px-4 py-3 space-y-1">
                <div className="text-[13px] font-semibold text-ink">{t("about.sources")}</div>
                <p>{t("about.srcTle")}</p>
                <p>{t("about.srcWeather")}</p>
                <p>{t("about.srcMap")}</p>
                <p>{t("about.srcSgp4")}</p>
            </div>
            <a className="inline-flex items-center gap-2 font-semibold text-accent" href="https://github.com/SpaceEngineerSS/OrbitView" target="_blank" rel="noreferrer">
                <GithubLogo size={18} weight="fill" /> SpaceEngineerSS/OrbitView
            </a>
            <p className="text-[12px] text-ink-3">{t("about.author")} · {t("about.mapCredit")}</p>
        </div>
    );
}

export default function AboutDialog() {
    const t = useT();
    const open = useUiStore((s) => s.dialog === "about");
    const close = useUiStore((s) => s.closeDialog);
    return (
        <Dialog open={open} onClose={close} title={t("about.title")} closeLabel={t("common.close")} width="sm">
            <AboutBody />
        </Dialog>
    );
}
