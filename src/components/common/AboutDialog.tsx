"use client";

import { useUiStore } from "@/store/uiStore";
import { useT } from "@/hooks/useLocale";
import { Dialog } from "@/components/ui/Dialog";
import { LogoMark } from "./Logo";

export const APP_VERSION = "4.0.0";

/** About, data sources and attribution. Also reused on the mobile Settings tab. */
export function AboutBody() {
    const t = useT();
    return (
        <div className="text-[12.5px] leading-relaxed text-dim space-y-3">
            <div className="flex items-center gap-3 text-ink">
                <LogoMark size={28} />
                <div>
                    <div className="text-[14px] font-semibold tracking-[0.12em]">ORBITVIEW</div>
                    <div className="num text-[11px] text-dim">v{APP_VERSION}</div>
                </div>
            </div>
            <p>{t("about.what")}</p>
            <p>{t("about.accuracy")}</p>
            <div>
                <h3 className="label mb-1">{t("about.sources")}</h3>
                <ul className="space-y-0.5">
                    <li>{t("about.srcTle")}</li>
                    <li>{t("about.srcWeather")}</li>
                    <li>{t("about.srcMap")}</li>
                    <li>{t("about.srcSgp4")}</li>
                </ul>
            </div>
            <p>
                {t("about.author")}{" "}
                <a className="text-accent hover:underline underline-offset-2" href="https://github.com/SpaceEngineerSS/OrbitView" target="_blank" rel="noreferrer">
                    github.com/SpaceEngineerSS/OrbitView
                </a>
            </p>
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
