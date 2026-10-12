"use client";

import { useState } from "react";
import { Copy, Check, Download, Link2 } from "lucide-react";
import type { SpaceObject } from "@/lib/space-objects";
import { buildEphemeris, ephemerisToCSV, ephemerisToJSON, downloadFile, safeFileName } from "@/lib/Exporter";
import { useT } from "@/hooks/useLocale";
import { useTimelineStore } from "@/store/timelineStore";
import { Section } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";

function useCopy() {
    const [copied, setCopied] = useState<string | null>(null);
    const copy = async (key: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
        } catch { /* clipboard blocked; nothing to do */ }
    };
    return { copied, copy };
}

export default function DataModule({ obj }: { obj: SpaceObject }) {
    const t = useT();
    const { copied, copy } = useCopy();
    const [span, setSpan] = useState(90);
    const [step, setStep] = useState(60);

    const exportAs = (kind: "csv" | "json") => {
        const start = useTimelineStore.getState().currentTime;
        const rows = buildEphemeris(obj, start, span, step);
        if (kind === "csv") downloadFile(ephemerisToCSV(obj, rows), safeFileName(obj, "csv", start), "text/csv;charset=utf-8");
        else downloadFile(ephemerisToJSON(obj, rows), safeFileName(obj, "json", start), "application/json");
    };

    const tleText = obj.tle ? `${obj.name}\n${obj.tle.line1}\n${obj.tle.line2}` : "";
    const icon = (k: string) => copied === k ? <Check size={13} strokeWidth={1.5} /> : <Copy size={13} strokeWidth={1.5} />;

    return (
        <>
            <Section title="TLE" aside={obj.group ? t(`group.${obj.group}`) : undefined}>
                <pre className="num text-[11px] leading-relaxed bg-bg border border-rule p-2 overflow-x-auto whitespace-pre select-all">{tleText || "—"}</pre>
                <div className="flex gap-2 mt-2">
                    <Button size="sm" icon={icon("tle")} onClick={() => copy("tle", tleText)} disabled={!tleText}>
                        {copied === "tle" ? t("data.copied") : t("data.copyTle")}
                    </Button>
                    <Button size="sm" icon={copied === "link" ? <Check size={13} strokeWidth={1.5} /> : <Link2 size={13} strokeWidth={1.5} />}
                        onClick={() => copy("link", `${location.origin}${location.pathname}?sat=${obj.id}`)}>
                        {copied === "link" ? t("data.copied") : t("data.copyLink")}
                    </Button>
                </div>
            </Section>

            <Section title={t("data.ephemeris")}>
                <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] text-dim">{t("data.span")}</span>
                        <Segmented label={t("data.span")} value={span} onChange={setSpan}
                            options={[{ value: 90, label: "90 min" }, { value: 360, label: "6 h" }, { value: 1440, label: "24 h" }]} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] text-dim">{t("data.step")}</span>
                        <Segmented label={t("data.step")} value={step} onChange={setStep}
                            options={[{ value: 10, label: "10 s" }, { value: 60, label: "60 s" }, { value: 300, label: "5 min" }]} />
                    </div>
                </div>
                <div className="flex gap-2 mt-3">
                    <Button size="sm" icon={<Download size={13} strokeWidth={1.5} />} onClick={() => exportAs("csv")}>CSV</Button>
                    <Button size="sm" icon={<Download size={13} strokeWidth={1.5} />} onClick={() => exportAs("json")}>JSON</Button>
                </div>
                <p className="mt-2 text-[11.5px] text-dim">{t("data.ephemerisNote")}</p>
            </Section>
        </>
    );
}
